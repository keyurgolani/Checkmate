/**
 * Sign Out API Route
 * 
 * POST /api/auth/signout
 * Signs out the current user by clearing the auth cookie.
 * For demo users, also wipes all user-created data.
 * 
 * Requirements: 1.2
 */

import { NextResponse } from 'next/server';
import { jsonResponseWithLogout, getAuthCookie } from '@/lib/auth-cookies';
import { resetDemoUserData } from '@/app/api/auth/demo-reset/route';

interface SignOutResponse {
  success: boolean;
  message: string;
}

const DEMO_EMAIL = process.env.DEMO_USER_EMAIL || 'demo@checkmate.local';

export async function POST(): Promise<NextResponse<SignOutResponse>> {
  try {
    const authData = await getAuthCookie();
    const userEmail = authData?.model?.email as string | undefined;
    const userId = authData?.model?.id as string | undefined;

    if (userEmail === DEMO_EMAIL && userId) {
      try {
        await resetDemoUserData(userId);
      } catch (resetError) {
        console.error('[Sign Out] Demo reset failed:', resetError);
      }
    }

    return jsonResponseWithLogout(
      {
        success: true,
        message: 'Successfully signed out',
      },
      200
    );
  } catch (error) {
    console.error('Sign out error:', error);
    return jsonResponseWithLogout(
      {
        success: true,
        message: 'Signed out',
      },
      200
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to sign out.' },
    { status: 405 }
  );
}
