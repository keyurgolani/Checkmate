import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RelayOrchestrator } from '@/lib/services/relay-orchestrator';
import type { WorkflowState } from '@/lib/services/relay-orchestrator';
import type { LLMSettings } from '@/lib/pocketbase-types';
import { LLMProvider, WebResearchProvider } from '@/lib/pocketbase-types';

const TEST_SECRET = 'test-secret-key-for-unit-tests';

// ---------------------------------------------------------------------------
// Helper: settings factories
// ---------------------------------------------------------------------------

function ollamaSettings(overrides?: Partial<LLMSettings>): LLMSettings {
  return {
    provider: LLMProvider.OLLAMA,
    apiKey: null,
    baseUrl: 'http://localhost:11434',
    selectedModel: 'llama3',
    ...overrides,
  };
}

function openaiSettings(overrides?: Partial<LLMSettings>): LLMSettings {
  return {
    provider: LLMProvider.OPENAI,
    apiKey: 'sk-test-key',
    selectedModel: 'gpt-4o',
    ...overrides,
  };
}

function perplexitySettings(overrides?: Partial<LLMSettings>): LLMSettings {
  return {
    provider: LLMProvider.PERPLEXITY,
    apiKey: 'pplx-test-key',
    selectedModel: 'sonar',
    ...overrides,
  };
}

function withSearXNG(settings: LLMSettings): LLMSettings {
  return {
    ...settings,
    webResearch: {
      enabled: true,
      provider: WebResearchProvider.SEARXNG,
      apiKey: null,
      baseUrl: 'http://localhost:8888',
    },
  };
}

