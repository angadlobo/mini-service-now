import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { InboundMessage, OutboundMessage, ChatSession } from './types';
import { getFlow } from './form-flows';
import { handleLink } from './link-handler';
import { handleStatus } from './status-handler';
import {
  formatHelp,
  formatQuestion,
  formatSummary,
  formatCatalogSummary,
  formatCatalogItemList,
  formatTicketCreated,
  formatCancelled,
  formatSessionExpired,
  formatNotLinked,
  formatError,
} from './formatters';

// Service imports for ticket creation
import { incidentService } from '../../modules/incidents/service';
import { changeService } from '../../modules/changes/service';
import { problemService } from '../../modules/problems/service';
import { catalogService } from '../../modules/catalog/service';

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Central entry point for all inbound chat messages.
 * Implements the conversational state machine.
 */
export async function handleMessage(msg: InboundMessage): Promise<OutboundMessage> {
  const text = msg.text.trim();

  try {
    // ── Slash commands ──
    if (text.toLowerCase() === '/cancel') {
      return handleCancel(msg);
    }

    if (text.toLowerCase() === '/help') {
      return { text: formatHelp() };
    }

    if (text.toLowerCase().startsWith('/link')) {
      const args = text.substring(5);
      return handleLink(msg, args);
    }

    if (text.toLowerCase().startsWith('/status')) {
      const args = text.substring(7).trim();
      return handleStatus(args);
    }

    const commandMatch = text.match(/^\/(incident|change|problem|request)$/i);
    if (commandMatch) {
      const command = commandMatch[1].toLowerCase();
      return startFlow(msg, command);
    }

    // ── Continue active session ──
    return continueSession(msg, text);
  } catch (err) {
    logger.error('Conversation engine error', err);
    return { text: formatError('Something went wrong. Please try again.') };
  }
}

/**
 * Look up the linked user for a platform user. Returns user_id or null.
 */
async function getLinkedUserId(platform: string, platformUserId: string): Promise<string | null> {
  const link = await db('chat_user_links')
    .where({ platform, platform_user_id: platformUserId, active: true })
    .first();
  return link?.user_id || null;
}

/**
 * Cancel any active session.
 */
async function handleCancel(msg: InboundMessage): Promise<OutboundMessage> {
  await db('chat_sessions')
    .where({ platform: msg.platform, platform_user_id: msg.platformUserId })
    .del();
  return { text: formatCancelled() };
}

/**
 * Start a new form flow (incident, change, problem, request).
 */
async function startFlow(msg: InboundMessage, command: string): Promise<OutboundMessage> {
  const userId = await getLinkedUserId(msg.platform, msg.platformUserId);
  if (!userId) {
    return { text: formatNotLinked() };
  }

  // Delete any existing session for this user
  await db('chat_sessions')
    .where({ platform: msg.platform, platform_user_id: msg.platformUserId })
    .del();

  // Handle catalog request separately
  if (command === 'request') {
    return startCatalogFlow(msg, userId);
  }

  const flow = getFlow(command);
  if (!flow) {
    return { text: formatError(`Unknown command: ${command}`) };
  }

  // Create session
  await db('chat_sessions').insert({
    platform: msg.platform,
    platform_user_id: msg.platformUserId,
    platform_chat_id: msg.platformChatId,
    user_id: userId,
    command,
    current_step: 0,
    form_data: JSON.stringify({}),
    expires_at: new Date(Date.now() + SESSION_TTL_MS),
  });

  const firstStep = flow.steps[0];
  return { text: formatQuestion(flow, 0, firstStep) };
}

/**
 * Start catalog request flow: list items for user to pick.
 */
async function startCatalogFlow(msg: InboundMessage, userId: string): Promise<OutboundMessage> {
  const items = await catalogService.listItems();
  if (!items || items.length === 0) {
    return { text: formatError('No catalog items are currently available.') };
  }

  // Store available items in form_data for later reference
  const itemList = items.map((item: any) => ({ id: item.id, name: item.name, description: item.short_description || item.description }));

  await db('chat_sessions').insert({
    platform: msg.platform,
    platform_user_id: msg.platformUserId,
    platform_chat_id: msg.platformChatId,
    user_id: userId,
    command: 'request',
    current_step: 0,
    form_data: JSON.stringify({ _catalog_items: itemList, _variables: {}, _variable_steps: [] }),
    expires_at: new Date(Date.now() + SESSION_TTL_MS),
  });

  return { text: formatCatalogItemList(itemList) };
}

