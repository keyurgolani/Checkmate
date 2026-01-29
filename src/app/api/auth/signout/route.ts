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
export async function GET(request: Request): Promise<NextResponse> {
  // Get the origin from headers (respects X-Forwarded-Host/Proto from reverse proxy)
  // or fall back to NEXT_PUBLIC_APP_URL, or use request URL as last resort
  const headers = new Headers(request.headers);
  const forwardedHost = headers.get('x-forwarded-host');
  const forwardedProto = headers.get('x-forwarded-proto') || 'http';
  const host = headers.get('host');
  
  let origin: string;
  if (forwardedHost) {
    origin = `${forwardedProto}://${forwardedHost}`;
  } else if (process.env.NEXT_PUBLIC_APP_URL) {
    origin = process.env.NEXT_PUBLIC_APP_URL;
  } else if (host) {
    origin = `http://${host}`;
  } else {
    origin = new URL(request.url).origin;
  }
  
  const redirectUrl = new URL('/signin', origin);
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.delete('pb_auth');
  return response;
}
