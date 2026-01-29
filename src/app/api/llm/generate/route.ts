/**
 * LLM Generate API Route
 * POST /api/llm/generate - Generate a template from a query
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { LLMService, LLMErrorCodes } from '@/lib/services/llm';
import type { LLMSettings } from '@/lib/pocketbase-types';

interface GenerateRequestBody {
  settings: LLMSettings;
  query: string;
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

    const body = await request.json() as GenerateRequestBody;
    
    if (!body.query || body.query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_001', message: 'Query is required' } },
        { status: 400 }
      );
    }

    const llmService = new LLMService();
    const result = await llmService.generateTemplate(body.settings, body.query);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, template: result.data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: LLMErrorCodes.UNKNOWN_ERROR, message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