/**
 * Continue an active session with the user's text input.
 */
async function continueSession(msg: InboundMessage, text: string): Promise<OutboundMessage> {
  // Use FOR UPDATE to prevent race conditions
  const session = await db('chat_sessions')
    .where({ platform: msg.platform, platform_user_id: msg.platformUserId })
    .first() as ChatSession | undefined;

  if (!session) {
    return { text: 'No active session. Type /help for available commands.' };
  }

  // Check expiry
  if (new Date(session.expires_at) < new Date()) {
    await db('chat_sessions').where('id', session.id).del();
    return { text: formatSessionExpired() };
  }

  const formData = typeof session.form_data === 'string'
    ? JSON.parse(session.form_data)
    : session.form_data;

  // Catalog request has dynamic flow
  if (session.command === 'request') {
    return continueCatalogSession(session, formData, text);
  }

  const flow = getFlow(session.command);
  if (!flow) {
    await db('chat_sessions').where('id', session.id).del();
    return { text: formatError('Invalid session. Please start over.') };
  }

  const stepIndex = session.current_step;
  const isConfirmStep = stepIndex >= flow.steps.length;

  // ── Confirmation step ──
  if (isConfirmStep) {
    return handleConfirmation(session, flow, formData, text);
  }

  // ── Normal form step ──
  const step = flow.steps[stepIndex];
  return handleFormStep(session, flow, formData, step, stepIndex, text);
}

/**
 * Process a form step answer and advance.
 */
async function handleFormStep(
  session: ChatSession,
  flow: any,
  formData: Record<string, unknown>,
  step: any,
  stepIndex: number,
  text: string,
): Promise<OutboundMessage> {
  // Handle skip
  if (text.toLowerCase() === 'skip' && step.skippable) {
    // Don't store, advance
  } else if (step.type === 'select' && step.options) {
    // Accept either the option number or the value directly
    const num = parseInt(text, 10);
    const option = (num >= 1 && num <= step.options.length)
      ? step.options[num - 1]
      : step.options.find((o: any) => o.value.toLowerCase() === text.toLowerCase());

    if (!option) {
      const validOptions = step.options.map((o: any, i: number) => `${i + 1} = ${o.label}`).join(', ');
      return { text: `Invalid selection. Choose: ${validOptions}` };
    }
    formData[step.field] = option.value;
  } else if (step.required && !text.trim()) {
    return { text: `This field is required. ${step.prompt}` };
  } else {
    formData[step.field] = text;
  }

  const nextStep = stepIndex + 1;

  // If we've reached the confirmation step
  if (nextStep >= flow.steps.length) {
    await db('chat_sessions').where('id', session.id).update({
      current_step: nextStep,
      form_data: JSON.stringify(formData),
      updated_at: new Date(),
    });
    return { text: formatSummary(flow, formData) };
  }

  // Advance to next form step
  await db('chat_sessions').where('id', session.id).update({
    current_step: nextStep,
    form_data: JSON.stringify(formData),
    updated_at: new Date(),
  });

  return { text: formatQuestion(flow, nextStep, flow.steps[nextStep]) };
}

/**
 * Handle yes/cancel on the confirmation step.
 */
async function handleConfirmation(
  session: ChatSession,
  flow: any,
  formData: Record<string, unknown>,
  text: string,
): Promise<OutboundMessage> {
  if (text.toLowerCase() === 'cancel' || text.toLowerCase() === 'no') {
    await db('chat_sessions').where('id', session.id).del();
    return { text: formatCancelled() };
  }

  if (text.toLowerCase() !== 'yes') {
    return { text: 'Type "yes" to submit or "cancel" to abort.' };
  }

  try {
    const record = await createTicket(session.command, formData, session.user_id);
    await db('chat_sessions').where('id', session.id).del();
    return {
      text: formatTicketCreated(
        session.command,
        record.number,
        record.short_description || String(formData.short_description || ''),
      ),
    };
  } catch (err: any) {
    logger.error('Ticket creation failed', err);
    await db('chat_sessions').where('id', session.id).del();
    return { text: formatError(`Failed to create ticket: ${err.message || 'Unknown error'}`) };
  }
}

/**
 * Continue catalog request session (dynamic steps).
 */
