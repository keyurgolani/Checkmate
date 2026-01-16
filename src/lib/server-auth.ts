/**
 * Server-Side Authentication Utilities
 * 
 * Provides server-side authentication functions that integrate PocketBase
 * with Next.js cookie-based session management.
 * 
 * Use these functions in:
 * - Server Components
 * - API Routes
 * - Server Actions
 * 
 * Requirements: 1.6
 */

import PocketBase from 'pocketbase';
import { createPocketBaseClient } from './pocketbase';
import { 
  getAuthCookie, 
  setAuthCookie, 
  clearAuthCookie,
  type AuthCookieData,
  shouldRefreshToken,
} from './auth-cookies';
import type { User } from './pocketbase-types';

// ============================================================================
// Types
// ============================================================================

/**
 * Server auth result with user and PocketBase client
 */
export interface ServerAuthResult {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  pb: PocketBase;
}

/**
 * Session refresh result
 */
export interface RefreshResult {
  success: boolean;
  user: User | null;
  token: string | null;
  error?: string;
}

// ============================================================================
// Server Auth Functions
// ============================================================================

/**
 * Gets the current authenticated user and a configured PocketBase client.
 * 
 * This function:
 * 1. Reads the auth cookie
 * 2. Creates a PocketBase client with the stored auth
 * 3. Validates the token is still valid
 * 4. Returns the user and configured client
 * 
 * Use this in Server Components and API Routes to get the current user.
 * 
 * @returns ServerAuthResult with user, token, and configured PocketBase client
 */
export async function getServerAuth(): Promise<ServerAuthResult> {
  const pb = createPocketBaseClient();
  
  // Get auth data from cookie
  const authData = await getAuthCookie();
  
  if (!authData?.token) {
    return {
      isAuthenticated: false,
      user: null,
      token: null,
      pb,
    };
  }
  
  // Load the auth into PocketBase client
  pb.authStore.save(authData.token, authData.model);
  
  // Check if auth is valid
  if (!pb.authStore.isValid) {
    return {
      isAuthenticated: false,
      user: null,
      token: null,
      pb,
    };
  }
  
  // Convert model to User type
  const user: User = {
    id: authData.model.id,
    collectionId: authData.model.collectionId,
    collectionName: 'users',
    created: authData.model.created ?? '',
    updated: authData.model.updated ?? '',
    email: authData.model.email,
    emailVisibility: (authData.model.emailVisibility as boolean) ?? false,
    verified: authData.model.verified ?? false,
    displayName: authData.model.displayName ?? null,
    avatarUrl: (authData.model.avatarUrl as string) ?? null,
    preferences: (authData.model.preferences as User['preferences']) ?? null,
    failedLoginAttempts: (authData.model.failedLoginAttempts as number) ?? null,
    lastFailedLogin: (authData.model.lastFailedLogin as string) ?? null,
    lockedUntil: (authData.model.lockedUntil as string) ?? null,
  };
  
  return {
    isAuthenticated: true,
    user,
    token: authData.token,
    pb,
  };
}

/**
 * Refreshes the current session if needed.
 * 
 * This function:
 * 1. Checks if the token needs refresh (close to expiry)
 * 2. Calls PocketBase authRefresh
 * 3. Updates the auth cookie with new token
 * 
 * Call this proactively to keep sessions alive.
 * 
 * @returns RefreshResult with new user and token on success
 */
