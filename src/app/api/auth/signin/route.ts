/**
 * Sign In API Route
 * 
 * POST /api/auth/signin
 * Authenticates a user with email and password.
 * Implements account lockout after 3 consecutive failed attempts.
 * 
 * Requirements: 1.2, 1.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthService, AuthErrorCodes } from '@/lib/services/auth';
import { jsonResponseWithAuth, type AuthCookieData } from '@/lib/auth-cookies';

// ============================================================================
// Types
// ============================================================================

interface SignInRequestBody {
  email: string;
  password: string;
}

interface SignInResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    displayName: string | null;
    verified: boolean;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<SignInResponse>> {
  try {
    // Parse request body
    const body = await request.json() as SignInRequestBody;
    
    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: AuthErrorCodes.VALIDATION_ERROR,
            message: 'Email and password are required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }
    
    // Create auth service and attempt sign in
    const authService = createAuthService();
    const result = await authService.signIn({
      email: body.email,
      password: body.password,
    });
    
    if (!result.success) {
      const statusCode = getStatusCodeForError(result.error.code);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.details,
            timestamp: new Date().toISOString(),
          },
        },
        { status: statusCode }
      );
    }
    
    // Create auth cookie data
    const authCookieData: AuthCookieData = {
      token: result.data.token,
      model: {
        id: result.data.user.id,
        collectionId: result.data.user.collectionId,
        collectionName: 'users',
        email: result.data.user.email,
        displayName: result.data.user.displayName,
        verified: result.data.user.verified,
        emailVisibility: result.data.user.emailVisibility,
        avatarUrl: result.data.user.avatarUrl,
        preferences: result.data.user.preferences,
        created: result.data.user.created,
        updated: result.data.user.updated,
      },
    };
    
    // Return success response with auth cookie
    return jsonResponseWithAuth(
      {
        success: true,
        user: {
          id: result.data.user.id,
          email: result.data.user.email,
          displayName: result.data.user.displayName,
          verified: result.data.user.verified,
        },
      },
      authCookieData,
      200
    );
  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: AuthErrorCodes.UNKNOWN_ERROR,
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStatusCodeForError(errorCode: string | undefined): number {
  switch (errorCode) {
    case AuthErrorCodes.VALIDATION_ERROR:
      return 400;
    case AuthErrorCodes.INVALID_CREDENTIALS:
      return 401;
    case AuthErrorCodes.ACCOUNT_LOCKED:
    case AuthErrorCodes.EMAIL_NOT_VERIFIED:
      return 403;
    default:
      return 500;
  }
}
