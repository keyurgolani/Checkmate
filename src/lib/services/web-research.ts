/**
 * Web Research Service
 * 
 * Provides web search functionality using various APIs to enhance
 * AI-powered features with live internet research.
 * 
 * Supported providers:
 * - Tavily: AI-optimized search API
 * - Exa: Neural search engine
 * - Firecrawl: Web scraping and search API
 * - Brave: Independent search API with own index
 * - SearXNG: Self-hosted meta-search engine (local/privacy-focused)
 */

import { WebResearchProvider, type WebResearchSettings } from '../pocketbase-types';

// ============================================================================
// Types
// ============================================================================

export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface WebResearchResult {
  success: boolean;
  results: WebSearchResult[];
  error: WebResearchError | null;
}

export interface WebResearchError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Error Codes
// ============================================================================

export const WebResearchErrorCodes = {
  NOT_CONFIGURED: 'WEB_001',
  API_KEY_REQUIRED: 'WEB_002',
  SEARCH_FAILED: 'WEB_003',
  INVALID_PROVIDER: 'WEB_004',
  RATE_LIMITED: 'WEB_005',
  BASE_URL_REQUIRED: 'WEB_006',
  UNKNOWN_ERROR: 'WEB_999',
} as const;

// ============================================================================
// Provider Configuration
// ============================================================================

