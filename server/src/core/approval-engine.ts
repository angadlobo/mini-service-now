import { db } from '../config/database';

export async function createApproval(
  tableName: string,
  recordId: string,
  approverIds: string[]
): Promise<void> {
  const entries = approverIds.map((approverId) => ({
    table_name: tableName,
    record_id: recordId,
    approver_id: approverId,
    state: 'requested',
  }));
  await db('approvals').insert(entries);
}

export async function checkAllApproved(tableName: string, recordId: string): Promise<boolean> {
  const approvals = await db('approvals')
    .where({ table_name: tableName, record_id: recordId });

  if (approvals.length === 0) return false;
  return approvals.every((a: { state: string }) => a.state === 'approved');
}

export async function checkAnyRejected(tableName: string, recordId: string): Promise<boolean> {
  const rejected = await db('approvals')
    .where({ table_name: tableName, record_id: recordId, state: 'rejected' })
    .first();
  return !!rejected;
}
