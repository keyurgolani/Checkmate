import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { RelayOrchestrator } from '@/lib/services/relay-orchestrator';

const RELAY_SECRET = process.env.RELAY_TOKEN_SECRET || 'checkmate-relay-default-secret-change-me!!';

export async function POST(request: NextRequest) {
  try {
    const { isAuthenticated } = await getServerAuth();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_001', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token, response, error } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_001', message: 'Token is required' } },
        { status: 400 }
      );
    }

    const orchestrator = new RelayOrchestrator(RELAY_SECRET);

    if (error) {
      return NextResponse.json({
        relay: false,
        result: { success: false, error: { code: 'RELAY_CLIENT_ERROR', message: error } },
      });
    }

    if (!response) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_002', message: 'Response or error is required' } },
        { status: 400 }
      );
    }

    const result = await orchestrator.advanceWorkflow(token, response);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('expired') || message.includes('invalid') || message.includes('Invalid')) {
      return NextResponse.json(
        { relay: false, result: { success: false, error: { code: 'RELAY_TOKEN_ERROR', message } } },
        { status: 401 }
      );
    }

    console.error('Relay next error:', error);
    return NextResponse.json(
      { relay: false, result: { success: false, error: { code: 'RELAY_002', message: 'Failed to advance relay workflow' } } },
      { status: 500 }
    );
  }
}
