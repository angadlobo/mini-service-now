import { db } from '../../config/database';
import { logger } from '../../config/logger';

export async function sendSlackMessage(text: string): Promise<boolean> {
  try {
    const setting = await db('sys_settings').where('key', 'SLACK_WEBHOOK_URL').first();
    const webhookUrl = setting?.value;
    if (!webhookUrl) {
      logger.debug('Slack not sent: webhook URL not configured');
      return false;
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    return res.ok;
  } catch (err) {
    logger.error('Slack send failed', err);
    return false;
  }
}
