import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { aiService } from '../../modules/ai/service';

export interface NluResult {
  intent: 'incident' | 'change' | 'problem' | 'request' | 'status' | 'other';
  short_description: string;
  number: string | null;
}

/**
 * Whether natural-language understanding is enabled for the chatbot.
 * Controlled by the CHATBOT_NLU_ENABLED sys_setting and requires an active AI provider.
 */
export async function isNluEnabled(): Promise<boolean> {
  const setting = await db('sys_settings').where('key', 'CHATBOT_NLU_ENABLED').first();
  if (setting && String(setting.value).toLowerCase() === 'false') return false;
  const provider = await db('ai_providers').where('active', true).first();
  return !!provider;
}

const INTENT_INSTRUCTION = `You are an intent classifier for an IT service management chatbot.
Classify the user's message and respond with ONLY a single JSON object, no prose, no code fences.
Schema:
{
  "intent": one of ["incident","change","problem","request","status","other"],
  "short_description": a concise one-line summary suitable as a ticket title,
  "number": any ticket number explicitly mentioned (e.g. "INC0001") or null
}
Guidance:
- "incident": something is broken, not working, an outage, an error, "I can't ...".
- "change": a planned modification, deployment, upgrade, maintenance.
- "problem": investigating a recurring root cause.
- "request": asking for something from the catalog (new laptop, access, software).
- "status": asking about the state of an existing ticket (usually mentions a number).
- "other": greetings, thanks, or anything that is not a clear ITSM action.`;

/**
 * Classify a free-text message into an ITSM intent using the active AI provider.
 * Returns null if NLU is unavailable (no provider) or the model output can't be parsed.
 */
export async function classifyMessage(text: string, userId: string): Promise<NluResult | null> {
  try {
    const message = `${INTENT_INSTRUCTION}\n\nUser message: "${text.replace(/"/g, "'")}"`;
    const { text: raw } = await aiService.chat(message, '', userId);

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]) as Partial<NluResult>;
    const validIntents = ['incident', 'change', 'problem', 'request', 'status', 'other'];
    if (!parsed.intent || !validIntents.includes(parsed.intent)) return null;

    return {
      intent: parsed.intent as NluResult['intent'],
      short_description: (parsed.short_description || text).toString().slice(0, 200),
      number: parsed.number ? String(parsed.number).toUpperCase() : null,
    };
  } catch (err) {
    logger.debug('NLU classification failed', err);
    return null;
  }
}