export async function refreshServerSession(): Promise<RefreshResult> {
  const { isAuthenticated, token, pb } = await getServerAuth();
  
  if (!isAuthenticated || !token) {
    return {
      success: false,
      user: null,
      token: null,
      error: 'Not authenticated',
    };
  }
  
  // Check if refresh is needed
  if (!shouldRefreshToken(token)) {
    // Token is still fresh, no refresh needed
    const authData = await getAuthCookie();
    return {
      success: true,
      user: authData?.model as unknown as User ?? null,
      token,
    };
  }
  
  try {
    // Refresh the auth
    const authResult = await pb.collection('users').authRefresh();
    
    // Update the cookie with new token
    const newAuthData: AuthCookieData = {
      token: authResult.token,
      model: {
        id: authResult.record.id,
        collectionId: authResult.record.collectionId,
        collectionName: 'users',
        email: authResult.record.email,
        displayName: authResult.record.displayName ?? null,
        verified: authResult.record.verified ?? false,
        emailVisibility: authResult.record.emailVisibility ?? false,
        avatarUrl: authResult.record.avatarUrl ?? null,
        preferences: authResult.record.preferences ?? null,
        created: authResult.record.created,
        updated: authResult.record.updated,
      },
    };
    
    await setAuthCookie(newAuthData);
    
    const user: User = {
      id: authResult.record.id,
      collectionId: authResult.record.collectionId,
      collectionName: 'users',
      created: authResult.record.created,
      updated: authResult.record.updated,
      email: authResult.record.email,
      emailVisibility: authResult.record.emailVisibility ?? false,
      verified: authResult.record.verified ?? false,
      displayName: authResult.record.displayName ?? null,
      avatarUrl: authResult.record.avatarUrl ?? null,
      preferences: authResult.record.preferences ?? null,
      failedLoginAttempts: authResult.record.failedLoginAttempts ?? null,
      lastFailedLogin: authResult.record.lastFailedLogin ?? null,
      lockedUntil: authResult.record.lockedUntil ?? null,
    };
    
    return {
      success: true,
      user,
      token: authResult.token,
    };
  } catch (error) {
    // Refresh failed, clear the invalid session
    await clearAuthCookie();
    
    return {
      success: false,
      user: null,
      token: null,
      error: error instanceof Error ? error.message : 'Session refresh failed',
    };
  }
}

/**
 * Signs in a user and sets the auth cookie.
 * Use this in Server Actions for login.
 * 
 * @param email - User email
 * @param password - User password
 * @returns Result with user on success, error on failure
 */
export async function serverSignIn(
  email: string,
  password: string
): Promise<{ success: boolean; user: User | null; error?: string }> {
  const pb = createPocketBaseClient();
  
  try {
    const authResult = await pb.collection('users').authWithPassword(email, password);
    
    // Set the auth cookie
    const authData: AuthCookieData = {
      token: authResult.token,
      model: {
        id: authResult.record.id,
        collectionId: authResult.record.collectionId,
        collectionName: 'users',
        email: authResult.record.email,
        displayName: authResult.record.displayName ?? null,
        verified: authResult.record.verified ?? false,
        emailVisibility: authResult.record.emailVisibility ?? false,
        avatarUrl: authResult.record.avatarUrl ?? null,
        preferences: authResult.record.preferences ?? null,
        created: authResult.record.created,
        updated: authResult.record.updated,
      },
    };
    
    await setAuthCookie(authData);
    
    const user: User = {
      id: authResult.record.id,
      collectionId: authResult.record.collectionId,
      collectionName: 'users',
      created: authResult.record.created,
      updated: authResult.record.updated,
      email: authResult.record.email,
      emailVisibility: authResult.record.emailVisibility ?? false,
      verified: authResult.record.verified ?? false,
      displayName: authResult.record.displayName ?? null,
      avatarUrl: authResult.record.avatarUrl ?? null,
      preferences: authResult.record.preferences ?? null,
      failedLoginAttempts: authResult.record.failedLoginAttempts ?? null,
      lastFailedLogin: authResult.record.lastFailedLogin ?? null,
      lockedUntil: authResult.record.lockedUntil ?? null,
    };
    
    return { success: true, user };
  } catch (error) {
    return {
      success: false,
      user: null,
      error: error instanceof Error ? error.message : 'Sign in failed',
    };
  }
}

/**
 * Signs out the current user and clears the auth cookie.
 * Use this in Server Actions for logout.
 */
export async function serverSignOut(): Promise<void> {
  await clearAuthCookie();
}

/**
 * Requires authentication for a server operation.
 * Throws an error if not authenticated.
 * 
 * Use this at the start of protected Server Actions or API handlers.
 * 
 * @returns ServerAuthResult with guaranteed user
 * @throws Error if not authenticated
 */
export async function requireAuth(): Promise<ServerAuthResult & { user: User; token: string }> {
  const auth = await getServerAuth();
  
  if (!auth.isAuthenticated || !auth.user || !auth.token) {
    throw new Error('Authentication required');
  }
  
  return auth as ServerAuthResult & { user: User; token: string };
}

/**
 * Gets the current user ID or null.
 * Convenience function for quick user ID access.
 * 
 * @returns User ID if authenticated, null otherwise
 */
export async function getServerUserId(): Promise<string | null> {
  const { user } = await getServerAuth();
  return user?.id ?? null;
}

/**
 * Checks if the current request is authenticated.
 * 
 * @returns true if authenticated
 */
export async function isServerAuthenticated(): Promise<boolean> {
  const { isAuthenticated } = await getServerAuth();
  return isAuthenticated;
}
