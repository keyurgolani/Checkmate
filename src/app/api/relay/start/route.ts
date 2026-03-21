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
    const { operation, settings, ...params } = body;

    if (!operation || !settings) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_001', message: 'Operation and settings are required' } },
        { status: 400 }
      );
    }

    const orchestrator = new RelayOrchestrator(RELAY_SECRET);
    const result = await orchestrator.startWorkflow(operation, settings, params);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Relay start error:', error);
    return NextResponse.json(
      { relay: false, result: { success: false, error: { code: 'RELAY_001', message: 'Failed to start relay workflow' } } },
      { status: 500 }
    );
  }
}
