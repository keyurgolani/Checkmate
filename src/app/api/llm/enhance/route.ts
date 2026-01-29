/**
 * LLM Enhance API Route
 * POST /api/llm/enhance - Enhance all steps in a template using AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { LLMService, LLMErrorCodes } from '@/lib/services/llm';
import type { LLMSettings, ResourceLink } from '@/lib/pocketbase-types';

interface EnhanceRequestBody {
  settings: LLMSettings;
  template: {
    title: string;
    description: string | null;
    items: Array<{
      id: string;
      content: string;
      description?: string | null;
      resources?: ResourceLink[] | null;
      itemType?: 'task' | 'reference' | 'phase' | null;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { isAuthenticated } = await getServerAuth();

    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_001', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json() as EnhanceRequestBody;
    
    if (!body.settings || !body.template) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_001', message: 'Settings and template data are required' } },
        { status: 400 }
      );
    }

    if (!body.template.items || body.template.items.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_002', message: 'Template must have at least one item to enhance' } },
        { status: 400 }
      );
    }

    const llmService = new LLMService();
    const result = await llmService.enhanceTemplate(body.settings, body.template);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, enhancement: result.data });
  } catch (error) {
    console.error('LLM Enhance Error:', error);
    return NextResponse.json(
      { success: false, error: { code: LLMErrorCodes.UNKNOWN_ERROR, message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
