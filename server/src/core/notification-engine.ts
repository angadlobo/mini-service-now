import { db } from '../config/database';
import { logger } from '../config/logger';

export async function notify(
  userId: string,
  title: string,
  body: string,
  link?: string
): Promise<void> {
  try {
    await db('sys_notification').insert({
      user_id: userId,
      title,
      body,
      link: link || null,
    });
  } catch (err) {
    logger.error('Failed to create notification', err);
  }
}

export async function notifyAssignment(
  userId: string,
  tableName: string,
  recordNumber: string,
  description: string
): Promise<void> {
  await notify(
    userId,
    `Assigned: ${recordNumber}`,
    description,
    `/${tableName}/${recordNumber}`
  );
}

export async function notifyApprovalRequest(
  approverId: string,
  tableName: string,
  recordNumber: string,
  description: string
): Promise<void> {
  await notify(
    approverId,
    `Approval Required: ${recordNumber}`,
    description,
    '/approvals'
  );
}
