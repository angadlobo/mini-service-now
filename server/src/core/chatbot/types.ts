export type Platform = 'telegram' | 'slack' | 'teams' | 'whatsapp' | 'discord';

export interface InboundMessage {
  platform: Platform;
  platformUserId: string;
  platformChatId: string;
  platformUsername?: string;
  text: string;
  /** Raw platform-specific payload for adapter use */
  raw?: unknown;
}

export interface OutboundMessage {
  text: string;
  /** Platform-specific extras (keyboards, blocks, cards, etc.) */
  extras?: Record<string, unknown>;
}

export interface FormStep {
  field: string;
  prompt: string;
  type: 'text' | 'select';
  required: boolean;
  /** For select type: label→value map */
  options?: { label: string; value: string }[];
  /** Allow 'skip' to skip optional fields */
  skippable: boolean;
}

export interface FormFlow {
  command: string;
  label: string;
  steps: FormStep[];
}

export interface ChatSession {
  id: string;
  platform: Platform;
  platform_user_id: string;
  platform_chat_id: string;
  user_id: string;
  command: string;
  current_step: number;
  form_data: Record<string, unknown>;
  expires_at: Date;
}

export interface ChatUserLink {
  id: string;
  platform: Platform;
  platform_user_id: string;
  platform_chat_id: string | null;
  platform_username: string | null;
  user_id: string;
  linked_at: Date;
  active: boolean;
}

export interface PlatformAdapter {
  platform: Platform;
  parseWebhook(body: unknown, headers: Record<string, string>): InboundMessage | null;
  verifySignature(body: unknown, headers: Record<string, string>): Promise<boolean>;
  sendMessage(chatId: string, message: OutboundMessage): Promise<boolean>;
}