async function continueCatalogSession(
  session: ChatSession,
  formData: Record<string, unknown>,
  text: string,
): Promise<OutboundMessage> {
  const catalogItems = formData._catalog_items as Array<{ id: string; name: string }>;
  const selectedItemId = formData._selected_item_id as string | undefined;
  const variableSteps = formData._variable_steps as Array<{ name: string; label: string; type: string }>;
  const variables = formData._variables as Record<string, unknown>;

  // Step 0: User picks a catalog item by number
  if (!selectedItemId) {
    const num = parseInt(text, 10);
    if (isNaN(num) || num < 1 || num > catalogItems.length) {
      return { text: `Please enter a number between 1 and ${catalogItems.length}.` };
    }

    const chosen = catalogItems[num - 1];
    const item = await catalogService.getItem(chosen.id);
    if (!item) {
      return { text: formatError('Catalog item not found. Please try again.') };
    }

    const vars = item.variables || [];
    formData._selected_item_id = chosen.id;
    formData._selected_item_name = chosen.name;
    formData._variable_steps = vars.map((v: any) => ({
      name: v.name,
      label: v.label || v.name,
      type: v.type || 'text',
    }));
    formData._current_var_step = 0;

    await db('chat_sessions').where('id', session.id).update({
      form_data: JSON.stringify(formData),
      updated_at: new Date(),
    });

    // If no variables, go straight to confirmation
    if (vars.length === 0) {
      return { text: formatCatalogSummary(chosen.name, {}) };
    }

    const firstVar = vars[0];
    return { text: `[Catalog Request] Step 1 of ${vars.length + 1}\n\n${firstVar.label || firstVar.name}:` };
  }

  // Variable collection steps
  const currentVarStep = (formData._current_var_step as number) || 0;
  const isConfirm = currentVarStep >= variableSteps.length;

  if (isConfirm) {
    // Confirmation
    if (text.toLowerCase() === 'cancel' || text.toLowerCase() === 'no') {
      await db('chat_sessions').where('id', session.id).del();
      return { text: formatCancelled() };
    }
    if (text.toLowerCase() !== 'yes') {
      return { text: 'Type "yes" to submit or "cancel" to abort.' };
    }

    try {
      const record = await catalogService.createRequest(
        selectedItemId!,
        variables,
        session.user_id,
      );
      await db('chat_sessions').where('id', session.id).del();
      return {
        text: formatTicketCreated(
          'request',
          record.number,
          formData._selected_item_name as string,
        ),
      };
    } catch (err: any) {
      logger.error('Catalog request creation failed', err);
      await db('chat_sessions').where('id', session.id).del();
      return { text: formatError(`Failed to create request: ${err.message || 'Unknown error'}`) };
    }
  }

  // Store current variable answer
  const currentVar = variableSteps[currentVarStep];
  if (text.toLowerCase() !== 'skip') {
    variables[currentVar.name] = text;
  }
  formData._variables = variables;

  const nextVarStep = currentVarStep + 1;
  formData._current_var_step = nextVarStep;

  await db('chat_sessions').where('id', session.id).update({
    form_data: JSON.stringify(formData),
    updated_at: new Date(),
  });

  // If all variables collected, show confirmation
  if (nextVarStep >= variableSteps.length) {
    return { text: formatCatalogSummary(formData._selected_item_name as string, variables) };
  }

  const nextVar = variableSteps[nextVarStep];
  const totalSteps = variableSteps.length + 1;
  return { text: `[Catalog Request] Step ${nextVarStep + 1} of ${totalSteps}\n\n${nextVar.label || nextVar.name}:` };
}

/**
 * Create a ticket via the appropriate service.
 */
async function createTicket(
  command: string,
  formData: Record<string, unknown>,
  userId: string,
): Promise<any> {
  switch (command) {
    case 'incident':
      return incidentService.create({
        short_description: formData.short_description,
        description: formData.description,
        urgency: Number(formData.urgency) || 3,
        impact: Number(formData.impact) || 3,
      }, userId);

    case 'change':
      return changeService.create({
        short_description: formData.short_description,
        description: formData.description,
        type: formData.type || 'normal',
        risk: formData.risk || 'moderate',
        impact: formData.impact || 'moderate',
        backout_plan: formData.backout_plan,
      }, userId);

    case 'problem':
      return problemService.create({
        short_description: formData.short_description,
        description: formData.description,
        priority: Number(formData.priority) || 4,
      }, userId);

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}
