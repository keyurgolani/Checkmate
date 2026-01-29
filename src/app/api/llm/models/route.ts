/**
 * LLM Models API Route
 * POST /api/llm/models - Fetch available models for a provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { LLMService, LLMErrorCodes } from '@/lib/services/llm';
import type { LLMSettings } from '@/lib/pocketbase-types';

export async function POST(request: NextRequest) {
  try {
    const { isAuthenticated } = await getServerAuth();

    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_001', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json() as LLMSettings;
    const llmService = new LLMService();
    const result = await llmService.fetchModels(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, models: result.data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: LLMErrorCodes.UNKNOWN_ERROR, message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
