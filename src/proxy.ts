/**
 * Authentication Proxy
 * 
 * Handles auth token validation, session management with cookies,
 * and session refresh for Next.js routes.
 * 
 * Requirements: 1.6
 * 
 * Note: Migrated from middleware.ts to proxy.ts for Next.js 16 compatibility.
 * The "middleware" file convention is deprecated in Next.js 16.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================================================
// Constants
// ============================================================================

/**
 * Cookie name for storing the PocketBase auth token
 */
export const AUTH_COOKIE_NAME = 'pb_auth';

/**
 * Routes that require authentication
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/workspaces',
  '/templates/create',
  '/templates/edit',
  '/checklists',
  '/settings',
  '/notifications',
];

/**
 * Routes that should redirect to dashboard if already authenticated
 */
const AUTH_ROUTES = [
  '/signin',
  '/signup',
  '/login',
  '/auth/login',
  '/auth/signup',
];

/**
 * API routes that require authentication
 */
const PROTECTED_API_ROUTES = [
  '/api/templates',
  '/api/checklists',
  '/api/workspaces',
  '/api/collaborators',
  '/api/notifications',
  '/api/user',
  '/api/relay',
];

/**
 * API routes that are public (no auth required)
 */
const PUBLIC_API_ROUTES = [
  '/api/auth',
  '/api/search',
  '/api/categories',
  '/api/templates/public',
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if a path matches any of the given route patterns
 */
function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some(route => {
    if (path === route) return true;
    if (path.startsWith(route + '/')) return true;
    return false;
  });
}

function isProtectedRoute(path: string): boolean {
  return matchesRoute(path, PROTECTED_ROUTES);
}

function isAuthRoute(path: string): boolean {
  return matchesRoute(path, AUTH_ROUTES);
}

function isProtectedApiRoute(path: string): boolean {
  if (matchesRoute(path, PUBLIC_API_ROUTES)) {
    return false;
  }
  // Allow public read access to individual template details and their items.
  // The route handlers enforce their own authorization (rejecting
  // private/shared templates for unauthenticated users).
  const templateDetailPattern = /^\/api\/templates\/[^/]+(\/items)?$/;
  if (templateDetailPattern.test(path)) {
    return false;
  }
  return matchesRoute(path, PROTECTED_API_ROUTES);
}

/**
 * Parses the PocketBase auth cookie value
 */
function parseAuthCookie(cookieValue: string | undefined): { token: string; model: Record<string, unknown> } | null {
  if (!cookieValue) return null;
  try {
    const parsed = JSON.parse(cookieValue);
    if (parsed && typeof parsed.token === 'string' && parsed.token.length > 0) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Decodes the payload from a JWT token.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
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
 * Validates a JWT token structure (basic validation)
 */
function isValidTokenStructure(token: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
  return parts.every(part => base64UrlRegex.test(part));
}

/**
 * Checks if a JWT token is expired
 */
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  const exp = payload.exp;
  if (typeof exp !== 'number') return false;
  const expiryTime = exp * 1000;
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000;
  return now > (expiryTime - bufferMs);
}

/**
 * Checks if a token is close to expiring (within 1 hour)
 */
function shouldRefreshToken(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  const exp = payload.exp;
  if (typeof exp !== 'number') return false;
  const expiryTime = exp * 1000;
  const now = Date.now();
  const refreshThreshold = 60 * 60 * 1000;
  return (expiryTime - now) < refreshThreshold;
}


// ============================================================================
// Proxy Function
// ============================================================================

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
  const authData = parseAuthCookie(authCookie?.value);
  
  const isAuthenticated = authData !== null && 
    isValidTokenStructure(authData.token) && 
    !isTokenExpired(authData.token);
  
  const response = NextResponse.next();
  
  // Handle Protected Routes
  if (isProtectedRoute(pathname)) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/signin', request.url);
      loginUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (authData && shouldRefreshToken(authData.token)) {
      response.headers.set('X-Auth-Refresh-Needed', 'true');
    }
  }
  
  // Handle Auth Routes (login/signup)
  if (isAuthRoute(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  // Handle Protected API Routes
  if (pathname.startsWith('/api/')) {
    if (isProtectedApiRoute(pathname)) {
      if (!isAuthenticated) {
        return NextResponse.json(
          { error: { code: 'AUTH_004', message: 'Authentication required', timestamp: new Date().toISOString() } },
          { status: 401 }
        );
      }
      if (authData && isTokenExpired(authData.token)) {
        return NextResponse.json(
          { error: { code: 'AUTH_004', message: 'Session expired. Please log in again.', timestamp: new Date().toISOString() } },
          { status: 401 }
        );
      }
      if (authData) {
        response.headers.set('X-User-Token', authData.token);
        if (authData.model && typeof authData.model.id === 'string') {
          response.headers.set('X-User-Id', authData.model.id);
        }
      }
    }
  }
  
  return response;
}

// ============================================================================
// Proxy Config
// ============================================================================

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
