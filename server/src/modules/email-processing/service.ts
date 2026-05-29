import { db } from '../../config/database';
import { AppError } from '../../middleware/error';
import { incidentService } from '../incidents/service';

export interface InboundEmail {
  account_id?: string;
  from: string;
  subject: string;
  body?: string;
  message_id?: string;
}

/** Pull the first ticket number out of a subject line, e.g. "Re: [INC0001234] ...". */
function extractTicketNumber(subject: string): string | null {
  const m = subject.match(/\b(INC\d+)\b/i);
  return m ? m[1].toUpperCase() : null;
}

function conditionMatches(conditions: Record<string, any>, email: InboundEmail): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true;
  const subject = (email.subject || '').toLowerCase();
  const body = (email.body || '').toLowerCase();
  const from = (email.from || '').toLowerCase();
  if (conditions.subject_contains && !subject.includes(String(conditions.subject_contains).toLowerCase())) return false;
  if (conditions.body_contains && !body.includes(String(conditions.body_contains).toLowerCase())) return false;
  if (conditions.from_domain && !from.endsWith(String(conditions.from_domain).toLowerCase())) return false;
  return true;
}

export class EmailProcessingService {
  // ── Accounts ─────────────────────────────────────────
  async listAccounts() {
    const rows = await db('email_accounts').orderBy('address');
    return rows.map((r: any) => ({ ...r, encrypted_password: r.encrypted_password ? '••••••••' : '' }));
  }

  async createAccount(data: Record<string, any>) {
    const [acc] = await db('email_accounts')
      .insert({
        address: data.address,
        protocol: data.protocol || 'imap',
        host: data.host,
        port: data.port || 993,
        username: data.username,
        encrypted_password: data.password || '',
        ssl: data.ssl !== false,
        active: data.active !== false,
        polling_interval_seconds: data.polling_interval_seconds || 300,
        default_assignment_group_id: data.default_assignment_group_id || null,
      })
      .returning('*');
    return acc;
  }

  async updateAccount(id: string, data: Record<string, any>) {
    const patch: Record<string, unknown> = { ...data, updated_at: new Date() };
    if (data.password) patch.encrypted_password = data.password;
    delete (patch as any).password;
    if (data.password === '' || data.password === undefined) delete (patch as any).encrypted_password;
    const [acc] = await db('email_accounts').where('id', id).update(patch).returning('*');
    if (!acc) throw new AppError(404, 'Email account not found');
    return acc;
  }

  async deleteAccount(id: string) {
    await db('email_accounts').where('id', id).del();
    return { message: 'Email account deleted' };
  }

  // ── Rules ────────────────────────────────────────────
  async listRules(accountId?: string) {
    const q = db('email_processing_rules').orderBy('priority', 'desc');
    if (accountId) q.where('email_account_id', accountId);
    return q;
  }

  async createRule(data: Record<string, any>) {
    const [rule] = await db('email_processing_rules')
      .insert({
        email_account_id: data.email_account_id,
        priority: data.priority || 0,
        conditions: JSON.stringify(data.conditions || {}),
        action: data.action,
      })
      .returning('*');
    return rule;
  }

  async deleteRule(id: string) {
    await db('email_processing_rules').where('id', id).del();
    return { message: 'Rule deleted' };
  }

  async getProcessedLog(limit = 100) {
    return db('processed_emails').orderBy('created_at', 'desc').limit(limit);
  }

  /** Resolve the sender to a platform user (by email), falling back to the admin user. */
  private async resolveUserId(fromAddress: string): Promise<string> {
    const email = (fromAddress || '').replace(/.*<(.+)>.*/, '$1').trim().toLowerCase();
    const user = await db('users').whereRaw('LOWER(email) = ?', [email]).first();
    if (user) return user.id;
    const admin = await db('users').where('username', 'admin').first();
    if (admin) return admin.id;
    const any = await db('users').first();
    if (!any) throw new AppError(500, 'No users exist to own the created ticket');
    return any.id;
  }

  /**
   * Process one inbound email: dedupe, thread replies onto an existing incident,
   * otherwise apply rules (default: create an incident). Returns what happened.
   */
  async processInbound(email: InboundEmail) {
    // 1. De-duplicate by message id.
    if (email.message_id) {
      const seen = await db('processed_emails').where('message_id', email.message_id).first();
      if (seen) return { action: 'duplicate', processed_email_id: seen.id, record_id: seen.created_record_id };
    }

    const record = (action: string, table: string | null, recordId: string | null) =>
      db('processed_emails').insert({
        email_account_id: email.account_id || null,
        message_id: email.message_id || null,
        from_address: email.from,
        subject: email.subject,
        received_at: new Date(),
        action_taken: action,
        created_record_table: table,
        created_record_id: recordId,
      }).returning('*').then((r) => r[0]);

    const userId = await this.resolveUserId(email.from);

    // 2. Threading: reply that references an existing incident → add a comment.
    const ticketNumber = extractTicketNumber(email.subject || '');
    if (ticketNumber) {
      const incident = await db('incidents').where('number', ticketNumber).first();
      if (incident) {
        await db('sys_journal').insert({
          table_name: 'incidents',
          record_id: incident.id,
          type: 'comment',
          body: `📧 Email reply from ${email.from}:\n\n${email.body || '(no body)'}`,
          created_by: userId,
        });
        const pe = await record('add_comment', 'incidents', incident.id);
        return { action: 'add_comment', record_table: 'incidents', record_id: incident.id, record_number: ticketNumber, processed_email_id: pe.id };
      }
    }

    // 3. Apply the first matching rule for the account (if any).
    let action = 'create_incident';
    if (email.account_id) {
      const rules = await db('email_processing_rules')
        .where('email_account_id', email.account_id)
        .orderBy('priority', 'desc');
      for (const rule of rules) {
        const conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions;
        if (conditionMatches(conditions, email)) { action = rule.action; break; }
      }
    }

    if (action === 'ignore') {
      const pe = await record('ignore', null, null);
      return { action: 'ignore', processed_email_id: pe.id };
    }

    // 4. Default action: create an incident from the email.
    const incident = await incidentService.create({
      short_description: (email.subject || 'Email request').slice(0, 255),
      description: `Received via email from ${email.from}.\n\n${email.body || ''}`,
      caller_id: userId,
    }, userId);

    const pe = await record('create_incident', 'incidents', incident.id);
    return { action: 'create_incident', record_table: 'incidents', record_id: incident.id, record_number: incident.number, processed_email_id: pe.id };
  }
}

export const emailProcessingService = new EmailProcessingService();
