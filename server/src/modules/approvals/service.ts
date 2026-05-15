import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { checkAllApproved } from '../../core/approval-engine';
import { notify } from '../../core/notification-engine';
import { AppError } from '../../middleware/error';

export class ApprovalService {
  async listForUser(userId: string, options: QueryOptions) {
    const query = db('approvals')
      .select(
        'approvals.*',
        db.raw(`CASE
          WHEN approvals.table_name = 'changes' THEN (SELECT number FROM changes WHERE changes.id = approvals.record_id)
          WHEN approvals.table_name = 'sc_requests' THEN (SELECT number FROM sc_requests WHERE sc_requests.id = approvals.record_id)
          ELSE NULL END as record_number`),
        db.raw(`CASE
          WHEN approvals.table_name = 'changes' THEN (SELECT short_description FROM changes WHERE changes.id = approvals.record_id)
          WHEN approvals.table_name = 'sc_requests' THEN (SELECT name FROM sc_catalog_items WHERE sc_catalog_items.id = (SELECT catalog_item_id FROM sc_requests WHERE sc_requests.id = approvals.record_id))
          ELSE NULL END as record_description`),
      )
      .where('approvals.approver_id', userId);

    const { dataQuery, countQuery } = applyQueryOptions(query, 'approvals', options);
    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async decide(approvalId: string, state: 'approved' | 'rejected', comments: string | null, userId: string) {
    const approval = await db('approvals').where('id', approvalId).first();
    if (!approval) throw new AppError(404, 'Approval not found');
    if (approval.approver_id !== userId) throw new AppError(403, 'Not your approval');
    if (approval.state !== 'requested') throw new AppError(400, 'Approval already decided');

    await db('approvals').where('id', approvalId).update({
      state,
      comments,
      decided_at: new Date().toISOString(),
      updated_at: new Date(),
    });

    // Auto-advance state if all approved
    if (state === 'approved') {
      const allApproved = await checkAllApproved(approval.table_name, approval.record_id);
      if (allApproved) {
        if (approval.table_name === 'changes') {
          await db('changes').where('id', approval.record_id).update({ state: 'scheduled', updated_at: new Date() });
        } else if (approval.table_name === 'sc_requests') {
          await db('sc_requests').where('id', approval.record_id).update({ state: 'approved', updated_at: new Date() });
        }
      }
    }

    // Notify requester
    if (approval.table_name === 'changes') {
      const change = await db('changes').where('id', approval.record_id).first();
      if (change) {
        await notify(change.created_by, `Change ${state}: ${change.number}`, change.short_description, `/changes/${change.id}`);
      }
    }

    return { message: `Approval ${state}` };
  }

  async getForRecord(tableName: string, recordId: string) {
    return db('approvals')
      .select(
        'approvals.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = approvals.approver_id) as approver_name"),
      )
      .where({ table_name: tableName, record_id: recordId })
      .orderBy('created_at');
  }
}

export const approvalService = new ApprovalService();