function withTavily(settings: LLMSettings): LLMSettings {
  return {
    ...settings,
    webResearch: {
      enabled: true,
      provider: WebResearchProvider.TAVILY,
      apiKey: 'tvly-test-key',
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RelayOrchestrator', () => {
  let orchestrator: RelayOrchestrator;

  beforeEach(() => {
    orchestrator = new RelayOrchestrator(TEST_SECRET);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Token signing & verification
  // =========================================================================

  describe('token signing and verification', () => {
    it('should round-trip sign + verify a token', () => {
      const state: WorkflowState = {
        operation: 'generate',
        phase: 'PENDING_LLM_RELAY',
        settings: ollamaSettings(),
        operationParams: { query: 'test' },
        createdAt: Date.now(),
        expiresAt: Date.now() + 300_000,
      };

      const token = orchestrator.signToken(state);
      const recovered = orchestrator.verifyToken(token);

      expect(recovered.operation).toBe(state.operation);
      expect(recovered.phase).toBe(state.phase);
      expect(recovered.operationParams).toEqual(state.operationParams);
      expect(recovered.settings.provider).toBe(state.settings.provider);
    });

    it('should reject an expired token', () => {
      const state: WorkflowState = {
        operation: 'generate',
        phase: 'PENDING_LLM_RELAY',
        settings: ollamaSettings(),
        operationParams: {},
        createdAt: Date.now() - 600_000,
        expiresAt: Date.now() - 1, // already expired
      };

      const token = orchestrator.signToken(state);

      expect(() => orchestrator.verifyToken(token)).toThrow('Token expired');
    });

    it('should reject a tampered token', () => {
      const state: WorkflowState = {
        operation: 'generate',
        phase: 'PENDING_LLM_RELAY',
        settings: ollamaSettings(),
        operationParams: {},
        createdAt: Date.now(),
        expiresAt: Date.now() + 300_000,
      };

      const token = orchestrator.signToken(state);
      // Tamper with the payload (flip a character)
      const parts = token.split('.');
      const payload = parts[0]!;
      const sig = parts[1]!;
      const tampered = payload.slice(0, -1) + (payload.slice(-1) === 'A' ? 'B' : 'A');

      expect(() => orchestrator.verifyToken(`${tampered}.${sig}`)).toThrow();
    });

    it('should reject a token with invalid format', () => {
      expect(() => orchestrator.verifyToken('no-dots-here')).toThrow('Invalid token format');
      expect(() => orchestrator.verifyToken('a.b.c')).toThrow('Invalid token format');
    });
  });

  // =========================================================================
  // startWorkflow – Ollama model fetch → relay
  // =========================================================================

  describe('startWorkflow – models operation', () => {
    it('should return relay spec for Ollama model fetch', async () => {
      const settings = ollamaSettings();
      const result = await orchestrator.startWorkflow('models', settings, {});

      expect(result.relay).toBe(true);
      if (result.relay) {
        expect(result.requestSpec.url).toContain('localhost:11434');
        expect(result.requestSpec.url).toContain('/api/tags');
        expect(result.requestSpec.method).toBe('GET');
        expect(result.token).toBeTruthy();
      }
    });

    it('should return direct result for cloud model fetch', async () => {
      // Mock global fetch so the cloud call doesn't hit the network
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              { id: 'gpt-4o', name: 'GPT-4o' },
              { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const settings = openaiSettings();
      const result = await orchestrator.startWorkflow('models', settings, {});

      expect(result.relay).toBe(false);
      if (!result.relay) {
        expect(result.result.success).toBe(true);
        expect(result.result.models).toBeTruthy();
      }

      mockFetch.mockRestore();
    });
  });

  // =========================================================================
  // startWorkflow – Ollama + SearXNG → search relay first
  // =========================================================================

  describe('startWorkflow – generate with Ollama + SearXNG', () => {
    it('should return search relay first when web research is self-hosted', async () => {
      const settings = withSearXNG(ollamaSettings());
      const result = await orchestrator.startWorkflow('generate', settings, { query: 'moving checklist' });

      expect(result.relay).toBe(true);
      if (result.relay) {
        // Should be a SearXNG search request
        expect(result.requestSpec.url).toContain('localhost:8888');
        expect(result.requestSpec.url).toContain('/search');
        expect(result.requestSpec.url).toContain('q=moving');
        expect(result.requestSpec.method).toBe('GET');

        // Token should encode PENDING_SEARCH_RELAY state
        const state = orchestrator.verifyToken(result.token);
        expect(state.phase).toBe('PENDING_SEARCH_RELAY');
        expect(state.operation).toBe('generate');
      }
    });
  });

  // =========================================================================
  // advanceWorkflow – search relay → LLM relay
  // =========================================================================

  describe('advanceWorkflow – search relay to LLM relay', () => {
    it('should transition from PENDING_SEARCH_RELAY to PENDING_LLM_RELAY for Ollama', async () => {
      // First create a PENDING_SEARCH_RELAY state
      const settings = withSearXNG(ollamaSettings());
      const startResult = await orchestrator.startWorkflow('generate', settings, { query: 'moving checklist' });

      expect(startResult.relay).toBe(true);
      if (!startResult.relay) return;

      // Simulate search response from SearXNG
      const searchResponse = JSON.stringify({
        results: [
          { title: 'Moving Tips', url: 'https://example.com/moving', content: 'Great moving tips here' },
          { title: 'Packing Guide', url: 'https://example.com/packing', content: 'How to pack efficiently' },
        ],
      });

      const advanceResult = await orchestrator.advanceWorkflow(startResult.token, searchResponse);

      expect(advanceResult.relay).toBe(true);
      if (advanceResult.relay) {
        // Should now be an LLM request
        expect(advanceResult.requestSpec.url).toContain('localhost:11434');
        expect(advanceResult.requestSpec.url).toContain('/chat/completions');
        expect(advanceResult.requestSpec.method).toBe('POST');
        expect(advanceResult.requestSpec.body).toBeTruthy();

        // Token should encode PENDING_LLM_RELAY state
        const state = orchestrator.verifyToken(advanceResult.token);
        expect(state.phase).toBe('PENDING_LLM_RELAY');
        expect(state.operation).toBe('generate');
      }
    });
  });

  // =========================================================================
  // Perplexity skips web research even with SearXNG
  // =========================================================================

  describe('Perplexity skips web research', () => {
    it('should skip web research for Perplexity even with SearXNG configured', async () => {
      // Perplexity has built-in search, so it should skip SearXNG
      // Perplexity is also a cloud provider (not self-hosted), so no relay needed
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    title: 'Test Template',
                    description: 'A test',
                    items: [{ content: 'Step 1', description: 'Do step 1' }],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const settings = withSearXNG(perplexitySettings());
      const result = await orchestrator.startWorkflow('generate', settings, { query: 'test checklist' });

      // Perplexity is cloud-hosted, so the result should not be a relay
      expect(result.relay).toBe(false);

      // Verify that fetch was NOT called with a SearXNG URL
      const fetchCalls = mockFetch.mock.calls;
      const searxngCalls = fetchCalls.filter(
        (call) => typeof call[0] === 'string' && call[0].includes('localhost:8888')
      );
      expect(searxngCalls).toHaveLength(0);

      mockFetch.mockRestore();
    });
  });

  // =========================================================================
  // advanceWorkflow – LLM relay → final result for models
  // =========================================================================

  describe('advanceWorkflow – LLM relay completion', () => {
    it('should parse model fetch response (non-SSE JSON) for Ollama', async () => {
      // Create a PENDING_LLM_RELAY state for models
      const state: WorkflowState = {
        operation: 'models',
        phase: 'PENDING_LLM_RELAY',
        settings: ollamaSettings(),
        operationParams: {},
        createdAt: Date.now(),
        expiresAt: Date.now() + 300_000,
      };
      const token = orchestrator.signToken(state);

      // Simulate Ollama model list response (plain JSON, not SSE)
      const modelResponse = JSON.stringify({
        models: [
          { name: 'llama3:latest' },
          { name: 'mistral:latest' },
        ],
      });

      const result = await orchestrator.advanceWorkflow(token, modelResponse);

      expect(result.relay).toBe(false);
      if (!result.relay) {
        expect(result.result.success).toBe(true);
        const models = result.result.models as Array<{ id: string }>;
        expect(models).toHaveLength(2);
        expect(models[0]!.id).toBe('llama3:latest');
        expect(models[1]!.id).toBe('mistral:latest');
      }
    });

    it('should parse SSE stream response for generate operation', async () => {
      const state: WorkflowState = {
        operation: 'generate',
        phase: 'PENDING_LLM_RELAY',
        settings: ollamaSettings(),
        operationParams: { query: 'test' },
        createdAt: Date.now(),
        expiresAt: Date.now() + 300_000,
      };
      const token = orchestrator.signToken(state);

      // Build an SSE response that contains a JSON template
      const templateJson = JSON.stringify({
        title: 'Test Template',
        description: 'A test template',
        items: [
          { content: 'Step 1', description: 'First step', itemType: 'task' },
          { content: 'Step 2', description: 'Second step', itemType: 'task' },
        ],
      });

      const sseResponse = [
        `data: ${JSON.stringify({ choices: [{ delta: { content: templateJson } }] })}`,
        'data: [DONE]',
      ].join('\n');

      const result = await orchestrator.advanceWorkflow(token, sseResponse);

      expect(result.relay).toBe(false);
      if (!result.relay) {
        expect(result.result.success).toBe(true);
        expect(result.result.template).toBeTruthy();
        const template = result.result.template as { title: string };
        expect(template.title).toBe('Test Template');
      }
    });
  });
});
