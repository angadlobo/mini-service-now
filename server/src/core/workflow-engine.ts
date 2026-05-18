import { db } from '../config/database';
import { logger } from '../config/logger';
import { eventBus, AppEvent } from './event-bus';
import { notify } from './notification-engine';
import { createApproval } from './approval-engine';
import { sendEmail } from './channels/email-channel';
import { sendSlackMessage } from './channels/slack-channel';

interface Condition {
  field: string;
  operator: string;
  value: unknown;
}

interface ConditionGroup {
  logic: 'AND' | 'OR';
  conditions: (Condition | ConditionGroup)[];
}

interface Action {
  type: string;
  config: Record<string, unknown>;
}

interface ExecutionContext {
  variables: Record<string, unknown>;
  executionId?: string;
  ruleId?: string;
  triggerType?: string;
  startTime?: number;
}

function evaluateCondition(record: Record<string, unknown>, condition: Condition): boolean {
  const fieldValue = record[condition.field];
  const targetValue = condition.value;

  switch (condition.operator) {
    case 'equals': return String(fieldValue) === String(targetValue);
    case 'not_equals': return String(fieldValue) !== String(targetValue);
    case 'greater_than': return Number(fieldValue) > Number(targetValue);
    case 'less_than': return Number(fieldValue) < Number(targetValue);
    case 'contains': return String(fieldValue).toLowerCase().includes(String(targetValue).toLowerCase());
    case 'in': return Array.isArray(targetValue) && targetValue.includes(fieldValue);
    case 'is_empty': return !fieldValue || fieldValue === '';
    case 'is_not_empty': return !!fieldValue && fieldValue !== '';
    case 'regex': return new RegExp(String(targetValue)).test(String(fieldValue));
    default: return false;
  }
}

function evaluateConditions(record: Record<string, unknown>, group: ConditionGroup): boolean {
  if (!group.conditions || group.conditions.length === 0) return true;

  const results = group.conditions.map((c) => {
    if ('logic' in c) return evaluateConditions(record, c as ConditionGroup);
    return evaluateCondition(record, c as Condition);
  });

  return group.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
}

/** Resolve template variables like {{record.field}} or {{context.var}} */
function resolveTemplate(template: string, record: Record<string, unknown>, ctx: ExecutionContext): string {
  return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_match, scope, field) => {
    if (scope === 'record') return String(record[field] ?? '');
    if (scope === 'context') return String(ctx.variables[field] ?? '');
    return '';
  });
}

/** Log an individual action execution */
async function logAction(
  executionId: string,
  actionIndex: number,
  actionType: string,
  status: 'success' | 'error' | 'skipped',
  durationMs: number,
  input?: unknown,
  output?: unknown,
  error?: string,
): Promise<void> {
  try {
    await db('workflow_action_logs').insert({
      execution_id: executionId,
      action_index: actionIndex,
      action_type: actionType,
      status,
      duration_ms: durationMs,
      input: input ? JSON.stringify(input) : null,
      output: output ? JSON.stringify(output) : null,
      error: error || null,
    });
  } catch (err) {
    logger.error('Failed to log workflow action', err);
  }
}

/**
 * Execute a single action. Returns 'done' | 'waiting'.
 */
async function executeAction(
  tableName: string,
  recordId: string,
  record: Record<string, unknown>,
  action: Action,
  userId: string,
  ctx: ExecutionContext,
  actionIndex: number,
): Promise<'done' | 'waiting'> {
  const actionStart = Date.now();
  const executionId = ctx.executionId;
  const ruleId = ctx.ruleId;

  try {
    const result = await executeActionInner(tableName, recordId, record, action, userId, ctx, actionIndex);

    if (executionId) {
      await logAction(executionId, actionIndex, action.type, 'success', Date.now() - actionStart, action.config);
    }

    return result;
  } catch (err: any) {
    if (executionId) {
      await logAction(executionId, actionIndex, action.type, 'error', Date.now() - actionStart, action.config, undefined, err.message);
    }
    throw err;
  }
}

