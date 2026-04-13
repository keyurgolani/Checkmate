/**
 * LLM Service
 * 
 * Provides functionality for AI-powered template generation using various LLM providers.
 * Supports Ollama, OpenAI, Anthropic, Gemini, OpenRouter, and Perplexity.
 * 
 * Optionally integrates with web research providers (Tavily, Exa) to enhance
 * AI responses with live internet search results.
 */

import { streamText, type LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LLMProvider, LLMModel, LLMSettings, ResourceLink, TemplateQuestion, ItemCondition } from '../pocketbase-types';
import type { RequestSpec } from '@/lib/relay-utils';
import { createWebResearchService, type WebSearchResult, WEB_RESEARCH_PROVIDER_CONFIG } from './web-research';
import { type Result, ok, err } from '../result';

// ============================================================================
// Types
// ============================================================================

export interface GeneratedTemplateItem {
  content: string;
  description?: string;
  resources?: ResourceLink[];
  conditions?: ItemCondition[];
  children?: GeneratedTemplateItem[];
  itemType?: 'task' | 'phase';
}

export interface GeneratedTemplate {
  title: string;
  description: string;
  questions?: TemplateQuestion[];
  items: GeneratedTemplateItem[];
  resources?: ResourceLink[];
}

export interface TemplateImprovements {
  title?: string;
  description?: string;
  suggestedItems: GeneratedTemplateItem[];
  resources?: ResourceLink[];
  reasoning: string;
}

export interface StepImprovement {
  content: string;
  description: string;
  resources?: ResourceLink[];
  suggestedSubSteps?: Array<{ content: string; description?: string }>;
  reasoning: string;
}

export interface EnhancedItem {
  id: string;
  content: string;
  description: string;
  resources: ResourceLink[];
}

export interface TemplateEnhancement {
  title?: string;
  description?: string;
  enhancedItems: EnhancedItem[];
  newItems?: GeneratedTemplateItem[];
  templateResources?: ResourceLink[];
  reasoning: string;
}

export type LLMResult<T> = Result<T, LLMError>;

export interface LLMError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Error Codes
// ============================================================================

export const LLMErrorCodes = {
  PROVIDER_NOT_CONFIGURED: 'LLM_001',
  API_KEY_REQUIRED: 'LLM_002',
  MODEL_NOT_SELECTED: 'LLM_003',
  FETCH_MODELS_FAILED: 'LLM_004',
  GENERATION_FAILED: 'LLM_005',
  INVALID_RESPONSE: 'LLM_006',
  RATE_LIMITED: 'LLM_007',
  INVALID_SETTINGS: 'LLM_008',
  UNKNOWN_ERROR: 'LLM_999',
} as const;

// ============================================================================
// Provider Configuration
// ============================================================================

const PROVIDER_CONFIG: Record<LLMProvider, { name: string; requiresApiKey: boolean; baseUrl?: string }> = {
  ollama: { name: 'Ollama', requiresApiKey: false, baseUrl: 'http://localhost:11434' },
  openai: { name: 'OpenAI', requiresApiKey: true },
  anthropic: { name: 'Anthropic', requiresApiKey: true },
  gemini: { name: 'Google Gemini', requiresApiKey: true },
  openrouter: { name: 'OpenRouter', requiresApiKey: true, baseUrl: 'https://openrouter.ai/api/v1' },
  perplexity: { name: 'Perplexity', requiresApiKey: true, baseUrl: 'https://api.perplexity.ai' },
  groq: { name: 'Groq', requiresApiKey: true, baseUrl: 'https://api.groq.com/openai/v1' },
  mistral: { name: 'Mistral AI', requiresApiKey: true, baseUrl: 'https://api.mistral.ai/v1' },
  deepseek: { name: 'DeepSeek', requiresApiKey: true, baseUrl: 'https://api.deepseek.com' },
  xai: { name: 'xAI (Grok)', requiresApiKey: true, baseUrl: 'https://api.x.ai/v1' },
  'openai-compatible': { name: 'OpenAI Compatible', requiresApiKey: false, baseUrl: '' },
};

// ============================================================================
// Helper Functions
// ============================================================================

