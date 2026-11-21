import { createOpenAI } from '@ai-sdk/openai';

/**
 * LLM Provider configured for OpenAI-compatible endpoints (OpenRouter by default).
 * Models are read dynamically from environment variables.
 */

const baseURL = process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1';
const apiKey = process.env.LLM_API_KEY || 'dummy_key_for_build';

export const customProvider = createOpenAI({
  baseURL,
  apiKey,
});

export const mainModelName = process.env.LLM_MODEL || 'deepseek/deepseek-chat';
export const fastModelName = process.env.LLM_FAST_MODEL || 'deepseek/deepseek-chat';

export const llmModel = customProvider(mainModelName);
export const llmFastModel = customProvider(fastModelName);
