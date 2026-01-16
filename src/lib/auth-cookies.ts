/**
 * Auth Cookie Utilities
 * 
 * Provides functions for managing authentication cookies in Next.js.
 * Used by both middleware and API routes for session management.
 * 
 * Requirements: 1.6
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

// ============================================================================
// Constants
// ============================================================================

/**
 * Cookie name for storing the PocketBase auth token
 */
export const AUTH_COOKIE_NAME = 'pb_auth';

/**
 * Default cookie options
 */
const DEFAULT_COOKIE_OPTIONS: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

/**
 * Cookie max age in seconds (7 days - matches PocketBase token expiry)
 */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

// ============================================================================
// Types
// ============================================================================

/**
 * Auth cookie data structure (matches PocketBase auth store format)
 */
export interface AuthCookieData {
  token: string;
  model: {
    id: string;
    collectionId: string;
    collectionName: string;
    email: string;
    displayName?: string | null;
    verified?: boolean;
    created?: string;
    updated?: string;
    [key: string]: unknown;
  };
}

// ============================================================================
// Server-Side Cookie Functions (for use in Server Components and API Routes)
// ============================================================================

/**
 * Gets the auth cookie data from the request cookies.
 * Use this in Server Components and API Routes.
 * 
 * @returns AuthCookieData if valid cookie exists, null otherwise
 */
export async function getAuthCookie(): Promise<AuthCookieData | null> {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
    
    if (!authCookie?.value) {
      return null;
    }
    
    const parsed = JSON.parse(authCookie.value);
    
    if (parsed && typeof parsed.token === 'string' && parsed.token.length > 0) {
      return parsed as AuthCookieData;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Sets the auth cookie with the provided data.
 * Use this in Server Actions and API Routes.
 * 
 * @param data - Auth data to store in the cookie
 */
export async function setAuthCookie(data: AuthCookieData): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set(AUTH_COOKIE_NAME, JSON.stringify(data), {
    ...DEFAULT_COOKIE_OPTIONS,
    maxAge: COOKIE_MAX_AGE,
  });
}

/**
 * Clears the auth cookie.
 * Use this in Server Actions and API Routes for logout.
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.delete(AUTH_COOKIE_NAME);
}

/**
 * Gets the current user ID from the auth cookie.
 * Convenience function for quick user ID access.
 * 
 * @returns User ID if authenticated, null otherwise
 */
export async function getCurrentUserId(): Promise<string | null> {
  const authData = await getAuthCookie();
  return authData?.model?.id ?? null;
}

/**
 * Gets the current auth token from the cookie.
 * 
 * @returns Auth token if authenticated, null otherwise
 */
export async function getAuthToken(): Promise<string | null> {
  const authData = await getAuthCookie();
  return authData?.token ?? null;
}

/**
 * Checks if the current request is authenticated.
 * 
 * @returns true if authenticated with valid token
 */
export async function isAuthenticated(): Promise<boolean> {
  const authData = await getAuthCookie();
  
  if (!authData?.token) {
    return false;
  }
  
  // Basic token structure validation
  const parts = authData.token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  // Check token expiry
  try {
    const payloadPart = parts[1];
    if (!payloadPart) {
      return false;
    }
    const payload = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp) {
      const expiryTime = payload.exp * 1000;
      if (Date.now() > expiryTime) {
        return false;
      }
    }
  } catch {
    return false;
  }
  
  return true;
}

// ============================================================================
// Response Cookie Functions (for use in API Route handlers)
// ============================================================================

/**
 * Sets the auth cookie on a NextResponse object.
 * Use this in API Route handlers.
 * 
 * @param response - NextResponse object to set cookie on
 * @param data - Auth data to store
 * @returns The modified response
 */
export function setAuthCookieOnResponse(
  response: NextResponse,
  data: AuthCookieData
): NextResponse {
  response.cookies.set(AUTH_COOKIE_NAME, JSON.stringify(data), {
    ...DEFAULT_COOKIE_OPTIONS,
    maxAge: COOKIE_MAX_AGE,
  });
  
  return response;
}

/**
 * Clears the auth cookie on a NextResponse object.
 * Use this in API Route handlers for logout.
 * 
 * @param response - NextResponse object to clear cookie on
 * @returns The modified response
 */
export function clearAuthCookieOnResponse(response: NextResponse): NextResponse {
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}

/**
 * Creates a JSON response with auth cookie set.
 * Convenience function for API routes that need to set auth after login.
 * 
 * @param data - Response body data
 * @param authData - Auth data to store in cookie
 * @param status - HTTP status code (default 200)
 * @returns NextResponse with auth cookie set
 */
export function jsonResponseWithAuth<T>(
  data: T,
  authData: AuthCookieData,
  status: number = 200
): NextResponse<T> {
  const response = NextResponse.json(data, { status });
  return setAuthCookieOnResponse(response, authData) as NextResponse<T>;
}

/**
 * Creates a JSON response with auth cookie cleared.
 * Convenience function for logout API routes.
 * 
 * @param data - Response body data
 * @param status - HTTP status code (default 200)
 * @returns NextResponse with auth cookie cleared
 */
export function jsonResponseWithLogout<T>(
  data: T,
  status: number = 200
): NextResponse<T> {
  const response = NextResponse.json(data, { status });
  return clearAuthCookieOnResponse(response) as NextResponse<T>;
}

// ============================================================================
// Token Utility Functions
// ============================================================================

/**
 * Decodes the payload from a JWT token.
 * Helper function to avoid code duplication.
 * 
 * @param token - JWT token
 * @returns Decoded payload or null if invalid
 */
function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payloadPart = parts[1];
    if (!payloadPart) return null;
    
    return JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/**
 * Checks if a token is close to expiring (within 1 hour).
 * Used to determine if proactive refresh is needed.
 * 
 * @param token - JWT token to check
 * @returns true if token should be refreshed
 */
export function shouldRefreshToken(token: string): boolean {
  const payload = decodeTokenPayload(token);
  if (!payload) return false;
  
  const exp = payload.exp;
  if (typeof exp !== 'number') return false;
  
  const expiryTime = exp * 1000;
  const now = Date.now();
  const refreshThreshold = 60 * 60 * 1000; // 1 hour before expiry
  
  return (expiryTime - now) < refreshThreshold;
}

/**
 * Gets the expiry time of a token.
 * 
 * @param token - JWT token
 * @returns Expiry date or null if not available
 */
export function getTokenExpiry(token: string): Date | null {
  const payload = decodeTokenPayload(token);
  if (!payload) return null;
  
  const exp = payload.exp;
  if (typeof exp !== 'number') return null;
  
  return new Date(exp * 1000);
}

/**
 * Extracts user ID from a JWT token without full validation.
 * Use for quick access when full validation isn't needed.
 * 
 * @param token - JWT token
 * @returns User ID or null
 */
export function getUserIdFromToken(token: string): string | null {
  const payload = decodeTokenPayload(token);
  if (!payload) return null;
  
  const id = payload.id ?? payload.sub;
  return typeof id === 'string' ? id : null;
}
