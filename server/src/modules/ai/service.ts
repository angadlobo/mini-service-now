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

  // Chat - simple single-turn chat using first active provider
  async chat(message: string, context: string, userId: string) {
    const provider = await db('ai_providers').where('active', true).first();
    if (!provider) throw new AppError(400, 'No active AI provider configured. Please configure one in Admin > AI Providers.');

    const { decryptApiKey: decrypt } = await import('../../core/ai-engine');
    const apiKey = provider.api_key_encrypted ? decrypt(provider.api_key_encrypted) : '';

    const adapters: Record<string, string> = { openai: 'openai', anthropic: 'anthropic', ollama: 'ollama', custom: 'custom' };
    const adapterType = adapters[provider.provider_type];
    if (!adapterType) throw new AppError(400, `Unknown provider type: ${provider.provider_type}`);

    // Use ai-engine adapters directly
    const { generateCompletion: _ , ...aiEngine } = await import('../../core/ai-engine');

    const systemPrompt = `You are a helpful IT service management assistant for a ServiceNow-like platform. You help users with incidents, changes, problems, service catalog, knowledge base, workflows, and general IT questions.${context ? `\n\nUser is currently on: ${context}` : ''}`;

    // Build adapter call based on provider type
    const url = provider.provider_type === 'openai'
      ? `${provider.base_url || 'https://api.openai.com/v1'}/chat/completions`
      : provider.provider_type === 'anthropic'
      ? `${provider.base_url || 'https://api.anthropic.com'}/v1/messages`
      : provider.provider_type === 'ollama'
      ? `${provider.base_url || 'http://localhost:11434'}/api/chat`
      : provider.base_url || '';

    let text = '';
    let inputTokens = 0;
    let outputTokens = 0;

    if (provider.provider_type === 'openai') {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: provider.model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
          max_tokens: 1000,
        }),
      });
      if (!res.ok) throw new AppError(500, `AI provider error: ${res.status}`);
      const json = await res.json() as any;
      text = json.choices?.[0]?.message?.content || '';
      inputTokens = json.usage?.prompt_tokens || 0;
      outputTokens = json.usage?.completion_tokens || 0;
    } else if (provider.provider_type === 'anthropic') {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: provider.model, max_tokens: 1000, system: systemPrompt,
          messages: [{ role: 'user', content: message }],
        }),
      });
      if (!res.ok) throw new AppError(500, `AI provider error: ${res.status}`);
      const json = await res.json() as any;
      text = json.content?.[0]?.text || '';
      inputTokens = json.usage?.input_tokens || 0;
      outputTokens = json.usage?.output_tokens || 0;
    } else if (provider.provider_type === 'ollama') {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: provider.model, stream: false,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
        }),
      });
      if (!res.ok) throw new AppError(500, `AI provider error: ${res.status}`);
      const json = await res.json() as any;
      text = json.message?.content || '';
      inputTokens = json.prompt_eval_count || 0;
      outputTokens = json.eval_count || 0;
    } else {
      throw new AppError(400, 'Chat not supported for custom provider type');
    }

    // Log usage
    await db('ai_usage_log').insert({
      provider_id: provider.id,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      response_text: text,
      user_id: userId,
    });

    return { text, tokensUsed: inputTokens + outputTokens };
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
