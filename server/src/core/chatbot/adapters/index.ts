import { Platform, PlatformAdapter } from '../types';
import { telegramAdapter } from './telegram-adapter';
import { slackAdapter } from './slack-adapter';
import { teamsAdapter } from './teams-adapter';
import { whatsappAdapter } from './whatsapp-adapter';
import { discordAdapter } from './discord-adapter';

const adapters: Record<Platform, PlatformAdapter> = {
  telegram: telegramAdapter,
  slack: slackAdapter,
  teams: teamsAdapter,
  whatsapp: whatsappAdapter,
  discord: discordAdapter,
};

export function getAdapter(platform: Platform): PlatformAdapter {
  const adapter = adapters[platform];
  if (!adapter) throw new Error(`No adapter for platform: ${platform}`);
  return adapter;
}

export { telegramAdapter, slackAdapter, teamsAdapter, whatsappAdapter, discordAdapter };
