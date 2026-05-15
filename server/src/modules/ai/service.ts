import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { encryptApiKey, decryptApiKey, generateCompletion, testProvider } from '../../core/ai-engine';
import { AppError } from '../../middleware/error';

export class AiService {
  // Providers
  async listProviders() {
    const providers = await db('ai_providers').orderBy('name');
    return providers.map((p: any) => ({
      ...p,
      api_key_encrypted: p.api_key_encrypted ? '••••••••' : null,
    }));
  }

  async getProvider(id: string) {
    const provider = await db('ai_providers').where('id', id).first();
    if (!provider) throw new AppError(404, 'Provider not found');
    return { ...provider, api_key_encrypted: provider.api_key_encrypted ? '••••••••' : null };
  }

  async createProvider(data: Record<string, unknown>, userId: string) {
    const insertData: any = { ...data, created_by: userId };
    if (data.api_key && typeof data.api_key === 'string') {
      insertData.api_key_encrypted = encryptApiKey(data.api_key);
      delete insertData.api_key;
    }
    const [provider] = await db('ai_providers').insert(insertData).returning('*');
    return { ...provider, api_key_encrypted: provider.api_key_encrypted ? '••••••••' : null };
  }

  async updateProvider(id: string, data: Record<string, unknown>) {
    const existing = await db('ai_providers').where('id', id).first();
    if (!existing) throw new AppError(404, 'Provider not found');

    const updateData: any = { ...data, updated_at: new Date() };
    if (data.api_key && typeof data.api_key === 'string') {
      updateData.api_key_encrypted = encryptApiKey(data.api_key);
      delete updateData.api_key;
    }
    const [updated] = await db('ai_providers').where('id', id).update(updateData).returning('*');
    return { ...updated, api_key_encrypted: updated.api_key_encrypted ? '••••••••' : null };
  }

  async deleteProvider(id: string) {
    await db('ai_providers').where('id', id).del();
  }

  async testProvider(id: string) {
    return testProvider(id);
  }

  // Prompts
  async listPrompts() {
    return db('ai_prompts').orderBy('use_case').orderBy('name');
  }

  async getPrompt(id: string) {
    return db('ai_prompts').where('id', id).first();
  }

  async getPromptsByUseCase(useCase: string) {
    return db('ai_prompts').where({ use_case: useCase, active: true });
  }

  async createPrompt(data: Record<string, unknown>, userId: string) {
    const [prompt] = await db('ai_prompts').insert({ ...data, created_by: userId }).returning('*');
    return prompt;
  }

  async updatePrompt(id: string, data: Record<string, unknown>) {
    const [updated] = await db('ai_prompts').where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
    return updated;
  }

  async deletePrompt(id: string) {
    await db('ai_prompts').where('id', id).del();
  }

  // Generate
  async generate(promptId: string, context: Record<string, string>, userId: string) {
    return generateCompletion(promptId, context, userId);
  }

  // Feedback
  async submitFeedback(logId: string, feedback: string) {
    await db('ai_usage_log').where('id', logId).update({ feedback });
  }

  // Usage stats
  async getUsageStats() {
    const totalRequests = await db('ai_usage_log').count('* as count').first();
    const totalTokens = await db('ai_usage_log')
      .sum('input_tokens as input')
      .sum('output_tokens as output')
      .first();
    const byProvider = await db('ai_usage_log')
      .join('ai_providers', 'ai_providers.id', 'ai_usage_log.provider_id')
      .select('ai_providers.name')
      .count('* as count')
      .sum('ai_usage_log.input_tokens as input_tokens')
      .sum('ai_usage_log.output_tokens as output_tokens')
      .groupBy('ai_providers.name');
    const feedbackStats = await db('ai_usage_log')
      .select('feedback')
      .count('* as count')
      .whereNotNull('feedback')
      .groupBy('feedback');

    return {
      totalRequests: Number((totalRequests as any)?.count || 0),
      totalInputTokens: Number((totalTokens as any)?.input || 0),
      totalOutputTokens: Number((totalTokens as any)?.output || 0),
      byProvider,
      feedbackStats,
    };
  }
}

export const aiService = new AiService();
