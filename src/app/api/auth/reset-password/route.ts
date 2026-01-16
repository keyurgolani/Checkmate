/**
 * Password Reset API Route
 * 
 * POST /api/auth/reset-password
 * Requests a password reset email or confirms a password reset.
 * 
 * Requirements: 1.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthService, AuthErrorCodes } from '@/lib/services/auth';

// ============================================================================
// Types
// ============================================================================

interface RequestResetBody {
  email: string;
}

interface ConfirmResetBody {
  token: string;
  password: string;
  passwordConfirm: string;
}

type ResetPasswordRequestBody = RequestResetBody | ConfirmResetBody;

interface ResetPasswordResponse {
  success: boolean;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
}

// ============================================================================
// Type Guards
// ============================================================================

function isRequestReset(body: ResetPasswordRequestBody): body is RequestResetBody {
  return 'email' in body && !('token' in body);
}

function isConfirmReset(body: ResetPasswordRequestBody): body is ConfirmResetBody {
  return 'token' in body && 'password' in body && 'passwordConfirm' in body;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<ResetPasswordResponse>> {
  try {
    // Parse request body
    const body = await request.json() as ResetPasswordRequestBody;
    
    const authService = createAuthService();
    
    // Handle password reset request (send email)
    if (isRequestReset(body)) {
      if (!body.email) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: AuthErrorCodes.VALIDATION_ERROR,
              message: 'Email is required',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 400 }
        );
      }
      
      const result = await authService.requestPasswordReset(body.email);
      
      // Always return success to prevent email enumeration
      // Even if the email doesn't exist, we don't reveal that
      return NextResponse.json(
        {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.',
        },
        { status: 200 }
      );
    }
    
    // Handle password reset confirmation
    if (isConfirmReset(body)) {
      if (!body.token || !body.password || !body.passwordConfirm) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: AuthErrorCodes.VALIDATION_ERROR,
              message: 'Token, password, and password confirmation are required',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 400 }
        );
      }
      
      const result = await authService.confirmPasswordReset(
        body.token,
        body.password,
        body.passwordConfirm
      );
      
      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: result.error?.code ?? AuthErrorCodes.UNKNOWN_ERROR,
              message: result.error?.message ?? 'Password reset failed',
              details: result.error?.details,
              timestamp: new Date().toISOString(),
            },
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        {
          success: true,
          message: 'Password has been reset successfully. You can now sign in with your new password.',
        },
        { status: 200 }
      );
    }
    
    // Invalid request body
    return NextResponse.json(
      {
        success: false,
        error: {
          code: AuthErrorCodes.VALIDATION_ERROR,
          message: 'Invalid request. Provide either email for reset request, or token with new password for confirmation.',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Password reset error:', error);
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
