import { db } from '../config/database';
import { logger } from '../config/logger';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.AI_ENCRYPTION_KEY || 'default-dev-key-change-in-production';

export function encryptApiKey(plaintext: string): string {
  return CryptoJS.AES.encrypt(plaintext, ENCRYPTION_KEY).toString();
}

export function decryptApiKey(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

interface ProviderAdapter {
  generate(systemPrompt: string, userPrompt: string, apiKey: string, model: string, baseUrl?: string, config?: Record<string, unknown>): Promise<{ text: string; inputTokens: number; outputTokens: number }>;
}

const openaiAdapter: ProviderAdapter = {
  async generate(systemPrompt, userPrompt, apiKey, model, baseUrl) {
    const url = `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2000,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
    const json = await res.json() as any;
    return {
      text: json.choices?.[0]?.message?.content || '',
      inputTokens: json.usage?.prompt_tokens || 0,
      outputTokens: json.usage?.completion_tokens || 0,
    };
  },
};

const anthropicAdapter: ProviderAdapter = {
  async generate(systemPrompt, userPrompt, apiKey, model, baseUrl) {
    const url = `${baseUrl || 'https://api.anthropic.com'}/v1/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
    const json = await res.json() as any;
    return {
      text: json.content?.[0]?.text || '',
      inputTokens: json.usage?.input_tokens || 0,
      outputTokens: json.usage?.output_tokens || 0,
    };
  },
};

const ollamaAdapter: ProviderAdapter = {
  async generate(systemPrompt, userPrompt, _apiKey, model, baseUrl) {
    const url = `${baseUrl || 'http://localhost:11434'}/api/chat`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
      }),
    });
    if (!res.ok) throw new Error(`Ollama API error: ${res.status} ${await res.text()}`);
    const json = await res.json() as any;
    return {
      text: json.message?.content || '',
      inputTokens: json.prompt_eval_count || 0,
      outputTokens: json.eval_count || 0,
    };
  },
};

const customAdapter: ProviderAdapter = {
  async generate(systemPrompt, userPrompt, apiKey, model, baseUrl, config) {
    const url = baseUrl || '';
    if (!url) throw new Error('Custom adapter requires a base_url');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config?.headers as Record<string, string> || {}),
    };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const bodyTemplate = (config?.bodyTemplate as string) || JSON.stringify({
      model: '{{model}}',
      messages: [
        { role: 'system', content: '{{system_prompt}}' },
        { role: 'user', content: '{{user_prompt}}' },
      ],
    });

    const body = bodyTemplate
      .replace('{{model}}', model)
      .replace('{{system_prompt}}', systemPrompt.replace(/"/g, '\\"'))
      .replace('{{user_prompt}}', userPrompt.replace(/"/g, '\\"'));

    const res = await fetch(url, { method: 'POST', headers, body });
    if (!res.ok) throw new Error(`Custom API error: ${res.status} ${await res.text()}`);
    const json = await res.json() as any;

    const textPath = (config?.responsePath as string) || 'choices[0].message.content';
    const text = getNestedValue(json, textPath) || JSON.stringify(json);

    return { text: String(text), inputTokens: 0, outputTokens: 0 };
  },
};

function getNestedValue(obj: any, path: string): any {
  return path.split(/[.\[\]]/).filter(Boolean).reduce((acc, key) => acc?.[key], obj);
}

const adapters: Record<string, ProviderAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  ollama: ollamaAdapter,
  custom: customAdapter,
};

export async function generateCompletion(
  promptId: string,
  context: Record<string, string>,
  userId: string,
): Promise<{ text: string; logId: string; tokensUsed: number }> {
  const prompt = await db('ai_prompts').where('id', promptId).first();
  if (!prompt || !prompt.active) throw new Error('Prompt not found or inactive');

  // Find provider - use prompt-specific or first active
  const provider = prompt.provider_id
    ? await db('ai_providers').where('id', prompt.provider_id).first()
    : await db('ai_providers').where('active', true).first();

  if (!provider) throw new Error('No active AI provider configured');

  const adapter = adapters[provider.provider_type];
  if (!adapter) throw new Error(`Unknown provider type: ${provider.provider_type}`);

  const apiKey = provider.api_key_encrypted ? decryptApiKey(provider.api_key_encrypted) : '';

  // Interpolate template variables
  let userPrompt = prompt.user_prompt_template;
  for (const [key, value] of Object.entries(context)) {
    userPrompt = userPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  const result = await adapter.generate(
    prompt.system_prompt,
    userPrompt,
    apiKey,
    provider.model,
    provider.base_url,
    provider.config,
  );

  // Log usage
  const [logEntry] = await db('ai_usage_log').insert({
    prompt_id: promptId,
    provider_id: provider.id,
    table_name: context.table_name || null,
    record_id: context.record_id || null,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    response_text: result.text,
    user_id: userId,
  }).returning('*');

  return {
    text: result.text,
    logId: logEntry.id,
    tokensUsed: result.inputTokens + result.outputTokens,
  };
}

export async function testProvider(providerId: string): Promise<{ success: boolean; message: string }> {
  const provider = await db('ai_providers').where('id', providerId).first();
  if (!provider) throw new Error('Provider not found');

  const adapter = adapters[provider.provider_type];
  if (!adapter) throw new Error(`Unknown provider type: ${provider.provider_type}`);

  const apiKey = provider.api_key_encrypted ? decryptApiKey(provider.api_key_encrypted) : '';

  try {
    const result = await adapter.generate(
      'You are a helpful assistant.',
      'Say "Hello" in one word.',
      apiKey,
      provider.model,
      provider.base_url,
      provider.config,
    );
    return { success: true, message: result.text.substring(0, 200) };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
