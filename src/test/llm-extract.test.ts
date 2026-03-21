import { describe, it, expect } from 'vitest';
import { LLMService } from '@/lib/services/llm';
import type { LLMSettings } from '@/lib/pocketbase-types';

const service = new LLMService();

describe('buildGeneratePrompts', () => {
  it('returns system and user prompts', () => {
    const { system, user } = service.buildGeneratePrompts('camping checklist', '');
    expect(system).toContain('checklist template generator');
    expect(user).toContain('camping checklist');
  });

  it('prepends web research context to user prompt', () => {
    const context = '## Web Research Results\nSome results here';
    const { user } = service.buildGeneratePrompts('camping', context);
    expect(user).toContain('Web Research Results');
    expect(user).toContain('camping');
  });
});

describe('buildImproveTemplatePrompts', () => {
  it('includes template data in user prompt', () => {
    const { system, user } = service.buildImproveTemplatePrompts(
      { title: 'My Template', description: 'Desc', items: [{ content: 'Step 1' }] },
      ''
    );
    expect(system).toContain('improvement expert');
    expect(user).toContain('My Template');
    expect(user).toContain('Step 1');
  });
});

describe('buildImproveStepPrompts', () => {
  it('includes step and template context', () => {
    const { user } = service.buildImproveStepPrompts(
      { content: 'Do the thing', description: 'Details' },
      { title: 'Template', description: null, allSteps: [{ content: 'Do the thing' }], currentStepIndex: 0 },
      ''
    );
    expect(user).toContain('Do the thing');
    expect(user).toContain('Template');
  });
});

describe('buildEnhancePrompts', () => {
  it('includes all items with IDs', () => {
    const { user } = service.buildEnhancePrompts(
      { title: 'T', description: null, items: [{ id: 'abc', content: 'Step' }] },
      ''
    );
    expect(user).toContain('abc');
    expect(user).toContain('Step');
  });
});

describe('buildTextPrompt', () => {
  it('returns the prompt as-is', () => {
    const { user } = service.buildTextPrompt('Summarize this');
    expect(user).toBe('Summarize this');
  });
});

describe('parseLLMResponse', () => {
  it('parses valid generate response', () => {
    const json = JSON.stringify({ title: 'Test', description: 'Desc', items: [{ content: 'Step 1' }] });
    const result = service.parseLLMResponse('generate', json);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('title', 'Test');
  });

  it('returns error for invalid JSON', () => {
    const result = service.parseLLMResponse('generate', 'not json at all');
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('LLM_006');
  });

  it('extracts JSON from surrounding text', () => {
    const text = 'Here is the result:\n' + JSON.stringify({ title: 'T', description: 'D', items: [{ content: 'S' }] }) + '\nDone!';
    const result = service.parseLLMResponse('generate', text);
    expect(result.success).toBe(true);
  });

  it('validates improve-template response', () => {
    const json = JSON.stringify({ suggestedItems: [{ content: 'New item' }], reasoning: 'Because' });
    const result = service.parseLLMResponse('improve-template', json);
    expect(result.success).toBe(true);
  });

  it('validates improve-step response', () => {
    const json = JSON.stringify({ content: 'Better step', description: 'Better desc', reasoning: 'why' });
    const result = service.parseLLMResponse('improve-step', json);
    expect(result.success).toBe(true);
  });

  it('validates enhance response', () => {
    const json = JSON.stringify({ enhancedItems: [{ id: 'a', content: 'X', description: 'Y' }], reasoning: 'z' });
    const result = service.parseLLMResponse('enhance', json);
    expect(result.success).toBe(true);
  });

  it('returns text directly for text operation', () => {
    const result = service.parseLLMResponse('text', 'Hello world');
    expect(result.success).toBe(true);
    expect(result.data).toBe('Hello world');
  });
});

describe('parseSSEStream', () => {
  it('extracts content from SSE data lines', () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      'data: {"choices":[{"delta":{"content":" world"}}]}',
      'data: [DONE]',
    ].join('\n');
    expect(service.parseSSEStream(sse)).toBe('Hello world');
  });

  it('handles empty delta objects', () => {
    const sse = [
      'data: {"choices":[{"delta":{"role":"assistant"}}]}',
      'data: {"choices":[{"delta":{"content":"Hi"}}]}',
      'data: [DONE]',
    ].join('\n');
    expect(service.parseSSEStream(sse)).toBe('Hi');
  });

  it('returns empty string for empty input', () => {
    expect(service.parseSSEStream('')).toBe('');
  });
});

describe('parseModelFetchResponse', () => {
  it('parses Ollama model list', () => {
    const response = JSON.stringify({ models: [{ name: 'llama3' }, { name: 'mistral' }] });
    const result = service.parseModelFetchResponse('ollama', response);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0]?.id).toBe('llama3');
  });

  it('parses OpenAI-compatible model list', () => {
    const response = JSON.stringify({ data: [{ id: 'model-1' }, { id: 'model-2' }] });
    const result = service.parseModelFetchResponse('openai-compatible', response);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('returns error for invalid JSON', () => {
    const result = service.parseModelFetchResponse('ollama', 'not json');
    expect(result.success).toBe(false);
  });
});

describe('buildModelFetchSpec', () => {
  it('builds Ollama model fetch spec', () => {
    const spec = service.buildModelFetchSpec({
      provider: 'ollama', apiKey: null, selectedModel: null, baseUrl: 'http://localhost:11434'
    } as LLMSettings);
    expect(spec.url).toBe('http://localhost:11434/api/tags');
    expect(spec.method).toBe('GET');
    expect(spec.responseHandling).toBe('json');
  });

  it('builds openai-compatible model fetch spec', () => {
    const spec = service.buildModelFetchSpec({
      provider: 'openai-compatible', apiKey: 'key', selectedModel: null, baseUrl: 'http://localhost:8000'
    } as LLMSettings);
    expect(spec.url).toBe('http://localhost:8000/v1/models');
    expect(spec.method).toBe('GET');
    expect(spec.headers).toHaveProperty('Authorization', 'Bearer key');
  });
});

describe('buildLLMRequestSpec', () => {
  it('builds Ollama LLM request spec', () => {
    const spec = service.buildLLMRequestSpec(
      { provider: 'ollama', apiKey: null, selectedModel: 'llama3', baseUrl: 'http://localhost:11434' } as LLMSettings,
      'System prompt', 'User prompt'
    );
    expect(spec.url).toBe('http://localhost:11434/v1/chat/completions');
    expect(spec.method).toBe('POST');
    expect(spec.responseHandling).toBe('stream-collect');
    const body = JSON.parse(spec.body!);
    expect(body.model).toBe('llama3');
    expect(body.messages).toHaveLength(2);
    expect(body.stream).toBe(true);
  });

  it('builds openai-compatible LLM request spec with API key', () => {
    const spec = service.buildLLMRequestSpec(
      { provider: 'openai-compatible', apiKey: 'mykey', selectedModel: 'model', baseUrl: 'http://192.168.1.50:8000' } as LLMSettings,
      'System', 'User'
    );
    expect(spec.headers).toHaveProperty('Authorization', 'Bearer mykey');
  });
});
