import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { OutboundMessage } from './types';
import { formatTicketStatus, formatError } from './formatters';

/** Prefix → table mapping */
const prefixMap: Record<string, { table: string; type: string }> = {
  INC: { table: 'incidents', type: 'Incident' },
  CHG: { table: 'changes', type: 'Change Request' },
  PRB: { table: 'problems', type: 'Problem' },
  REQ: { table: 'sc_requests', type: 'Catalog Request' },
};

/**
 * Handle /status <NUMBER> command.
 * Parses the ticket number prefix and queries the relevant table.
 */
export async function handleStatus(args: string): Promise<OutboundMessage> {
  const number = args.trim().toUpperCase();
  if (!number) {
    return { text: formatError('Usage: /status <ticket number> (e.g. /status INC1001)') };
  }

  const prefix = number.replace(/[0-9]/g, '');
  const mapping = prefixMap[prefix];
  if (!mapping) {
    return { text: formatError(`Unknown ticket prefix "${prefix}". Supported: INC, CHG, PRB, REQ`) };
  }

  try {
    const record = await db(mapping.table)
      .where('number', number)
      .first();

    if (!record) {
      return { text: formatError(`Ticket ${number} not found.`) };
    }

    // Resolve assigned user name
    let assignedName: string | undefined;
    const assignedField = mapping.table === 'sc_requests' ? 'requested_by' : 'assigned_to';
    if (record[assignedField]) {
      const user = await db('users').where('id', record[assignedField]).first();
      if (user) assignedName = `${user.first_name} ${user.last_name}`.trim();
    }

    return {
      text: formatTicketStatus(
        mapping.type,
        record.number,
        record.state,
        record.short_description || record.number,
        assignedName,
        record.priority,
      ),
    };
  } catch (err) {
    logger.error('Status handler error', err);
    return { text: formatError('An error occurred while looking up the ticket.') };
  }
}
