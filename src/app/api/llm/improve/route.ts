/**
 * LLM Improve API Route
 * POST /api/llm/improve - Improve a template or step using AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { LLMService, LLMErrorCodes } from '@/lib/services/llm';
import type { LLMSettings, ResourceLink } from '@/lib/pocketbase-types';

interface ImproveTemplateRequestBody {
  type: 'template';
  settings: LLMSettings;
  template: {
    title: string;
    description: string | null;
    items: Array<{ content: string; description?: string | null }>;
  };
}

interface ImproveStepRequestBody {
  type: 'step';
  settings: LLMSettings;
  step: {
    content: string;
    description?: string | null;
    resources?: ResourceLink[] | null;
  };
  templateContext: {
    title: string;
    description: string | null;
    resources?: ResourceLink[] | null;
    allSteps: Array<{ content: string; description?: string | null }>;
    currentStepIndex: number;
  };
}

type ImproveRequestBody = ImproveTemplateRequestBody | ImproveStepRequestBody;

export async function POST(request: NextRequest) {
  try {
    const { isAuthenticated } = await getServerAuth();

    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_001', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json() as ImproveRequestBody;
    
    if (!body.type || !body.settings) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_001', message: 'Invalid request body' } },
        { status: 400 }
      );
    }

    const llmService = new LLMService();

    if (body.type === 'template') {
      if (!body.template) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_002', message: 'Template data is required' } },
          { status: 400 }
        );
      }

      const result = await llmService.improveTemplate(body.settings, body.template);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, improvements: result.data });
    }

    if (body.type === 'step') {
      if (!body.step || !body.templateContext) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_003', message: 'Step and template context are required' } },
          { status: 400 }
        );
      }

      const result = await llmService.improveStep(body.settings, body.step, body.templateContext);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, improvement: result.data });
    }

    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_004', message: 'Invalid improvement type' } },
      { status: 400 }
    );
  } catch (error) {
    console.error('LLM Improve Error:', error);
    return NextResponse.json(
      { success: false, error: { code: LLMErrorCodes.UNKNOWN_ERROR, message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
