import { describe, it, expect } from 'vitest';
import { isLLMSelfHosted, isWebResearchSelfHosted, needsRelay } from '@/lib/relay-utils';
import { WebResearchProvider, LLMProvider } from '@/lib/pocketbase-types';

describe('isLLMSelfHosted', () => {
  it('returns true for ollama (defaults to self-hosted)', () => {
    expect(isLLMSelfHosted({ provider: LLMProvider.OLLAMA, apiKey: null, selectedModel: 'llama3' })).toBe(true);
  });

  it('returns false for ollama with selfHosted=false (cloud endpoint)', () => {
    expect(isLLMSelfHosted({ provider: LLMProvider.OLLAMA, apiKey: null, selectedModel: 'llama3', selfHosted: false })).toBe(false);
  });

  it('returns true for openai-compatible with selfHosted=true', () => {
    expect(isLLMSelfHosted({
      provider: LLMProvider.OPENAI_COMPATIBLE, apiKey: null, selectedModel: 'model',
      selfHosted: true, baseUrl: 'http://localhost:8000'
    })).toBe(true);
  });

  it('returns true for openai-compatible with selfHosted undefined (defaults true)', () => {
    expect(isLLMSelfHosted({
      provider: LLMProvider.OPENAI_COMPATIBLE, apiKey: null, selectedModel: 'model',
      baseUrl: 'http://localhost:8000'
    })).toBe(true);
  });

  it('returns false for openai-compatible with selfHosted=false', () => {
    expect(isLLMSelfHosted({
      provider: LLMProvider.OPENAI_COMPATIBLE, apiKey: 'key', selectedModel: 'model',
      selfHosted: false, baseUrl: 'https://my-cloud.com'
    })).toBe(false);
  });

  it('returns false for cloud providers', () => {
    expect(isLLMSelfHosted({ provider: LLMProvider.OPENAI, apiKey: 'key', selectedModel: 'gpt-4' })).toBe(false);
    expect(isLLMSelfHosted({ provider: LLMProvider.ANTHROPIC, apiKey: 'key', selectedModel: 'claude' })).toBe(false);
    expect(isLLMSelfHosted({ provider: LLMProvider.GEMINI, apiKey: 'key', selectedModel: 'gemini' })).toBe(false);
  });

  it('returns false for null provider', () => {
    expect(isLLMSelfHosted({ provider: null, apiKey: null, selectedModel: null })).toBe(false);
  });
});

describe('isWebResearchSelfHosted', () => {
  it('returns true for SearXNG', () => {
    expect(isWebResearchSelfHosted({
      enabled: true, provider: WebResearchProvider.SEARXNG, apiKey: null, baseUrl: 'http://localhost:8080'
    })).toBe(true);
  });

  it('returns false for cloud providers', () => {
    expect(isWebResearchSelfHosted({
      enabled: true, provider: WebResearchProvider.TAVILY, apiKey: 'key'
    })).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isWebResearchSelfHosted(null)).toBe(false);
    expect(isWebResearchSelfHosted(undefined)).toBe(false);
  });

  it('returns false when disabled', () => {
    expect(isWebResearchSelfHosted({
      enabled: false, provider: WebResearchProvider.SEARXNG, apiKey: null, baseUrl: 'http://localhost:8080'
    })).toBe(false);
  });
});

describe('needsRelay', () => {
  it('returns true when LLM is self-hosted', () => {
    expect(needsRelay({ provider: LLMProvider.OLLAMA, apiKey: null, selectedModel: 'llama3' })).toBe(true);
  });

  it('returns true when web research is self-hosted', () => {
    expect(needsRelay({
      provider: LLMProvider.OPENAI, apiKey: 'key', selectedModel: 'gpt-4',
      webResearch: { enabled: true, provider: WebResearchProvider.SEARXNG, apiKey: null, baseUrl: 'http://localhost:8080' }
    })).toBe(true);
  });

  it('returns false when all cloud', () => {
    expect(needsRelay({
      provider: LLMProvider.OPENAI, apiKey: 'key', selectedModel: 'gpt-4',
      webResearch: { enabled: true, provider: WebResearchProvider.TAVILY, apiKey: 'key' }
    })).toBe(false);
  });

  it('returns false when no web research', () => {
    expect(needsRelay({ provider: LLMProvider.OPENAI, apiKey: 'key', selectedModel: 'gpt-4' })).toBe(false);
  });
});
