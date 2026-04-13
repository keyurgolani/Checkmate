import { describe, it, expect } from 'vitest';
import { WebResearchService } from '@/lib/services/web-research';
import { WebResearchProvider } from '@/lib/pocketbase-types';

const service = new WebResearchService();

describe('buildSearchSpec', () => {
  it('builds SearXNG search spec', () => {
    const spec = service.buildSearchSpec(
      { enabled: true, provider: WebResearchProvider.SEARXNG, apiKey: null, baseUrl: 'http://localhost:8080' },
      'test query',
      { maxResults: 5 }
    );
    expect(spec.url).toContain('http://localhost:8080/search');
    expect(spec.url).toContain('format=json');
    expect(spec.method).toBe('GET');
    expect(spec.responseHandling).toBe('json');
  });

  it('normalizes trailing slash from base URL', () => {
    const spec = service.buildSearchSpec(
      { enabled: true, provider: WebResearchProvider.SEARXNG, apiKey: null, baseUrl: 'http://localhost:8080/' },
      'query'
    );
    expect(spec.url).toContain('http://localhost:8080/search');
    expect(spec.url).not.toContain('//search');
  });
});

describe('parseSearchResponse', () => {
  it('parses SearXNG response', () => {
    const response = JSON.stringify({
      results: [
        { title: 'Result 1', url: 'https://example.com', content: 'Content 1' },
        { title: 'Result 2', url: 'https://example2.com', content: 'Content 2' },
      ]
    });
    const result = service.parseSearchResponse(WebResearchProvider.SEARXNG, response, 5);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(2);
    expect(result.data[0]!.title).toBe('Result 1');
  });

  it('returns error for invalid JSON', () => {
    const result = service.parseSearchResponse(WebResearchProvider.SEARXNG, 'not json', 5);
    expect(result.success).toBe(false);
  });

  it('respects maxResults', () => {
    const response = JSON.stringify({
      results: Array.from({ length: 10 }, (_, i) => ({
        title: `Result ${i}`, url: `https://example${i}.com`, content: `Content ${i}`
      }))
    });
    const result = service.parseSearchResponse(WebResearchProvider.SEARXNG, response, 3);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(3);
  });
});