function getProviderClient(settings: LLMSettings): (modelId: string) => LanguageModel {
  const { provider, apiKey, baseUrl } = settings;
  
  if (!provider) {
    throw new Error('Provider not configured');
  }

  switch (provider) {
    case 'ollama':
      // Use OpenAI-compatible endpoint for Ollama (supports AI SDK v2 spec)
      return createOpenAICompatible({
        name: 'ollama',
        baseURL: `${baseUrl || 'http://localhost:11434'}/v1`,
        apiKey: 'ollama', // Ollama doesn't require a real API key
      }) as unknown as (modelId: string) => LanguageModel;
    case 'openai':
      return createOpenAI({ apiKey: apiKey || '' }) as unknown as (modelId: string) => LanguageModel;
    case 'anthropic':
      return createAnthropic({ apiKey: apiKey || '' }) as unknown as (modelId: string) => LanguageModel;
    case 'gemini':
      return createGoogleGenerativeAI({ apiKey: apiKey || '' }) as unknown as (modelId: string) => LanguageModel;
    case 'openrouter':
      return createOpenAICompatible({
        name: 'openrouter',
        baseURL: 'https://openrouter.ai/api/v1',
        headers: { 'HTTP-Referer': 'https://checkmate.app', 'X-Title': 'CheckMate' },
        apiKey: apiKey || '',
      }) as unknown as (modelId: string) => LanguageModel;
    case 'perplexity':
      return createOpenAICompatible({
        name: 'perplexity',
        baseURL: 'https://api.perplexity.ai',
        apiKey: apiKey || '',
      }) as unknown as (modelId: string) => LanguageModel;
    case 'groq':
      return createOpenAICompatible({
        name: 'groq',
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: apiKey || '',
      }) as unknown as (modelId: string) => LanguageModel;
    case 'mistral':
      return createOpenAICompatible({
        name: 'mistral',
        baseURL: 'https://api.mistral.ai/v1',
        apiKey: apiKey || '',
      }) as unknown as (modelId: string) => LanguageModel;
    case 'deepseek':
      return createOpenAICompatible({
        name: 'deepseek',
        baseURL: 'https://api.deepseek.com',
        apiKey: apiKey || '',
      }) as unknown as (modelId: string) => LanguageModel;
    case 'xai':
      return createOpenAICompatible({
        name: 'xai',
        baseURL: 'https://api.x.ai/v1',
        apiKey: apiKey || '',
      }) as unknown as (modelId: string) => LanguageModel;
    case 'openai-compatible':
      if (!baseUrl) throw new Error('Base URL required for OpenAI Compatible provider');
      return createOpenAICompatible({
        name: 'openai-compatible',
        baseURL: baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`,
        apiKey: apiKey || 'not-required',
      }) as unknown as (modelId: string) => LanguageModel;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ============================================================================
// LLM Service Class
// ============================================================================

export class LLMService {
  private webResearchService = createWebResearchService();

  /**
   * Performs web research if enabled and returns formatted context.
   * Returns empty string if web research is not enabled or fails.
   */
  private async getWebResearchContext(settings: LLMSettings, query: string): Promise<string> {
    const webResearch = settings.webResearch;
    
    // Skip if web research is not enabled or if using Perplexity (has built-in search)
    if (!webResearch?.enabled || settings.provider === 'perplexity') {
      return '';
    }

    if (!webResearch.provider) {
      return '';
    }

    const webConfig = WEB_RESEARCH_PROVIDER_CONFIG[webResearch.provider];
    if (webConfig.requiresApiKey && !webResearch.apiKey) {
      return '';
    }
    if (webConfig.requiresBaseUrl && !webResearch.baseUrl) {
      return '';
    }

    try {
      const result = await this.webResearchService.search(webResearch, query, {
        maxResults: 5,
        searchDepth: 'basic',
      });

      if (result.success && result.data.length > 0) {
        return this.webResearchService.formatResultsForPrompt(result.data);
      }
    } catch (caught) {
      console.warn('Web research failed, continuing without:', caught);
    }

    return '';
  }

  // ==========================================================================
  // Public prompt builders, response parsers, and request spec builders
  // ==========================================================================

  /**
   * Parses an SSE (Server-Sent Events) stream response into concatenated text content.
   */
  parseSSEStream(rawText: string): string {
    if (!rawText) return '';
    const lines = rawText.split('\n');
    const parts: string[] = [];
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') break;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) parts.push(content);
      } catch {
        // Skip malformed lines
      }
    }
    return parts.join('');
  }

  /**
   * Builds prompts for generating a new template.
   */
  buildGeneratePrompts(query: string, searchContext: string): { system: string; user: string } {
    const system = `You are a checklist template generator. Given a user query, generate a comprehensive checklist template in JSON format.

The response MUST be valid JSON with this exact structure:
{
  "title": "Template title",
  "description": "A comprehensive description of what this checklist is for, written in **markdown format**. Include the purpose, who it's for, and what they'll accomplish.",
  "questions": [
    {
      "id": "unique_question_id",
      "question": "Question text shown to user when creating a checklist",
      "answerType": "boolean",
      "defaultValue": true
    },
    {
      "id": "another_question_id",
      "question": "What type of X are you doing?",
      "answerType": "enum",
      "enumOptions": ["Option A", "Option B", "Option C"],
      "defaultValue": "Option A"
    }
  ],
  "items": [
    {
      "itemType": "phase",
      "content": "Planning Phase",
      "description": "Initial planning and preparation steps",
      "children": [
        {
          "itemType": "task",
          "content": "Step or task name",
          "description": "REQUIRED: Detailed description in **markdown format** explaining how to complete this step. Use formatting like:\\n- **Bold** for emphasis\\n- Bullet points for lists\\n- \`code\` for commands or technical terms\\n- [Links](url) for references\\n\\nInclude specific actionable instructions, tips, and warnings.",
          "resources": [
            {
              "title": "Helpful guide",
              "url": "https://example.com/guide",
              "description": "Why this resource is useful"
            }
          ],
          "conditions": [
            {
              "questionId": "unique_question_id",
              "operator": "equals",
              "value": true
            }
          ]
        }
      ]
    },
    {
      "itemType": "phase",
      "content": "Execution Phase",
      "description": "Main execution steps",
      "children": [
        {
          "itemType": "task",
          "content": "Sub-step name",
          "description": "REQUIRED: Markdown description with specific instructions",
          "resources": [
            {
              "title": "Sub-step resource",
              "url": "https://example.com",
              "description": "Resource description"
            }
          ],
          "conditions": [
            {
              "questionId": "another_question_id",
              "operator": "equals",
              "value": "Option A"
            }
          ]
        }
      ]
    }
  ],
  "resources": [
    {
      "title": "Resource name",
      "url": "https://example.com",
      "description": "Description of why this resource is helpful for the overall template"
    }
  ]
}

## CRITICAL REQUIREMENTS

1. **EVERY item MUST have a description** - No exceptions. Each step needs detailed, actionable instructions.
2. **EVERY task item SHOULD have at least one resource** - Include relevant documentation, tools, guides, or tutorials.
3. **Template MUST have a description** - Explain the purpose and scope of the checklist.
4. **Template SHOULD have resources** - Include 2-5 general resources helpful for the overall task.

## ITEM TYPES

There are two item types:
- **task**: A regular checklist item that can be checked off. Tasks should have descriptions and resources.
- **phase**: A section header that groups related tasks together. Phases are collapsible containers.

### When to use phases:
- Use phases to organize complex checklists into logical sections (e.g., "Planning", "Execution", "Review")
- Phases help users understand the overall structure and progress through the checklist
- Each phase should contain related tasks as children
- Phases can have descriptions but do NOT need resources
- For simple checklists (under 5 items), phases may not be necessary

### Phase structure:
- Phases have \`"itemType": "phase"\` and contain tasks in their \`"children"\` array
- Tasks within phases have \`"itemType": "task"\` (or can omit itemType, defaulting to task)
- Tasks can also have their own children for sub-tasks

## CONDITIONAL QUESTIONS FEATURE

Questions allow users to customize the checklist when they create it. Use questions to:
- Include/exclude optional sections (boolean questions)
- Customize steps based on user's situation (enum questions)

Examples of good questions:
- "Are you hiring movers?" (boolean) - to show/hide moving company related steps
- "What's your budget level?" (enum: "Budget", "Mid-range", "Premium") - to show appropriate options
- "Is this your first time?" (boolean) - to include/exclude beginner guidance
- "What platform are you using?" (enum: "Windows", "macOS", "Linux") - for platform-specific steps

## CONDITIONS ON ITEMS

Items can have conditions that reference questions. An item is only shown if ALL its conditions are met.
- Use \`"operator": "equals"\` to show item when answer matches value
- Use \`"operator": "notEquals"\` to show item when answer doesn't match value

## DESCRIPTION GUIDELINES

Write descriptions in **markdown format** with:
- **Bullet points** for multiple steps, options, or items to consider
- **Bold text** for important terms, warnings, or key actions
- \`Code formatting\` for commands, file names, paths, or technical terms
- **Numbered lists** for sequential steps within a description
- Helpful tips, warnings, or best practices where relevant
- Specific quantities, timeframes, or measurements when applicable

Example of a GOOD description:
"**Research your options** before making a decision:\\n\\n- Get at least **3 quotes** from different providers\\n- Check online reviews on sites like Yelp and Google\\n- Ask friends and family for recommendations\\n- Verify licensing and insurance\\n\\n**Tip:** Create a comparison spreadsheet to track pricing and services."

## RESOURCE GUIDELINES

Include resources that are:
- **Relevant** to the specific step or overall template
- **Actionable** - tools, guides, calculators, or checklists
- **Authoritative** - from reputable sources
- **Diverse** - mix of articles, tools, videos, and official documentation

Example resources:
- Official documentation or guides
- Popular tools or apps for the task
- Tutorial videos or courses
- Community forums or support pages
- Calculators or planning tools

## GENERAL GUIDELINES

1. **Questions**: Create 2-5 relevant questions that genuinely affect which steps are needed
2. **Items**: Create 8-15 main items depending on complexity
3. **Conditions**: Apply conditions to items that are only relevant for certain answers
4. **Children**: Use nested children for sub-steps (max 2 levels deep)
5. **Order**: Arrange items logically (sequential or by priority)

IMPORTANT: Return ONLY the JSON object, no markdown code blocks, no explanation, just pure JSON.`;

    let user = `Create a checklist template for: ${query}`;
    if (searchContext) {
      user = `${searchContext}\n\n${user}`;
    }

    return { system, user };
  }

  /**
   * Builds prompts for improving an existing template.
   */
  buildImproveTemplatePrompts(
    template: { title: string; description: string | null; items: Array<{ content: string; description?: string | null }> },
    searchContext: string
  ): { system: string; user: string } {
    const existingItems = template.items.map((item, i) => `${i + 1}. ${item.content}${item.description ? ` - ${item.description}` : ''}`).join('\n');

    const system = `You are a checklist improvement expert. Analyze the given template and suggest improvements.

The response MUST be valid JSON with this exact structure:
{
  "title": "Improved title (or null if no change needed)",
  "description": "Improved description (or null if no change needed)",
  "suggestedItems": [
    {
      "itemType": "task",
      "content": "New step to add",
      "description": "Detailed instructions in **markdown format**. Use:\\n- Bullet points for steps\\n- **Bold** for emphasis\\n- \`code\` for technical terms"
    },
    {
      "itemType": "phase",
      "content": "New Phase Name",
      "description": "Description of what this phase covers",
      "children": [
        {
          "itemType": "task",
          "content": "Task within the phase",
          "description": "Task description"
        }
      ]
    }
  ],
  "resources": [
    {
      "title": "Helpful resource",
      "url": "https://example.com",
      "description": "Why this resource is useful"
    }
  ],
  "reasoning": "Brief explanation of the improvements suggested"
}

## ITEM TYPES

- **task**: A regular checklist item (default if itemType is omitted)
- **phase**: A section header that groups related tasks together

### When to suggest phases:
- Suggest phases when the existing checklist would benefit from better organization
- Use phases to group related items into logical sections
- Phases help users understand the overall structure and track progress
- Phases have descriptions but do NOT need resources

Guidelines:
- Identify missing steps that would make the checklist more complete
- Suggest 3-7 additional items that are genuinely useful
- Consider suggesting phases to better organize existing items if the checklist lacks structure
- Don't duplicate existing items
- **Write descriptions in markdown format** for clarity
- Focus on actionable, specific improvements
- Include helpful resources if relevant
- Keep the reasoning concise

IMPORTANT: Return ONLY the JSON object, no markdown code blocks, no explanation, just pure JSON.`;

    let user = `Improve this checklist template:

Title: ${template.title}
Description: ${template.description || 'No description'}

Current Steps:
${existingItems}

Suggest improvements and additional steps that would make this checklist more comprehensive.`;

    if (searchContext) {
      user = `${searchContext}\n\n${user}`;
    }

    return { system, user };
  }

  /**
   * Builds prompts for improving a single step.
   */
  buildImproveStepPrompts(
    step: { content: string; description?: string | null; resources?: ResourceLink[] | null },
    templateContext: {
      title: string;
      description: string | null;
      resources?: ResourceLink[] | null;
      allSteps: Array<{ content: string; description?: string | null }>;
      currentStepIndex: number;
    },
    searchContext: string
  ): { system: string; user: string } {
    const { allSteps, currentStepIndex } = templateContext;
    const totalSteps = allSteps.length;

    // Get previous steps (up to 3)
    const previousSteps = allSteps
      .slice(Math.max(0, currentStepIndex - 3), currentStepIndex)
      .map((s, i) => `${currentStepIndex - (currentStepIndex - Math.max(0, currentStepIndex - 3)) + i + 1}. ${s.content}`)
      .join('\n');

    // Get next steps (up to 3)
    const nextSteps = allSteps
      .slice(currentStepIndex + 1, currentStepIndex + 4)
      .map((s, i) => `${currentStepIndex + 2 + i}. ${s.content}`)
      .join('\n');

    // Build template resources context
    const templateResourcesContext = templateContext.resources && templateContext.resources.length > 0
      ? `\nTemplate Resources:\n${templateContext.resources.map(r => `- ${r.title}: ${r.url}`).join('\n')}`
      : '';

    // Build current step resources context
    const stepResourcesContext = step.resources && step.resources.length > 0
      ? `\n- Current Resources: ${step.resources.map(r => r.title).join(', ')}`
      : '';

    const system = `You are a checklist step improvement expert. Analyze the given step in context of the entire checklist and suggest improvements.

The response MUST be valid JSON with this exact structure:
{
  "content": "Improved step title/content",
  "description": "Detailed, actionable instructions in **markdown format**. Include:\\n- Step-by-step bullet points\\n- **Bold** for important terms\\n- \`code\` for commands or file names\\n- Tips or warnings where helpful",
  "resources": [
    {
      "title": "Helpful resource",
      "url": "https://example.com",
      "description": "Why this resource helps"
    }
  ],
  "suggestedSubSteps": [
    {
      "content": "Sub-step name",
      "description": "Brief markdown description"
    }
  ],
  "reasoning": "Brief explanation of the improvements"
}

Guidelines:
- Make the step content clear and actionable
- **Consider the context**: Look at what comes before and after this step to ensure logical flow
- **Write the description in markdown format** with:
  - Numbered or bullet lists for sequential steps
  - **Bold** for key terms or warnings
  - \`code\` for commands, paths, or technical terms
  - Clear, concise language
- Break down complex steps into sub-steps if beneficial
- Include relevant resources (documentation, tools, guides)
- Keep improvements practical and specific to the context
- Ensure the improved step fits well with the surrounding steps

IMPORTANT: Return ONLY the JSON object, no markdown code blocks, no explanation, just pure JSON.`;

    let user = `Improve this checklist step:

Template Context:
- Title: ${templateContext.title}
- Description: ${templateContext.description || 'No description'}${templateResourcesContext}
- Total Steps: ${totalSteps}

${previousSteps ? `Previous Steps:\n${previousSteps}\n` : ''}
>>> STEP TO IMPROVE (Step ${currentStepIndex + 1} of ${totalSteps}) <<<
- Content: ${step.content}
- Current Description: ${step.description || 'No description'}${stepResourcesContext}

${nextSteps ? `\nNext Steps:\n${nextSteps}` : ''}

Suggest improvements to make this step clearer, more actionable, and more helpful. Consider how it fits with the steps before and after it.`;

    if (searchContext) {
      user = `${searchContext}\n\n${user}`;
    }

    return { system, user };
  }

  /**
   * Builds prompts for enhancing an entire template.
   */
  buildEnhancePrompts(
    template: {
      title: string;
      description: string | null;
      items: Array<{ id: string; content: string; description?: string | null; resources?: ResourceLink[] | null; itemType?: 'task' | 'reference' | 'phase' | null }>;
    },
    searchContext: string
  ): { system: string; user: string } {
    const existingItems = template.items.map((item, i) => {
      const itemType = item.itemType || 'task';
      let itemStr = `${i + 1}. [ID: ${item.id}] [Type: ${itemType}] ${item.content}`;
      if (item.description) {
        itemStr += `\n   Description: ${item.description}`;
      }
      if (item.resources && item.resources.length > 0) {
        itemStr += `\n   Resources: ${item.resources.map(r => r.title).join(', ')}`;
      }
      return itemStr;
    }).join('\n\n');

    const system = `You are a checklist enhancement expert. Your task is to IMPROVE ALL existing steps in a template by adding or improving their descriptions and resources.

The response MUST be valid JSON with this exact structure:
{
  "title": "Improved title (or null if current is good)",
  "description": "Improved template description in **markdown format** (or null if current is good)",
  "enhancedItems": [
    {
      "id": "original_item_id",
      "content": "Improved step title (keep similar if already good)",
      "description": "Detailed, actionable instructions in **markdown format**. Include:\\n- Step-by-step bullet points\\n- **Bold** for important terms\\n- \`code\` for commands or file names\\n- Tips or warnings where helpful",
      "resources": [
        {
          "title": "Helpful resource",
          "url": "https://example.com",
          "description": "Why this resource helps"
        }
      ]
    }
  ],
  "newItems": [
    {
      "itemType": "task",
      "content": "New step to add",
      "description": "Detailed instructions in **markdown format**",
      "resources": [
        {
          "title": "Resource name",
          "url": "https://example.com",
          "description": "Resource description"
        }
      ]
    }
  ],
  "templateResources": [
    {
      "title": "General resource for the template",
      "url": "https://example.com",
      "description": "Why this resource is helpful overall"
    }
  ],
  "reasoning": "Brief explanation of the enhancements made"
}

## CRITICAL REQUIREMENTS

1. **ENHANCE ALL ITEMS**: You MUST provide an enhanced version for EVERY item in the input. Use the exact same ID from the input.
2. **EVERY task item MUST have a description**: No exceptions. Each step needs detailed, actionable instructions.
3. **EVERY task item MUST have at least one resource**: Include relevant documentation, tools, guides, or tutorials.
4. **Preserve item IDs**: The "id" field in enhancedItems MUST match the original item IDs exactly.

## HANDLING PHASES

- **Phase items** (itemType: "phase") are section headers that group related tasks
- Phases should be preserved and can be enhanced with better names/descriptions
- Phases do NOT need resources - they are organizational containers
- When enhancing a phase, focus on improving its content (name) and description
- Do not add resources to phase items

## DESCRIPTION GUIDELINES

Write descriptions in **markdown format** with:
- **Bullet points** for multiple steps, options, or items to consider
- **Bold text** for important terms, warnings, or key actions
- \`Code formatting\` for commands, file names, paths, or technical terms
- **Numbered lists** for sequential steps within a description
- Helpful tips, warnings, or best practices where relevant
- Specific quantities, timeframes, or measurements when applicable

Example of a GOOD description:
"**Research your options** before making a decision:\\n\\n- Get at least **3 quotes** from different providers\\n- Check online reviews on sites like Yelp and Google\\n- Ask friends and family for recommendations\\n- Verify licensing and insurance\\n\\n**Tip:** Create a comparison spreadsheet to track pricing and services."

## RESOURCE GUIDELINES

Include resources that are:
- **Relevant** to the specific step
- **Actionable** - tools, guides, calculators, or checklists
- **Authoritative** - from reputable sources
- **Real URLs** - use actual, working URLs from well-known sites

Example resources:
- Official documentation or guides
- Popular tools or apps for the task
- Tutorial videos or courses
- Community forums or support pages
- Calculators or planning tools

## GENERAL GUIDELINES

1. **Improve, don't replace**: Keep the essence of each step but make it clearer and more actionable
2. **Add value**: If a step already has a good description, make it even better
3. **Be specific**: Generic advice is not helpful - provide concrete, actionable guidance
4. **newItems**: Only suggest 2-5 new items if there are obvious gaps in the checklist (can include phases)
5. **templateResources**: Suggest 2-4 general resources helpful for the overall template

IMPORTANT: Return ONLY the JSON object, no markdown code blocks, no explanation, just pure JSON.`;

    let user = `Enhance this checklist template by improving ALL existing steps with better descriptions and resources:

Title: ${template.title}
Description: ${template.description || 'No description'}

Current Steps:
${existingItems}

Provide enhanced versions of ALL ${template.items.length} steps with detailed descriptions and helpful resources.`;

    if (searchContext) {
      user = `${searchContext}\n\n${user}`;
    }

    return { system, user };
  }

  /**
   * Builds a simple prompt with no system message.
   */
  buildTextPrompt(prompt: string): { system: string; user: string } {
    return { system: '', user: prompt };
  }

  /**
   * Parses an LLM response, extracting JSON and validating structure based on operation type.
   */
  parseLLMResponse(operation: string, responseText: string): LLMResult<any> {
    try {
      if (operation === 'text') {
        return ok(responseText);
      }

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return err({
          code: LLMErrorCodes.INVALID_RESPONSE,
          message: 'No JSON found in response',
          details: { rawResponse: responseText.substring(0, 500) },
        });
      }
      const parsed = JSON.parse(jsonMatch[0]);

      switch (operation) {
        case 'generate':
          if (!parsed.title || !parsed.items || !Array.isArray(parsed.items)) {
            return err({ code: LLMErrorCodes.INVALID_RESPONSE, message: 'Invalid template structure' });
          }
          if (parsed.questions && !Array.isArray(parsed.questions)) {
            return err({ code: LLMErrorCodes.INVALID_RESPONSE, message: 'Invalid questions structure' });
          }
          break;
        case 'improve-template':
          if (!parsed.suggestedItems || !Array.isArray(parsed.suggestedItems)) {
            return err({ code: LLMErrorCodes.INVALID_RESPONSE, message: 'Invalid improvement structure' });
          }
          break;
        case 'improve-step':
          if (!parsed.content || !parsed.description) {
            return err({ code: LLMErrorCodes.INVALID_RESPONSE, message: 'Invalid step improvement structure' });
          }
          break;
        case 'enhance':
          if (!parsed.enhancedItems || !Array.isArray(parsed.enhancedItems)) {
            return err({ code: LLMErrorCodes.INVALID_RESPONSE, message: 'Invalid enhancement structure' });
          }
          if (parsed.enhancedItems.some((item: any) => !item.id)) {
            return err({ code: LLMErrorCodes.INVALID_RESPONSE, message: 'Some enhanced items are missing IDs' });
          }
          break;
      }

      return ok(parsed);
    } catch {
      return err({
        code: LLMErrorCodes.INVALID_RESPONSE,
        message: 'Failed to parse LLM response as JSON',
        details: { rawResponse: responseText.substring(0, 500) },
      });
    }
  }

  /**
   * Parses a model fetch response from a provider.
   */
  parseModelFetchResponse(provider: string, responseText: string): LLMResult<LLMModel[]> {
    try {
      const data = JSON.parse(responseText);
      let models: LLMModel[] = [];

      if (provider === 'ollama') {
        models = (data.models || []).map((m: { name: string }) => ({
          id: m.name, name: m.name, provider: provider as LLMProvider,
        }));
      } else {
        // OpenAI-compatible format
        models = (data.data || []).map((m: { id: string; name?: string }) => ({
          id: m.id, name: m.name || m.id, provider: provider as LLMProvider,
        })).sort((a: LLMModel, b: LLMModel) => a.id.localeCompare(b.id));
      }

      return ok(models);
    } catch {
      return err({
        code: LLMErrorCodes.FETCH_MODELS_FAILED,
        message: 'Failed to parse model list response',
      });
    }
  }

  /**
   * Builds a request spec for fetching models from a provider.
   */
  buildModelFetchSpec(settings: LLMSettings): RequestSpec {
    const { provider, apiKey, baseUrl } = settings;
    if (provider === 'ollama') {
      const ollamaUrl = (baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
      return { url: `${ollamaUrl}/api/tags`, method: 'GET', headers: {}, responseHandling: 'json' };
    }
    // openai-compatible
    const normalizedUrl = (baseUrl || '').replace(/\/+$/, '');
    const modelsUrl = normalizedUrl.endsWith('/v1') ? `${normalizedUrl}/models` : `${normalizedUrl}/v1/models`;
    const headers: Record<string, string> = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    return { url: modelsUrl, method: 'GET', headers, responseHandling: 'json' };
  }

  /**
   * Builds a request spec for making an LLM chat completion request.
   */
  buildLLMRequestSpec(settings: LLMSettings, systemPrompt: string, userPrompt: string): RequestSpec {
    const { provider, apiKey, baseUrl, selectedModel } = settings;
    let llmBaseUrl: string;
    if (provider === 'ollama') {
      llmBaseUrl = (baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
    } else {
      llmBaseUrl = (baseUrl || '').replace(/\/+$/, '');
    }
    const chatUrl = llmBaseUrl.endsWith('/v1')
      ? `${llmBaseUrl}/chat/completions`
      : `${llmBaseUrl}/v1/chat/completions`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey && provider !== 'ollama') headers['Authorization'] = `Bearer ${apiKey}`;

    const body = JSON.stringify({
      model: selectedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
    });

    return { url: chatUrl, method: 'POST', headers, body, responseHandling: 'stream-collect' };
  }

  /**
   * Generates plain text from a prompt (for summaries, etc.)
   */
  async generateText(settings: LLMSettings, prompt: string): Promise<LLMResult<string>> {
    try {
      const { provider, selectedModel } = settings;
      
      if (!provider || !selectedModel) {
        return err({
          code: LLMErrorCodes.INVALID_SETTINGS,
          message: 'LLM provider and model must be configured',
        });
      }

      const providerClient = getProviderClient(settings);
      const model = providerClient(selectedModel);

      const result = streamText({
        model,
        prompt,
      });
      const text = await result.text;

      return ok(text);
    } catch (error) {
      console.error('Text generation error:', error);
      return err({
        code: LLMErrorCodes.GENERATION_FAILED,
        message: error instanceof Error ? error.message : 'Failed to generate text',
      });
    }
  }

  /**
   * Fetches available models from the configured provider.
   */
  async fetchModels(settings: LLMSettings): Promise<LLMResult<LLMModel[]>> {
    try {
      const { provider, apiKey, baseUrl } = settings;

      if (!provider) {
        return err({
          code: LLMErrorCodes.PROVIDER_NOT_CONFIGURED,
          message: 'LLM provider not configured',
        });
      }

      const config = PROVIDER_CONFIG[provider];
      if (config.requiresApiKey && !apiKey) {
        return err({
          code: LLMErrorCodes.API_KEY_REQUIRED,
          message: `API key required for ${config.name}`,
        });
      }

      let models: LLMModel[] = [];

      switch (provider) {
        case 'ollama': {
          const ollamaUrl = (baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
          const response = await fetch(`${ollamaUrl}/api/tags`);
          if (!response.ok) throw new Error('Failed to fetch Ollama models');
          const data = await response.json();
          models = (data.models || []).map((m: { name: string }) => ({
            id: m.name,
            name: m.name,
            provider,
          }));
          break;
        }
        case 'openai': {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!response.ok) throw new Error('Failed to fetch OpenAI models');
          const data = await response.json();
          models = (data.data || [])
            .filter((m: { id: string }) => m.id.startsWith('gpt') || m.id.startsWith('o1') || m.id.startsWith('o3'))
            .map((m: { id: string }) => ({ id: m.id, name: m.id, provider }))
            .sort((a: LLMModel, b: LLMModel) => a.id.localeCompare(b.id));
          break;
        }
        case 'anthropic': {
          // Anthropic has a models list endpoint
          const response = await fetch('https://api.anthropic.com/v1/models', {
            headers: {
              'x-api-key': apiKey || '',
              'anthropic-version': '2023-06-01',
            },
          });
          if (!response.ok) {
            // Fallback to known models if API fails
            console.warn('Failed to fetch Anthropic models, using fallback list');
            models = [
              { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider },
              { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider },
              { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider },
              { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider },
            ];
          } else {
            const data = await response.json();
            models = (data.data || []).map((m: { id: string; display_name?: string }) => ({
              id: m.id,
              name: m.display_name || m.id,
              provider,
            }));
          }
          break;
        }
        case 'gemini': {
          // Google Gemini has a models list endpoint
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
          );
          if (!response.ok) {
            // Fallback to known models if API fails
            console.warn('Failed to fetch Gemini models, using fallback list');
            models = [
              { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider },
              { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider },
              { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider },
            ];
          } else {
            const data = await response.json();
            // Filter to only include models that support generateContent
            models = (data.models || [])
              .filter((m: { supportedGenerationMethods?: string[] }) => 
                m.supportedGenerationMethods?.includes('generateContent')
              )
              .map((m: { name: string; displayName?: string }) => ({
                // Model name comes as "models/gemini-2.0-flash" - extract just the model ID
                id: m.name.replace('models/', ''),
                name: m.displayName || m.name.replace('models/', ''),
                provider,
              }))
              // Sort to show newer models first (gemini-2.x before gemini-1.x)
              .sort((a: LLMModel, b: LLMModel) => b.id.localeCompare(a.id));
          }
          break;
        }
        case 'openrouter': {
          const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!response.ok) throw new Error('Failed to fetch OpenRouter models');
          const data = await response.json();
          models = (data.data || []).slice(0, 100).map((m: { id: string; name?: string }) => ({
            id: m.id,
            name: m.name || m.id,
            provider,
          }));
          break;
        }
        case 'perplexity': {
          // Perplexity doesn't have a public models endpoint, use known models
          models = [
            { id: 'sonar-pro', name: 'Sonar Pro', provider },
            { id: 'sonar', name: 'Sonar', provider },
            { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', provider },
            { id: 'sonar-reasoning', name: 'Sonar Reasoning', provider },
          ];
          break;
        }
        case 'groq': {
          // Groq has an OpenAI-compatible models endpoint
          const response = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!response.ok) {
            // Fallback to known models if API fails
            console.warn('Failed to fetch Groq models, using fallback list');
            models = [
              { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', provider },
              { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', provider },
              { id: 'llama3-70b-8192', name: 'Llama 3 70B', provider },
              { id: 'llama3-8b-8192', name: 'Llama 3 8B', provider },
              { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider },
              { id: 'gemma2-9b-it', name: 'Gemma 2 9B', provider },
            ];
          } else {
            const data = await response.json();
            models = (data.data || [])
              .filter((m: { id: string; active?: boolean }) => m.active !== false)
              .map((m: { id: string }) => ({ id: m.id, name: m.id, provider }))
              .sort((a: LLMModel, b: LLMModel) => a.id.localeCompare(b.id));
          }
          break;
        }
        case 'mistral': {
          // Mistral has a models endpoint
          const response = await fetch('https://api.mistral.ai/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!response.ok) {
            // Fallback to known models if API fails
            console.warn('Failed to fetch Mistral models, using fallback list');
            models = [
              { id: 'mistral-large-latest', name: 'Mistral Large', provider },
              { id: 'mistral-medium-latest', name: 'Mistral Medium', provider },
              { id: 'mistral-small-latest', name: 'Mistral Small', provider },
              { id: 'open-mixtral-8x22b', name: 'Mixtral 8x22B', provider },
              { id: 'open-mixtral-8x7b', name: 'Mixtral 8x7B', provider },
              { id: 'codestral-latest', name: 'Codestral', provider },
            ];
          } else {
            const data = await response.json();
            models = (data.data || [])
              .map((m: { id: string; name?: string }) => ({ 
                id: m.id, 
                name: m.name || m.id, 
                provider 
              }))
              .sort((a: LLMModel, b: LLMModel) => a.id.localeCompare(b.id));
          }
          break;
        }
        case 'deepseek': {
          // DeepSeek has an OpenAI-compatible models endpoint
          const response = await fetch('https://api.deepseek.com/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!response.ok) {
            // Fallback to known models if API fails
            console.warn('Failed to fetch DeepSeek models, using fallback list');
            models = [
              { id: 'deepseek-chat', name: 'DeepSeek Chat', provider },
              { id: 'deepseek-coder', name: 'DeepSeek Coder', provider },
              { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', provider },
            ];
          } else {
            const data = await response.json();
            models = (data.data || [])
              .map((m: { id: string }) => ({ id: m.id, name: m.id, provider }))
              .sort((a: LLMModel, b: LLMModel) => a.id.localeCompare(b.id));
          }
          break;
        }
        case 'xai': {
          // xAI has an OpenAI-compatible models endpoint
          const response = await fetch('https://api.x.ai/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!response.ok) {
            // Fallback to known models if API fails
            console.warn('Failed to fetch xAI models, using fallback list');
            models = [
              { id: 'grok-2-latest', name: 'Grok 2', provider },
              { id: 'grok-2-mini', name: 'Grok 2 Mini', provider },
              { id: 'grok-beta', name: 'Grok Beta', provider },
            ];
          } else {
            const data = await response.json();
            models = (data.data || [])
              .map((m: { id: string; name?: string }) => ({ 
                id: m.id, 
                name: m.name || m.id, 
                provider 
              }))
              .sort((a: LLMModel, b: LLMModel) => a.id.localeCompare(b.id));
          }
          break;
        }
        case 'openai-compatible': {
          if (!baseUrl) {
            return err({
              code: LLMErrorCodes.INVALID_SETTINGS,
              message: 'Base URL required for OpenAI Compatible provider',
            });
          }
          const normalizedUrl = baseUrl.replace(/\/+$/, '');
          const modelsUrl = normalizedUrl.endsWith('/v1')
            ? `${normalizedUrl}/models`
            : `${normalizedUrl}/v1/models`;
          const compatHeaders: Record<string, string> = {};
          if (apiKey) compatHeaders['Authorization'] = `Bearer ${apiKey}`;
          const response = await fetch(modelsUrl, { headers: compatHeaders });
          if (!response.ok) {
            // Return empty list — user can manually enter model ID
            models = [];
          } else {
            const data = await response.json();
            models = (data.data || [])
              .map((m: { id: string; name?: string }) => ({
                id: m.id,
                name: m.name || m.id,
                provider,
              }))
              .sort((a: LLMModel, b: LLMModel) => a.id.localeCompare(b.id));
          }
          break;
        }
      }

      return ok(models);
    } catch (caught) {
      return err({
        code: LLMErrorCodes.FETCH_MODELS_FAILED,
        message: caught instanceof Error ? caught.message : 'Failed to fetch models',
      });
    }
  }

  /**
   * Generates a checklist template from a user query.
   */
  async generateTemplate(settings: LLMSettings, query: string): Promise<LLMResult<GeneratedTemplate>> {
    try {
      const { provider, selectedModel } = settings;

      if (!provider) {
        return err({
          code: LLMErrorCodes.PROVIDER_NOT_CONFIGURED,
          message: 'LLM provider not configured',
        });
      }

      if (!selectedModel) {
        return err({
          code: LLMErrorCodes.MODEL_NOT_SELECTED,
          message: 'No model selected',
        });
      }

      const client = getProviderClient(settings);

      // Perform web research if enabled
      const webResearchContext = await this.getWebResearchContext(settings, query);

      // Build prompts using the builder
      const { system: systemPrompt, user: userPrompt } = this.buildGeneratePrompts(query, webResearchContext);

      const result = streamText({
        model: client(selectedModel),
        system: systemPrompt,
        prompt: userPrompt,
      });
      const text = await result.text;

      // Parse and validate the response using the parser
      const parseResult = this.parseLLMResponse('generate', text);
      if (!parseResult.success) return parseResult as LLMResult<GeneratedTemplate>;
      return ok(parseResult.data as GeneratedTemplate);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Generation failed';

      // Log the full error for debugging
      console.error('LLM Generation Error:', caught);
      
      // Check for rate limiting - be more specific to avoid false positives
      const lowerMessage = message.toLowerCase();
      if (
        lowerMessage.includes('rate limit') || 
        lowerMessage.includes('rate_limit') ||
        lowerMessage.includes('too many requests') ||
        lowerMessage.includes('429')
      ) {
        return err({
          code: LLMErrorCodes.RATE_LIMITED,
          message: 'Rate limited by the provider. Please try again later.',
        });
      }

      return err({
        code: LLMErrorCodes.GENERATION_FAILED,
        message,
      });
    }
  }

  /**
   * Suggests improvements for an existing template.
   */
  async improveTemplate(
    settings: LLMSettings,
    template: { title: string; description: string | null; items: Array<{ content: string; description?: string | null }> }
  ): Promise<LLMResult<TemplateImprovements>> {
    try {
      const { provider, selectedModel } = settings;

      if (!provider) {
        return err({
          code: LLMErrorCodes.PROVIDER_NOT_CONFIGURED,
          message: 'LLM provider not configured',
        });
      }

      if (!selectedModel) {
        return err({
          code: LLMErrorCodes.MODEL_NOT_SELECTED,
          message: 'No model selected',
        });
      }

      const client = getProviderClient(settings);

      // Perform web research if enabled
      const webResearchContext = await this.getWebResearchContext(settings, `${template.title} checklist best practices`);

      // Build prompts using the builder
      const { system: systemPrompt, user: userPrompt } = this.buildImproveTemplatePrompts(template, webResearchContext);

      const result = streamText({
        model: client(selectedModel),
        system: systemPrompt,
        prompt: userPrompt,
      });
      const text = await result.text;

      // Parse and validate the response using the parser
      const parseResult = this.parseLLMResponse('improve-template', text);
      if (!parseResult.success) return parseResult as LLMResult<TemplateImprovements>;
      return ok(parseResult.data as TemplateImprovements);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Improvement generation failed';
      console.error('LLM Improvement Error:', caught);

      return err({
        code: LLMErrorCodes.GENERATION_FAILED,
        message,
      });
    }
  }

  /**
   * Suggests improvements for a single step.
   */
  async improveStep(
    settings: LLMSettings,
    step: { content: string; description?: string | null; resources?: ResourceLink[] | null },
    templateContext: {
      title: string;
      description: string | null;
      resources?: ResourceLink[] | null;
      allSteps: Array<{ content: string; description?: string | null }>;
      currentStepIndex: number;
    }
  ): Promise<LLMResult<StepImprovement>> {
    try {
      const { provider, selectedModel } = settings;

      if (!provider) {
        return err({
          code: LLMErrorCodes.PROVIDER_NOT_CONFIGURED,
          message: 'LLM provider not configured',
        });
      }

      if (!selectedModel) {
        return err({
          code: LLMErrorCodes.MODEL_NOT_SELECTED,
          message: 'No model selected',
        });
      }

      const client = getProviderClient(settings);

      // Perform web research if enabled
      const webResearchContext = await this.getWebResearchContext(
        settings,
        `${templateContext.title} ${step.content} how to guide`
      );

      // Build prompts using the builder
      const { system: systemPrompt, user: userPrompt } = this.buildImproveStepPrompts(step, templateContext, webResearchContext);

      const result = streamText({
        model: client(selectedModel),
        system: systemPrompt,
        prompt: userPrompt,
      });
      const text = await result.text;

      // Parse and validate the response using the parser
      const parseResult = this.parseLLMResponse('improve-step', text);
      if (!parseResult.success) return parseResult as LLMResult<StepImprovement>;
      return ok(parseResult.data as StepImprovement);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Step improvement failed';
      console.error('LLM Step Improvement Error:', caught);

      return err({
        code: LLMErrorCodes.GENERATION_FAILED,
        message,
      });
    }
  }

  /**
   * Enhances an entire template by improving all existing steps with better descriptions and resources.
   */
  async enhanceTemplate(
    settings: LLMSettings,
    template: {
      title: string;
      description: string | null;
      items: Array<{ id: string; content: string; description?: string | null; resources?: ResourceLink[] | null; itemType?: 'task' | 'reference' | 'phase' | null }>;
    }
  ): Promise<LLMResult<TemplateEnhancement>> {
    try {
      const { provider, selectedModel } = settings;

      if (!provider) {
        return err({
          code: LLMErrorCodes.PROVIDER_NOT_CONFIGURED,
          message: 'LLM provider not configured',
        });
      }

      if (!selectedModel) {
        return err({
          code: LLMErrorCodes.MODEL_NOT_SELECTED,
          message: 'No model selected',
        });
      }

      const client = getProviderClient(settings);

      // Perform web research if enabled
      const webResearchContext = await this.getWebResearchContext(
        settings,
        `${template.title} checklist detailed guide best practices`
      );

      // Build prompts using the builder
      const { system: systemPrompt, user: userPrompt } = this.buildEnhancePrompts(template, webResearchContext);

      const result = streamText({
        model: client(selectedModel),
        system: systemPrompt,
        prompt: userPrompt,
      });
      const text = await result.text;

      // Parse and validate the response using the parser
      const parseResult = this.parseLLMResponse('enhance', text);
      if (!parseResult.success) return parseResult as LLMResult<TemplateEnhancement>;
      return ok(parseResult.data as TemplateEnhancement);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Template enhancement failed';
      console.error('LLM Enhancement Error:', caught);

      return err({
        code: LLMErrorCodes.GENERATION_FAILED,
        message,
      });
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createLLMService(): LLMService {
  return new LLMService();
}

export { PROVIDER_CONFIG };
