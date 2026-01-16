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
 * GET handler for sign out - clears cookie and redirects to signin
 * This allows using a simple link for sign out
 */
export async function GET(): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL('/signin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  response.cookies.delete('pb_auth');
  return response;
}
