import api from './client';

export interface ChatbotKey {
  key: string;
  set: boolean;
  secret: boolean;
  value: string;
  description: string;
}

export interface ChatbotPlatform {
  platform: string;
  configured: boolean;
  anySet: boolean;
  webhookUrl: string;
  keys: ChatbotKey[];
}

export interface ChatbotConfig {
  platforms: ChatbotPlatform[];
  nluEnabled: boolean;
  aiProviderActive: boolean;
  baseUrl: string;
}

export const chatbotApi = {
  getConfig: () => api.get<ChatbotConfig>('/chatbot/admin/config').then(r => r.data),
  saveConfig: (settings: { key: string; value: string }[]) =>
    api.put('/chatbot/admin/config', { settings }).then(r => r.data),
  setupTelegram: (baseUrl?: string) =>
    api.post('/chatbot/admin/telegram/setup', { baseUrl }).then(r => r.data),
  setupDiscord: () => api.post('/chatbot/admin/discord/setup', {}).then(r => r.data),
  listLinks: () => api.get<any[]>('/chatbot/admin/links').then(r => r.data),
  deactivateLink: (id: string) => api.delete(`/chatbot/admin/links/${id}`).then(r => r.data),
  listSessions: () => api.get<any[]>('/chatbot/admin/sessions').then(r => r.data),
};
