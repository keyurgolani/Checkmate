import { WebResearchProvider } from './pocketbase-types';

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
