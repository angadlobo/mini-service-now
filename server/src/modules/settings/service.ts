import { db } from '../../config/database';

export class SettingsService {
  async getAll() {
    return db('sys_settings').orderBy('category').orderBy('key');
  }

  async getByCategory(category: string) {
    return db('sys_settings').where('category', category).orderBy('key');
  }

  async get(key: string): Promise<string | null> {
    const setting = await db('sys_settings').where('key', key).first();
    return setting?.value ?? null;
  }

  async set(key: string, value: string) {
    const existing = await db('sys_settings').where('key', key).first();
    if (existing) {
      await db('sys_settings').where('key', key).update({ value, updated_at: new Date() });
    } else {
      // Derive category from key prefix (e.g., "branding.app_name" -> "branding")
      const category = key.includes('.') ? key.split('.')[0] : 'general';
      await db('sys_settings').insert({ key, value, category });
    }
  }

  async bulkUpdate(settings: { key: string; value: string }[]) {
    for (const s of settings) {
      await this.set(s.key, s.value);
    }
  }
}

export const settingsService = new SettingsService();
