/**
 * AI providers a user can pick in Settings → AI. No secrets here: this file is shared by the
 * browser (the picker) and the server (validation).
 */
export type ProviderId = 'anthropic' | 'openrouter' | 'openai' | 'nebius' | 'groq' | 'custom';

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  /** OpenAI-compatible endpoint. Anthropic uses its own SDK, so it has none. */
  baseURL?: string;
  keyPrefix?: string;
  keyUrl?: string;
  /** Suggested models; the user can also type any model id the provider offers. */
  models: { id: string; label: string }[];
  note?: string;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    keyPrefix: 'sk-ant-',
    keyUrl: 'https://platform.claude.com/settings/keys',
    models: [
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (best results)' },
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (faster, cheaper)' },
      { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (cheapest)' },
    ],
    note: 'Uses structured outputs and prompt caching. Billed to your Anthropic account.',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    keyPrefix: 'sk-or-',
    keyUrl: 'https://openrouter.ai/keys',
    models: [{ id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' }],
    note: 'Any model id from openrouter.ai/models works, including Claude models.',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    keyPrefix: 'sk-',
    keyUrl: 'https://platform.openai.com/api-keys',
    models: [],
    note: 'Type the model id from your OpenAI account.',
  },
  {
    id: 'nebius',
    label: 'Nebius AI Studio',
    baseURL: 'https://api.tokenfactory.nebius.com/v1',
    models: [{ id: 'deepseek-ai/DeepSeek-V4.1-Flash-1017', label: 'DeepSeek V4.1 Flash' }],
  },
  {
    id: 'groq',
    label: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    keyPrefix: 'gsk_',
    keyUrl: 'https://console.groq.com/keys',
    models: [],
    note: 'Type the model id from console.groq.com.',
  },
  {
    id: 'custom',
    label: 'Other (OpenAI-compatible)',
    models: [],
    note: 'Any server that speaks the OpenAI chat completions API (Ollama, vLLM, LM Studio…).',
  },
];

export const providerInfo = (id: string) => PROVIDERS.find((p) => p.id === id);

/** What the browser is allowed to see about a saved setting. The key itself never leaves the server. */
export interface PublicAISettings {
  provider: ProviderId;
  model: string;
  baseURL: string | null;
  keyHint: string; // e.g. "sk-ant-…9f3a"
  savedAt: string;
}

/** What the server falls back to when the user hasn't saved a key. */
export interface ServerAIStatus {
  available: boolean;
  label: string | null;
}

export const keyHint = (key: string) => {
  const k = key.trim();
  const head = k.startsWith('sk-ant-') ? 'sk-ant-' : k.startsWith('sk-or-') ? 'sk-or-' : k.slice(0, 3);
  return `${head}…${k.slice(-4)}`;
};
