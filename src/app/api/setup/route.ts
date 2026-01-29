/**
 * Database Setup API Route
 * 
 * GET /api/setup
 * Ensures the PocketBase schema is set up on first connection.
 * This is called automatically when the app starts.
 */

import { NextResponse } from 'next/server';
import { ensureSchemaInitialized } from '@/lib/services/schema-init';

// Track if setup has been attempted this session
let setupAttempted = false;
let setupSuccessful = false;

export async function GET(): Promise<NextResponse> {
  // Return cached result if already successful
  if (setupSuccessful) {
    return NextResponse.json({ success: true, message: 'Schema already initialized' });
  }

  // Only attempt setup once per server instance
  if (setupAttempted && !setupSuccessful) {
    return NextResponse.json({ 
      success: false, 
      message: 'Schema setup previously failed. Restart the server to retry.' 
    }, { status: 503 });
  }

  setupAttempted = true;

  try {
    const success = await ensureSchemaInitialized();
    
    if (success) {
      setupSuccessful = true;
      return NextResponse.json({ success: true, message: 'Schema initialized successfully' });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Schema initialization failed. Check server logs for details.',
        needsSetup: true,
      }, { status: 503 });
    }
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Setup failed' 
    }, { status: 500 });
  }
}
