import nodemailer from 'nodemailer';
import { db } from '../config/database';
import { logger } from '../config/logger';

async function getSmtpConfig() {
  const settings = await db('sys_settings').whereIn('key', [
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM',
  ]);
  const map: Record<string, string> = {};
  settings.forEach((s: any) => { map[s.key] = s.value; });
  return map;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const config = await getSmtpConfig();
    if (!config.SMTP_HOST) {
      logger.debug('Email not sent: SMTP not configured');
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: parseInt(config.SMTP_PORT || '587'),
      secure: parseInt(config.SMTP_PORT || '587') === 465,
      auth: config.SMTP_USER ? {
        user: config.SMTP_USER,
        pass: config.SMTP_PASSWORD,
      } : undefined,
    });

    await transporter.sendMail({
      from: config.SMTP_FROM || 'noreply@miniservicenow.local',
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    logger.info(`Email sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (err) {
    logger.error('Email send failed', err);
    return false;
  }
}
