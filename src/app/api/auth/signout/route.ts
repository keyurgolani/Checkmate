/**
 * Sign Out API Route
 * 
 * POST /api/auth/signout
 * Signs out the current user by clearing the auth cookie.
 * 
 * Requirements: 1.2
 */

import { NextResponse } from 'next/server';
import { jsonResponseWithLogout } from '@/lib/auth-cookies';

// ============================================================================
// Types
// ============================================================================

interface SignOutResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(): Promise<NextResponse<SignOutResponse>> {
  try {
    // Return success response with auth cookie cleared
    return jsonResponseWithLogout(
      {
        success: true,
        message: 'Successfully signed out',
      },
      200
    );
  } catch (error) {
    console.error('Sign out error:', error);
    // Even on error, try to clear the cookie
    return jsonResponseWithLogout(
      {
        success: true,
        message: 'Signed out',
      },
      200
    );
  }
}

/**
 * GET handler for sign out - returns method not allowed.
 * Sign out must use POST to prevent accidental cookie clearing via
 * link prefetching or crawlers following links.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to sign out.' },
    { status: 405 }
  );
}
