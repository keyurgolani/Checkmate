'use client';

import { needsRelay } from '@/lib/relay-utils';
import { executeRelayWorkflow } from '@/lib/services/relay-client';
import type { LLMSettings } from '@/lib/pocketbase-types';

interface LLMClientCallbacks {
  onStatusChange?: (status: string) => void;
  signal?: AbortSignal;
}

async function directFetch(url: string, body: unknown, signal?: AbortSignal) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  return res.json();
}

export const llmClient = {
  async generate(settings: LLMSettings, query: string, callbacks?: LLMClientCallbacks) {
    if (needsRelay(settings)) {
      return executeRelayWorkflow('generate', { settings, query }, callbacks);
    }
    return directFetch('/api/llm/generate', { settings, query }, callbacks?.signal);
  },

  async fetchModels(settings: LLMSettings, callbacks?: LLMClientCallbacks) {
    if (needsRelay(settings)) {
      return executeRelayWorkflow('models', { settings }, callbacks);
    }
    return directFetch('/api/llm/models', settings, callbacks?.signal);
  },

  async improve(settings: LLMSettings, params: Record<string, unknown>, callbacks?: LLMClientCallbacks) {
    if (needsRelay(settings)) {
      return executeRelayWorkflow('improve', { settings, ...params }, callbacks);
    }
    return directFetch('/api/llm/improve', { settings, ...params }, callbacks?.signal);
  },

  async enhance(settings: LLMSettings, params: Record<string, unknown>, callbacks?: LLMClientCallbacks) {
    if (needsRelay(settings)) {
      return executeRelayWorkflow('enhance', { settings, ...params }, callbacks);
    }
    return directFetch('/api/llm/enhance', { settings, ...params }, callbacks?.signal);
  },
};
