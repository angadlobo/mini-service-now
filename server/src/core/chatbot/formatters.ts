import { FormFlow, FormStep } from './types';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

export function formatHelp(): string {
  return [
    'Available commands:',
    '',
    '/incident  - Create a new incident',
    '/change    - Create a new change request',
    '/problem   - Create a new problem record',
    '/request   - Create a catalog request',
    '/status <NUMBER> - Check ticket status (e.g. /status INC1001)',
    '/link <username> <password> - Link your chat account',
    '/cancel    - Cancel current operation',
    '/help      - Show this help message',
  ].join('\n');
}

export function formatQuestion(flow: FormFlow, stepIndex: number, step: FormStep): string {
  const stepNum = stepIndex + 1;
  const totalSteps = flow.steps.length + 1; // +1 for confirmation
  const header = `[${flow.label}] Step ${stepNum} of ${totalSteps}`;
  return `${header}\n\n${step.prompt}`;
}

export function formatSummary(flow: FormFlow, formData: Record<string, unknown>): string {
  const lines = [`Please confirm your ${flow.label}:\n`];

  for (const step of flow.steps) {
    const value = formData[step.field];
    if (value !== undefined && value !== null) {
      // For select fields, show the label instead of raw value
      let displayValue = String(value);
      if (step.options) {
        const opt = step.options.find((o) => o.value === String(value));
        if (opt) displayValue = opt.label;
      }
      lines.push(`  ${step.field}: ${displayValue}`);
    }
  }

  lines.push('');
  lines.push('Type "yes" to submit or "cancel" to abort.');
  return lines.join('\n');
}

export function formatCatalogSummary(itemName: string, variables: Record<string, unknown>): string {
  const lines = [`Please confirm your Catalog Request:\n`, `  Item: ${itemName}`];

  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined && value !== null) {
      lines.push(`  ${key}: ${String(value)}`);
    }
  }

  lines.push('');
  lines.push('Type "yes" to submit or "cancel" to abort.');
  return lines.join('\n');
}

export function formatTicketCreated(type: string, number: string, shortDesc: string): string {
  const typeLabels: Record<string, string> = {
    incident: 'Incident',
    change: 'Change Request',
    problem: 'Problem',
    request: 'Catalog Request',
  };

  const routeMap: Record<string, string> = {
    incident: 'incidents',
    change: 'changes',
    problem: 'problems',
    request: 'catalog/requests',
  };

  const label = typeLabels[type] || type;
  const route = routeMap[type] || type;
  const url = `${CLIENT_URL}/${route}`;

  return [
    `${label} created successfully!`,
    '',
    `  Number: ${number}`,
    `  Description: ${shortDesc}`,
    '',
    `View in app: ${url}`,
  ].join('\n');
}

export function formatTicketStatus(
  type: string,
  number: string,
  state: string,
  shortDesc: string,
  assignedTo?: string,
  priority?: number | string,
): string {
  const lines = [
    `Ticket: ${number}`,
    `  Type: ${type}`,
    `  State: ${state}`,
    `  Description: ${shortDesc}`,
  ];

  if (priority) lines.push(`  Priority: ${priority}`);
  if (assignedTo) lines.push(`  Assigned to: ${assignedTo}`);

  return lines.join('\n');
}

export function formatError(message: string): string {
  return `Error: ${message}`;
}

export function formatSessionExpired(): string {
  return 'Your session has expired. Please start a new command.';
}

export function formatNotLinked(): string {
  return 'Your chat account is not linked. Use /link <username> <password> to link it first.';
}

export function formatLinkSuccess(username: string): string {
  return `Account linked successfully! You are now connected as "${username}".`;
}

export function formatLinkFailed(): string {
  return 'Login failed. Please check your username and password and try again.';
}

export function formatCancelled(): string {
  return 'Operation cancelled.';
}

export function formatCatalogItemList(items: Array<{ id: string; name: string; description?: string }>): string {
  if (items.length === 0) {
    return 'No catalog items available.';
  }

  const lines = ['Available catalog items:\n'];
  items.forEach((item, i) => {
    lines.push(`  ${i + 1}. ${item.name}`);
    if (item.description) {
      lines.push(`     ${item.description.substring(0, 80)}`);
    }
  });
  lines.push('');
  lines.push('Type the number of the item you want to request:');
  return lines.join('\n');
}