export const WEB_RESEARCH_PROVIDER_CONFIG: Record<WebResearchProvider, { 
  name: string; 
  description: string;
  docsUrl: string;
  requiresApiKey: boolean;
  requiresBaseUrl: boolean;
  isSelfHosted: boolean;
}> = {
  tavily: { 
    name: 'Tavily', 
    description: 'AI-optimized search API with high-quality results',
    docsUrl: 'https://tavily.com',
    requiresApiKey: true,
    requiresBaseUrl: false,
    isSelfHosted: false,
  },
  exa: { 
    name: 'Exa', 
    description: 'Neural search engine for finding similar content',
    docsUrl: 'https://exa.ai',
    requiresApiKey: true,
    requiresBaseUrl: false,
    isSelfHosted: false,
  },
  firecrawl: {
    name: 'Firecrawl',
    description: 'Web scraping and search API with content extraction',
    docsUrl: 'https://firecrawl.dev',
    requiresApiKey: true,
    requiresBaseUrl: false,
    isSelfHosted: false,
  },
  brave: {
    name: 'Brave Search',
    description: 'Independent search API with its own web index',
    docsUrl: 'https://brave.com/search/api',
    requiresApiKey: true,
    requiresBaseUrl: false,
    isSelfHosted: false,
  },
  searxng: {
    name: 'SearXNG',
    description: 'Self-hosted privacy-focused meta-search engine',
    docsUrl: 'https://docs.searxng.org',
    requiresApiKey: false,
    requiresBaseUrl: true,
    isSelfHosted: true,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function createErrorResult(error: WebResearchError): WebResearchResult {
  return { success: false, results: [], error };
}

function createSuccessResult(results: WebSearchResult[]): WebResearchResult {
  return { success: true, results, error: null };
}

// ============================================================================
// Web Research Service Class
// ============================================================================

export class WebResearchService {
  /**
   * Performs a web search using the configured provider.
   */
  async search(
    settings: WebResearchSettings,
    query: string,
    options?: {
      maxResults?: number;
      searchDepth?: 'basic' | 'advanced';
      includeAnswer?: boolean;
    }
  ): Promise<WebResearchResult> {
    if (!settings.enabled) {
      return createErrorResult({
        code: WebResearchErrorCodes.NOT_CONFIGURED,
        message: 'Web research is not enabled',
      });
    }

    if (!settings.provider) {
      return createErrorResult({
        code: WebResearchErrorCodes.INVALID_PROVIDER,
        message: 'No web research provider selected',
      });
    }

    const config = WEB_RESEARCH_PROVIDER_CONFIG[settings.provider];

    if (config.requiresApiKey && !settings.apiKey) {
      return createErrorResult({
        code: WebResearchErrorCodes.API_KEY_REQUIRED,
        message: `API key required for ${config.name}`,
      });
    }

    if (config.requiresBaseUrl && !settings.baseUrl) {
      return createErrorResult({
        code: WebResearchErrorCodes.BASE_URL_REQUIRED,
        message: `Base URL required for ${config.name}`,
      });
    }

    const maxResults = options?.maxResults ?? 5;

    try {
      switch (settings.provider) {
        case WebResearchProvider.TAVILY:
          return await this.searchTavily(settings.apiKey!, query, maxResults, options?.searchDepth);
        case WebResearchProvider.EXA:
          return await this.searchExa(settings.apiKey!, query, maxResults);
        case WebResearchProvider.FIRECRAWL:
          return await this.searchFirecrawl(settings.apiKey!, query, maxResults);
        case WebResearchProvider.BRAVE:
          return await this.searchBrave(settings.apiKey!, query, maxResults);
        case WebResearchProvider.SEARXNG:
          return await this.searchSearXNG(settings.baseUrl!, query, maxResults);
        default:
          return createErrorResult({
            code: WebResearchErrorCodes.INVALID_PROVIDER,
            message: `Unknown provider: ${settings.provider}`,
          });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      console.error('Web Research Error:', err);

      if (message.toLowerCase().includes('rate limit') || message.includes('429')) {
        return createErrorResult({
          code: WebResearchErrorCodes.RATE_LIMITED,
          message: 'Rate limited by the provider. Please try again later.',
        });
      }

      return createErrorResult({
        code: WebResearchErrorCodes.SEARCH_FAILED,
        message,
      });
    }
  }

  /**
   * Search using Tavily API
   * @see https://docs.tavily.com/docs/rest-api/api-reference
   */
  private async searchTavily(
    apiKey: string,
    query: string,
    maxResults: number,
    searchDepth?: 'basic' | 'advanced'
  ): Promise<WebResearchResult> {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: searchDepth || 'basic',
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    const results: WebSearchResult[] = (data.results || []).map((r: {
      title: string;
      url: string;
      content: string;
      score?: number;
    }) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
    }));

    return createSuccessResult(results);
  }

  /**
   * Search using Exa API
   * @see https://docs.exa.ai/reference/search
   */
  private async searchExa(
    apiKey: string,
    query: string,
    maxResults: number
  ): Promise<WebResearchResult> {
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query,
        numResults: maxResults,
        useAutoprompt: true,
        contents: {
          text: {
            maxCharacters: 1000,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Exa API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    const results: WebSearchResult[] = (data.results || []).map((r: {
      title: string;
      url: string;
      text?: string;
      score?: number;
    }) => ({
      title: r.title,
      url: r.url,
      content: r.text || '',
      score: r.score,
    }));

    return createSuccessResult(results);
  }

  /**
   * Search using Firecrawl API
   * @see https://docs.firecrawl.dev/features/search
   */
  private async searchFirecrawl(
    apiKey: string,
    query: string,
    maxResults: number
  ): Promise<WebResearchResult> {
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        limit: maxResults,
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Firecrawl returns results in data array with scraped content
    const results: WebSearchResult[] = (data.data || []).map((r: {
      title?: string;
      url: string;
      markdown?: string;
      description?: string;
    }) => ({
      title: r.title || r.url,
      url: r.url,
      content: r.markdown || r.description || '',
    }));

    return createSuccessResult(results);
  }

  /**
   * Search using Brave Search API
   * @see https://api.search.brave.com/app/documentation/web-search/get-started
   */
  private async searchBrave(
    apiKey: string,
    query: string,
    maxResults: number
  ): Promise<WebResearchResult> {
    const params = new URLSearchParams({
      q: query,
      count: String(maxResults),
    });

    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brave Search API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Brave returns web results in data.web.results
    const webResults = data.web?.results || [];
    const results: WebSearchResult[] = webResults.map((r: {
      title: string;
      url: string;
      description?: string;
    }) => ({
      title: r.title,
      url: r.url,
      content: r.description || '',
    }));

    return createSuccessResult(results);
  }

  /**
   * Search using SearXNG (self-hosted)
   * @see https://docs.searxng.org/dev/search_api.html
   */
  private async searchSearXNG(
    baseUrl: string,
    query: string,
    maxResults: number
  ): Promise<WebResearchResult> {
    // Normalize base URL (remove trailing slash)
    const normalizedUrl = baseUrl.replace(/\/+$/, '');
    
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      pageno: '1',
    });

    const response = await fetch(`${normalizedUrl}/search?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SearXNG API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // SearXNG returns results in data.results array
    const searxResults = (data.results || []).slice(0, maxResults);
    const results: WebSearchResult[] = searxResults.map((r: {
      title: string;
      url: string;
      content?: string;
      score?: number;
    }) => ({
      title: r.title,
      url: r.url,
      content: r.content || '',
      score: r.score,
    }));

    return createSuccessResult(results);
  }

  /**
   * Formats search results into a context string for LLM prompts.
   */
  formatResultsForPrompt(results: WebSearchResult[]): string {
    if (results.length === 0) {
      return '';
    }

    const formattedResults = results.map((r, i) => {
      return `[${i + 1}] ${r.title}
URL: ${r.url}
${r.content}`;
    }).join('\n\n');

    return `## Web Research Results

The following information was gathered from live web search to provide current and accurate context:

${formattedResults}

---
Use the above research to inform your response with accurate, up-to-date information.`;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createWebResearchService(): WebResearchService {
  return new WebResearchService();
}