async function executeActionInner(
  tableName: string,
  recordId: string,
  record: Record<string, unknown>,
  action: Action,
  userId: string,
  ctx: ExecutionContext,
  actionIndex: number,
): Promise<'done' | 'waiting'> {
  const executionId = ctx.executionId;
  const ruleId = ctx.ruleId;

  switch (action.type) {
    case 'set_field':
      await db(tableName).where('id', recordId).update({
        [action.config.field as string]: action.config.value,
        updated_at: new Date(),
      });
      return 'done';

    case 'change_state':
      await db(tableName).where('id', recordId).update({
        state: action.config.state,
        updated_at: new Date(),
      });
      return 'done';

    case 'assign_to':
      await db(tableName).where('id', recordId).update({
        assigned_to: action.config.user_id,
        updated_at: new Date(),
      });
      return 'done';

    case 'assign_to_group':
      await db(tableName).where('id', recordId).update({
        assignment_group_id: action.config.group_id,
        updated_at: new Date(),
      });
      return 'done';

    case 'send_notification':
      if (record.assigned_to) {
        await notify(
          record.assigned_to as string,
          action.config.title as string || 'Workflow Notification',
          action.config.body as string || `Workflow triggered on ${record.number || recordId}`,
          action.config.link as string,
        );
      }
      return 'done';

    case 'create_journal_entry':
      await db('sys_journal').insert({
        table_name: tableName,
        record_id: recordId,
        type: action.config.journal_type || 'work_note',
        body: action.config.body || 'Auto-generated by workflow',
        created_by: userId,
      });
      return 'done';

    case 'launch_form': {
      if (!executionId || !ruleId) {
        logger.warn('launch_form action requires executionId and ruleId');
        return 'done';
      }

      const assignToField = (action.config.assign_to_field as string) || 'assigned_to';
      const assignedTo = record[assignToField] as string;
      if (!assignedTo) {
        logger.warn(`launch_form: field "${assignToField}" is empty on record ${recordId}`);
        return 'done';
      }

      await db('workflow_form_tasks').insert({
        workflow_rule_id: ruleId,
        execution_id: executionId,
        form_template_id: action.config.form_template_id,
        table_name: tableName,
        record_id: recordId,
        assigned_to: assignedTo,
        state: 'pending',
      });

      await db('workflow_executions').where('id', executionId).update({
        status: 'waiting_for_form',
      });

      await notify(
        assignedTo,
        'Form Task Assigned',
        `A workflow form task has been assigned to you for record ${record.number || recordId}`,
      );

      return 'waiting';
    }

    case 'delay': {
      if (!executionId) {
        logger.warn('delay action requires executionId');
        return 'done';
      }

      const durationMinutes = Number(action.config.duration_minutes) || 5;
      const resumeAt = new Date(Date.now() + durationMinutes * 60 * 1000);

      await db('workflow_executions').where('id', executionId).update({
        status: 'delayed',
        resume_at: resumeAt,
      });

      return 'waiting';
    }

    case 'call_workflow': {
      const targetWorkflowId = action.config.target_workflow_id as string;
      if (!targetWorkflowId) {
        logger.warn('call_workflow: no target_workflow_id specified');
        return 'done';
      }

      const targetRule = await db('workflow_rules').where('id', targetWorkflowId).first();
      if (!targetRule || !targetRule.active) {
        logger.warn(`call_workflow: target workflow ${targetWorkflowId} not found or inactive`);
        return 'done';
      }

      const syntheticEvent: AppEvent = {
        type: targetRule.trigger_event,
        tableName,
        recordId,
        data: record,
        userId,
      };

      await processWorkflowRule(targetRule, syntheticEvent);
      return 'done';
    }

    // ── New Action Types ──────────────────────────────────

    case 'create_approval': {
      const approverIds = (action.config.approver_ids as string[]) || [];
      if (approverIds.length === 0) {
        logger.warn('create_approval: no approver_ids specified');
        return 'done';
      }

      await createApproval(tableName, recordId, approverIds);

      // Notify approvers
      for (const approverId of approverIds) {
        await notify(
          approverId,
          'Approval Requested',
          `Your approval is requested for ${record.number || recordId}`,
          `/approvals`,
        );
      }

      if (action.config.wait_for_completion && executionId) {
        await db('workflow_executions').where('id', executionId).update({
          status: 'waiting_for_approval',
        });
        return 'waiting';
      }

      return 'done';
    }

    case 'create_task': {
      const taskTableName = (action.config.table_name as string) || tableName;
      const fields = (action.config.fields as Record<string, unknown>) || {};
      const resolvedFields: Record<string, unknown> = {};

      for (const [key, val] of Object.entries(fields)) {
        if (typeof val === 'string' && val.startsWith('{{') && val.endsWith('}}')) {
          resolvedFields[key] = resolveTemplate(val, record, ctx);
        } else {
          resolvedFields[key] = val;
        }
      }

      // Set parent reference if possible
      resolvedFields.parent_table = tableName;
      resolvedFields.parent_id = recordId;

      await db(taskTableName).insert(resolvedFields);
      return 'done';
    }

    case 'http_request': {
      const url = resolveTemplate(action.config.url as string || '', record, ctx);
      const method = (action.config.method as string || 'GET').toUpperCase();
      const headers: Record<string, string> = {};
      const configHeaders = (action.config.headers as Record<string, string>) || {};

      for (const [key, val] of Object.entries(configHeaders)) {
        headers[key] = resolveTemplate(val, record, ctx);
      }

      // Auth handling
      const auth = action.config.auth as Record<string, string> | undefined;
      if (auth) {
        if (auth.type === 'bearer') {
          headers['Authorization'] = `Bearer ${auth.token}`;
        } else if (auth.type === 'basic') {
          headers['Authorization'] = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`;
        } else if (auth.type === 'api_key') {
          headers[auth.header_name || 'X-API-Key'] = auth.api_key || '';
        }
      }

      let body: string | undefined;
      if (action.config.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        body = typeof action.config.body === 'string'
          ? resolveTemplate(action.config.body, record, ctx)
          : JSON.stringify(action.config.body);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      }

      const timeout = Number(action.config.timeout) || 30000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        });
        clearTimeout(timer);

        const responseText = await response.text();
        let responseData: unknown;
        try { responseData = JSON.parse(responseText); } catch { responseData = responseText; }

        // Store response in context
        const storeKey = (action.config.store_response_in as string) || 'http_response';
        ctx.variables[storeKey] = responseData;
        ctx.variables[`${storeKey}_status`] = response.status;

        if (!response.ok) {
          logger.warn(`http_request: ${method} ${url} returned ${response.status}`);
        }
      } catch (err: any) {
        clearTimeout(timer);
        logger.error(`http_request failed: ${err.message}`);
        throw err;
      }

      return 'done';
    }

    case 'send_email': {
      const toRaw = action.config.to as string || '';
      const to = toRaw.startsWith('{{')
        ? resolveTemplate(toRaw, record, ctx)
        : toRaw;
      const subject = resolveTemplate(action.config.subject as string || '', record, ctx);
      const bodyTemplate = resolveTemplate(action.config.body_template as string || '', record, ctx);

      if (to) {
        await sendEmail(to, subject, bodyTemplate);
      }
      return 'done';
    }

    case 'send_slack': {
      const messageTemplate = action.config.message_template as string || '';
      const message = resolveTemplate(messageTemplate, record, ctx);
      await sendSlackMessage(message);
      return 'done';
    }

    case 'run_script': {
      const expression = action.config.expression as string || '';
      const variables = (action.config.variables as Record<string, unknown>) || {};

      // Simple expression evaluator using Function constructor (sandboxed context)
      try {
        const fn = new Function('record', 'context', 'variables', `"use strict"; ${expression}`);
        const result = fn(record, ctx.variables, variables);
        ctx.variables['script_result'] = result;
      } catch (err: any) {
        logger.error(`run_script failed: ${err.message}`);
        throw err;
      }
      return 'done';
    }

    case 'escalate': {
      const escalationType = action.config.escalation_type as string || 'group';
      const target = action.config.target as string || '';
      const reason = resolveTemplate(action.config.reason as string || 'Escalated by workflow', record, ctx);

      if (escalationType === 'user' && target) {
        await db(tableName).where('id', recordId).update({
          assigned_to: target,
          updated_at: new Date(),
        });
        await notify(target, 'Escalation', reason);
      } else if (escalationType === 'group' && target) {
        await db(tableName).where('id', recordId).update({
          assignment_group_id: target,
          updated_at: new Date(),
        });
      } else if (escalationType === 'manager') {
        // Look up the current assignee's manager
        const currentAssignee = record.assigned_to as string;
        if (currentAssignee) {
          const user = await db('users').where('id', currentAssignee).first();
          const managerId = user?.manager_id;
          if (managerId) {
            await db(tableName).where('id', recordId).update({
              assigned_to: managerId,
              updated_at: new Date(),
            });
            await notify(managerId, 'Escalation', reason);
          }
        }
      }

      await db('sys_journal').insert({
        table_name: tableName,
        record_id: recordId,
        type: 'work_note',
        body: `Escalated: ${reason}`,
        created_by: userId,
      });

      return 'done';
    }

    case 'if_else': {
      const condition = action.config.condition as ConditionGroup;
      const thenActions = (action.config.then_actions as Action[]) || [];
      const elseActions = (action.config.else_actions as Action[]) || [];

      // Re-fetch record for fresh data
      let freshRecord = record;
      try {
        freshRecord = await db(tableName).where('id', recordId).first() || record;
      } catch { /* use existing */ }

      const conditionResult = condition ? evaluateConditions(freshRecord, condition) : true;
      const branchActions = conditionResult ? thenActions : elseActions;

      for (let i = 0; i < branchActions.length; i++) {
        const result = await executeAction(
          tableName, recordId, freshRecord, branchActions[i], userId, ctx, actionIndex,
        );
        if (result === 'waiting') return 'waiting';
      }

      return 'done';
    }

    case 'switch': {
      const switchField = action.config.field as string || '';
      const cases = (action.config.cases as Record<string, Action[]>) || {};
      const defaultActions = (action.config.default_actions as Action[]) || [];

      const fieldValue = String(record[switchField] ?? '');
      const matchedActions = cases[fieldValue] || defaultActions;

      for (let i = 0; i < matchedActions.length; i++) {
        const result = await executeAction(
          tableName, recordId, record, matchedActions[i], userId, ctx, actionIndex,
        );
        if (result === 'waiting') return 'waiting';
      }

      return 'done';
    }

    case 'parallel': {
      const branches = (action.config.branches as Action[][]) || [];
      await Promise.all(
        branches.map(async (branchActions) => {
          for (let i = 0; i < branchActions.length; i++) {
            await executeAction(
              tableName, recordId, record, branchActions[i], userId, ctx, actionIndex,
            );
          }
        }),
      );
      return 'done';
    }

    case 'update_record': {
      const targetTable = (action.config.table_name as string) || tableName;
      const recordIdField = action.config.record_id_field as string;
      const targetRecordId = recordIdField ? (record[recordIdField] as string) : recordId;
      const updates = (action.config.updates as Record<string, unknown>) || {};

      const resolvedUpdates: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(updates)) {
        resolvedUpdates[key] = typeof val === 'string' ? resolveTemplate(val, record, ctx) : val;
      }
      resolvedUpdates.updated_at = new Date();

      await db(targetTable).where('id', targetRecordId).update(resolvedUpdates);
      return 'done';
    }

    case 'log_message': {
      const level = (action.config.level as string) || 'info';
      const message = resolveTemplate(action.config.message as string || '', record, ctx);

      if (level === 'error') logger.error(`[Workflow Log] ${message}`);
      else if (level === 'warn') logger.warn(`[Workflow Log] ${message}`);
      else logger.info(`[Workflow Log] ${message}`);

      return 'done';
    }

    default: {
      // Check provider registry for integration actions
      const { providerRegistry } = await import('../integrations/provider-registry');
      const match = providerRegistry.findByActionType(action.type);
      if (match) {
        // Find active integration for this provider
        const integration = await db('integrations')
          .where({ provider: match.provider.name, active: true })
          .whereNotNull('provider')
          .first();

        if (!integration) {
          logger.warn(`No active integration found for provider "${match.provider.name}" (action: ${action.type})`);
          return 'done';
        }

        // Parse provider_config and oauth_tokens if stored as strings
        const integrationRecord = {
          ...integration,
          provider_config: typeof integration.provider_config === 'string'
            ? JSON.parse(integration.provider_config)
            : integration.provider_config || {},
          oauth_tokens: integration.oauth_tokens
            ? (typeof integration.oauth_tokens === 'string' ? JSON.parse(integration.oauth_tokens) : integration.oauth_tokens)
            : null,
        };

        const result = await match.provider.executeAction(
          action.type, integrationRecord, action.config, record, ctx.variables,
        );

        if (result) {
          // Insert integration_links row
          await db('integration_links').insert({
            integration_id: integration.id,
            table_name: tableName,
            record_id: recordId,
            provider: match.provider.name,
            external_type: result.externalType,
            external_id: result.externalId,
            external_url: result.externalUrl || null,
            external_key: result.externalKey || null,
            title: result.title || null,
            status: result.status || null,
            metadata: JSON.stringify(result.metadata || {}),
            direction: 'outbound',
          }).onConflict(['integration_id', 'external_type', 'external_id']).merge({
            title: result.title || null,
            status: result.status || null,
            metadata: JSON.stringify(result.metadata || {}),
            updated_at: new Date(),
          });

          // Store result in context variables
          ctx.variables[`${action.type}_result`] = result;
        }

        // Log to integration_logs
        await db('integration_logs').insert({
          integration_id: integration.id,
          event: `action.${action.type}`,
          status: 'success',
          request_body: JSON.stringify(action.config),
          response_body: result ? JSON.stringify(result) : '',
          status_code: 200,
        }).catch(() => {});

        return 'done';
      }

      logger.warn(`Unknown workflow action type: ${action.type}`);
      return 'done';
    }
  }
}

async function processWorkflowRule(rule: any, event: AppEvent, triggerType?: string): Promise<void> {
  const conditions = rule.conditions as ConditionGroup;
  const match = evaluateConditions(event.data, conditions);

  if (!match) return;

  const actions = rule.actions as Action[];
  let status = 'success';
  let error: string | null = null;
  const startTime = Date.now();

  // Create execution record first so we have its ID
  const [execution] = await db('workflow_executions').insert({
    rule_id: rule.id,
    table_name: event.tableName,
    record_id: event.recordId,
    status: 'running',
    trigger_type: triggerType || event.type,
    context: JSON.stringify({}),
  }).returning('*');

  const ctx: ExecutionContext = {
    variables: {},
    executionId: execution.id,
    ruleId: rule.id,
    triggerType: triggerType || event.type,
    startTime,
  };

  const errorHandling = rule.error_handling as { strategy?: string; max_retries?: number; retry_delay_seconds?: number } | null;
  const strategy = errorHandling?.strategy || 'stop';

  try {
    for (let i = 0; i < actions.length; i++) {
      let retries = 0;
      const maxRetries = (actions[i].config?.max_retries as number) || errorHandling?.max_retries || 0;
      const retryDelay = (actions[i].config?.retry_delay_seconds as number) || errorHandling?.retry_delay_seconds || 5;

      while (true) {
        try {
          const result = await executeAction(
            event.tableName, event.recordId, event.data,
            actions[i], event.userId, ctx, i,
          );
          if (result === 'waiting') {
            await db('workflow_executions').where('id', execution.id).update({
              action_index: i + 1,
              context: JSON.stringify(ctx.variables),
            });
            return; // execution paused
          }
          break; // action succeeded, move on
        } catch (actionErr: any) {
          retries++;
          if (retries <= maxRetries) {
            logger.warn(`Retrying action ${i} (${retries}/${maxRetries}): ${actionErr.message}`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
          } else if (strategy === 'continue') {
            logger.warn(`Action ${i} failed, continuing: ${actionErr.message}`);
            break;
          } else {
            throw actionErr; // strategy === 'stop'
          }
        }
      }
    }
  } catch (err: any) {
    status = 'error';
    error = err.message;
    logger.error(`Workflow action failed: ${rule.name}`, err);
  }

  const durationMs = Date.now() - startTime;
  await db('workflow_executions').where('id', execution.id).update({
    status,
    error,
    duration_ms: durationMs,
    context: JSON.stringify(ctx.variables),
  });
}

async function processEvent(event: AppEvent): Promise<void> {
  try {
    const rules = await db('workflow_rules')
      .where({ table_name: event.tableName, trigger_event: event.type, active: true })
      .orderBy('execution_order', 'asc');

    for (const rule of rules) {
      await processWorkflowRule(rule, event);
    }
  } catch (err) {
    logger.error('Workflow engine error', err);
  }
}

/**
 * Resume a workflow execution from a paused state (after form submission, delay, or approval).
 */
async function resumeExecution(executionId: string): Promise<void> {
  const execution = await db('workflow_executions').where('id', executionId).first();
  if (!execution) return;

  const rule = await db('workflow_rules').where('id', execution.rule_id).first();
  if (!rule) return;

  const actions = rule.actions as Action[];
  const startIndex = execution.action_index || 0;

  // Re-fetch the current record data
  let record: Record<string, unknown> = {};
  try {
    record = await db(execution.table_name).where('id', execution.record_id).first() || {};
  } catch {
    record = {};
  }

  // Restore context
  let savedContext: Record<string, unknown> = {};
  try {
    savedContext = typeof execution.context === 'string' ? JSON.parse(execution.context) : (execution.context || {});
  } catch { /* ignore */ }

  const ctx: ExecutionContext = {
    variables: savedContext,
    executionId: execution.id,
    ruleId: rule.id,
    triggerType: execution.trigger_type,
    startTime: Date.now(),
  };

  let status = 'success';
  let error: string | null = null;

  try {
    for (let i = startIndex; i < actions.length; i++) {
      const result = await executeAction(
        execution.table_name, execution.record_id, record,
        actions[i], rule.created_by, ctx, i,
      );
      if (result === 'waiting') {
        await db('workflow_executions').where('id', execution.id).update({
          action_index: i + 1,
          context: JSON.stringify(ctx.variables),
        });
        return;
      }
    }
  } catch (err: any) {
    status = 'error';
    error = err.message;
    logger.error(`Workflow resume failed: ${rule.name}`, err);
  }

  await db('workflow_executions').where('id', execution.id).update({
    status,
    error,
    resume_at: null,
    action_index: null,
    duration_ms: Date.now() - (ctx.startTime || Date.now()),
    context: JSON.stringify(ctx.variables),
  });
}

/**
 * Handle form.submitted event -- resume the waiting workflow.
 */
async function handleFormSubmitted(payload: { executionId: string }): Promise<void> {
  try {
    await resumeExecution(payload.executionId);
  } catch (err) {
    logger.error('Error resuming workflow after form submission', err);
  }
}

/**
 * Handle approval.decided event -- resume workflows waiting for approval.
 */
async function handleApprovalDecided(event: AppEvent): Promise<void> {
  try {
    // Process rules that trigger on approval.decided
    await processEvent(event);

    // Resume any waiting workflows
    const waitingExecutions = await db('workflow_executions')
      .where('status', 'waiting_for_approval')
      .where('table_name', event.tableName)
      .where('record_id', event.recordId);

    for (const execution of waitingExecutions) {
      logger.info(`Resuming approval-waiting workflow execution: ${execution.id}`);
      await resumeExecution(execution.id);
    }
  } catch (err) {
    logger.error('Error handling approval.decided', err);
  }
}

/**
 * Handle sla.breached event -- trigger SLA workflows.
 */
async function handleSlaBreached(event: AppEvent): Promise<void> {
  try {
    await processEvent(event);
  } catch (err) {
    logger.error('Error handling sla.breached', err);
  }
}

/**
 * Handle webhook.received event -- trigger webhook workflows.
 */
async function handleWebhookReceived(event: AppEvent): Promise<void> {
  try {
    const slug = event.data._webhook_slug as string;
    if (!slug) return;

    const webhook = await db('workflow_webhooks')
      .where({ path_slug: slug, active: true })
      .first();

    if (!webhook) {
      logger.warn(`No active webhook found for slug: ${slug}`);
      return;
    }

    const rule = await db('workflow_rules').where('id', webhook.workflow_rule_id).first();
    if (!rule || !rule.active) return;

    await processWorkflowRule(rule, event, 'webhook');
  } catch (err) {
    logger.error('Error handling webhook.received', err);
  }
}

/**
 * Periodically check for delayed executions that are due.
 */
function startDelayTimer(): void {
  setInterval(async () => {
    try {
      const dueExecutions = await db('workflow_executions')
        .where('status', 'delayed')
        .where('resume_at', '<=', new Date());

      for (const execution of dueExecutions) {
        logger.info(`Resuming delayed workflow execution: ${execution.id}`);
        await resumeExecution(execution.id);
      }
    } catch (err) {
      logger.error('Delay timer error', err);
    }
  }, 60_000); // check every 60 seconds
}

/**
 * Periodically check for scheduled workflow triggers.
 */
function startScheduledTriggerTimer(): void {
  setInterval(async () => {
    try {
      const scheduledRuns = await db('workflow_scheduled_runs')
        .where('status', 'pending')
        .where('next_run_at', '<=', new Date());

      for (const run of scheduledRuns) {
        const trigger = await db('workflow_triggers')
          .where({ id: run.trigger_id, active: true, type: 'scheduled' })
          .first();

        if (!trigger) continue;

        const rule = await db('workflow_rules').where('id', trigger.workflow_rule_id).first();
        if (!rule || !rule.active) continue;

        logger.info(`Running scheduled workflow: ${rule.name}`);

        const syntheticEvent: AppEvent = {
          type: 'scheduled',
          tableName: rule.table_name,
          recordId: '',
          data: { _trigger_id: trigger.id, _scheduled: true },
          userId: rule.created_by,
        };

        await processWorkflowRule(rule, syntheticEvent, 'scheduled');

        // Update scheduled run
        const config = typeof trigger.config === 'string' ? JSON.parse(trigger.config) : trigger.config;
        const intervalMinutes = config.interval_minutes || 60;
        const nextRun = new Date(Date.now() + intervalMinutes * 60 * 1000);

        await db('workflow_scheduled_runs').where('id', run.id).update({
          last_run_at: new Date(),
          next_run_at: nextRun,
          status: 'pending',
          updated_at: new Date(),
        });
      }
    } catch (err) {
      logger.error('Scheduled trigger timer error', err);
    }
  }, 60_000);
}

export function initWorkflowEngine(): void {
  eventBus.on('record.created', processEvent);
  eventBus.on('record.updated', processEvent);
  eventBus.on('record.state_changed', processEvent);
  eventBus.on('form.submitted', handleFormSubmitted);
  eventBus.on('approval.decided', handleApprovalDecided);
  eventBus.on('sla.breached', handleSlaBreached);
  eventBus.on('webhook.received', handleWebhookReceived);
  eventBus.on('integration.inbound', processEvent);

  startDelayTimer();
  startScheduledTriggerTimer();

  logger.info('Workflow engine initialized (enhanced)');
}

export { resumeExecution, processWorkflowRule };
