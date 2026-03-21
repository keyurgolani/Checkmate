import type { LLMSettings, WebResearchSettings } from './pocketbase-types';
import { WEB_RESEARCH_PROVIDER_CONFIG } from './web-research-config';

export interface RequestSpec {
  url: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
  responseHandling: 'json' | 'stream-collect';
}

export function isLLMSelfHosted(settings: LLMSettings): boolean {
  if (!settings.provider) return false;
  if (settings.provider === 'ollama' || settings.provider === 'openai-compatible') {
    return settings.selfHosted ?? true;
  }
  return false;
}

export function isWebResearchSelfHosted(settings: WebResearchSettings | null | undefined): boolean {
  if (!settings?.enabled || !settings.provider) return false;
  const config = WEB_RESEARCH_PROVIDER_CONFIG[settings.provider];
  if (!config.isSelfHosted) return false;
  return settings.selfHosted ?? true;
}

export function needsRelay(settings: LLMSettings): boolean {
  return isLLMSelfHosted(settings) || isWebResearchSelfHosted(settings.webResearch);
}
