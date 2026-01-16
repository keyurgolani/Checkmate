/**
 * Session API Route
 * 
 * GET /api/auth/session
 * Returns the current user's session information.
 * 
 * Requirements: 1.6
 */

import { NextResponse } from 'next/server';
import { getServerAuth, refreshServerSession } from '@/lib/server-auth';
import { shouldRefreshToken, setAuthCookieOnResponse, type AuthCookieData } from '@/lib/auth-cookies';

// ============================================================================
// Types
// ============================================================================

interface SessionResponse {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    displayName: string | null;
    verified: boolean;
    avatarUrl: string | null;
  };
  expiresAt?: string;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(): Promise<NextResponse<SessionResponse>> {
  try {
    const auth = await getServerAuth();
    
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        { status: 200 }
      );
    }
    
    // Check if token needs refresh
    let response: NextResponse<SessionResponse>;
    
    if (auth.token && shouldRefreshToken(auth.token)) {
      // Attempt to refresh the session
      const refreshResult = await refreshServerSession();
      
      if (refreshResult.success && refreshResult.user && refreshResult.token) {
        // Create response with refreshed user data
        response = NextResponse.json(
          {
            authenticated: true,
            user: {
              id: refreshResult.user.id,
              email: refreshResult.user.email,
              displayName: refreshResult.user.displayName,
              verified: refreshResult.user.verified,
              avatarUrl: refreshResult.user.avatarUrl,
            },
          },
          { status: 200 }
        );
        
        // Update the cookie with refreshed token
        const authCookieData: AuthCookieData = {
          token: refreshResult.token,
          model: {
            id: refreshResult.user.id,
            collectionId: refreshResult.user.collectionId,
            collectionName: 'users',
            email: refreshResult.user.email,
            displayName: refreshResult.user.displayName,
            verified: refreshResult.user.verified,
            emailVisibility: refreshResult.user.emailVisibility,
            avatarUrl: refreshResult.user.avatarUrl,
            preferences: refreshResult.user.preferences,
            created: refreshResult.user.created,
            updated: refreshResult.user.updated,
          },
        };
        
        return setAuthCookieOnResponse(response, authCookieData) as NextResponse<SessionResponse>;
      }
    }
    
    // Return current session without refresh
    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: auth.user.id,
          email: auth.user.email,
          displayName: auth.user.displayName,
          verified: auth.user.verified,
          avatarUrl: auth.user.avatarUrl,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      {
        authenticated: false,
      },
      { status: 200 }
    );
  }
}
