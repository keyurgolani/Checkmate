/**
 * Authentication Service
 * 
 * Provides authentication functionality using PocketBase SDK.
 * Implements signUp, signIn, signOut, OAuth, and password reset flows.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.2
 */

import PocketBase, { ClientResponseError, RecordAuthResponse } from 'pocketbase';
import { createPocketBaseClient, getPocketBaseClient } from '../pocketbase';
import type { User, UserPreferences } from '../pocketbase-types';
import { WorkspaceService } from './workspace';

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum number of failed login attempts before account lockout
 */
export const MAX_FAILED_ATTEMPTS = 3;

/**
 * Lockout duration in minutes
 */
export const LOCKOUT_DURATION_MINUTES = 15;

// ============================================================================
// Types
// ============================================================================

/**
 * Supported OAuth providers
 */
export type OAuthProvider = 'google' | 'github' | 'apple';

/**
 * Authentication result returned by auth operations
 */
export interface AuthResult {
  success: boolean;
  user: User | null;
  token: string | null;
  error: AuthError | null;
}

/**
 * Authentication error with code and message
 */
export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Sign up input data
 */
export interface SignUpInput {
  email: string;
  password: string;
  passwordConfirm: string;
  displayName?: string;
}

/**
 * Sign in input data
 */
export interface SignInInput {
  email: string;
  password: string;
}

/**
 * Session information
 */
export interface Session {
  token: string;
  userId: string;
  isValid: boolean;
  expiresAt?: Date;
}

// ============================================================================
// Error Codes
// ============================================================================

export const AuthErrorCodes = {
  INVALID_CREDENTIALS: 'AUTH_001',
  ACCOUNT_LOCKED: 'AUTH_002',
  EMAIL_NOT_VERIFIED: 'AUTH_003',
  SESSION_EXPIRED: 'AUTH_004',
  OAUTH_ERROR: 'AUTH_005',
  VALIDATION_ERROR: 'AUTH_006',
  USER_EXISTS: 'AUTH_007',
  UNKNOWN_ERROR: 'AUTH_999',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts a PocketBase auth record to our User type
 */
function recordToUser(record: RecordAuthResponse<User>['record']): User {
  return {
    id: record.id,
    collectionId: record.collectionId,
    collectionName: 'users',
    created: record.created,
    updated: record.updated,
    email: record.email,
    emailVisibility: record.emailVisibility ?? false,
    verified: record.verified ?? false,
    displayName: record.displayName ?? null,
    avatarUrl: record.avatarUrl ?? null,
    preferences: record.preferences ?? null,
    failedLoginAttempts: record.failedLoginAttempts ?? null,
    lastFailedLogin: record.lastFailedLogin ?? null,
    lockedUntil: record.lockedUntil ?? null,
  };
}

/**
 * Creates an AuthResult from a successful authentication
 */
function createSuccessResult(
  record: RecordAuthResponse<User>['record'],
  token: string
): AuthResult {
  return {
    success: true,
    user: recordToUser(record),
    token,
    error: null,
  };
}

/**
 * Creates an AuthResult from an error
 */
function createErrorResult(error: AuthError): AuthResult {
  return {
    success: false,
    user: null,
    token: null,
    error,
  };
}

/**
 * Parses PocketBase errors into AuthError
 */
function parseError(err: unknown): AuthError {
  if (err instanceof ClientResponseError) {
    // Handle specific PocketBase error codes
    if (err.status === 400) {
      // Validation errors
      const data = err.data as Record<string, unknown>;
      if (data?.data) {
        const fieldErrors = data.data as Record<string, { code: string; message: string }>;
        
        // Check for specific field errors
        if (fieldErrors.email?.code === 'validation_invalid_email') {
          return {
            code: AuthErrorCodes.VALIDATION_ERROR,
            message: 'Invalid email address',
            details: fieldErrors,
          };
        }
        
        if (fieldErrors.password?.code === 'validation_length_out_of_range') {
          return {
            code: AuthErrorCodes.VALIDATION_ERROR,
            message: 'Password must be at least 8 characters',
            details: fieldErrors,
          };
        }

        if (fieldErrors.email?.code === 'validation_not_unique') {
          return {
            code: AuthErrorCodes.USER_EXISTS,
            message: 'A user with this email already exists',
            details: fieldErrors,
          };
        }
      }
      
      return {
        code: AuthErrorCodes.VALIDATION_ERROR,
        message: err.message || 'Validation failed',
        details: err.data as Record<string, unknown>,
      };
    }
    
    if (err.status === 401) {
      return {
        code: AuthErrorCodes.INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      };
    }
    
    if (err.status === 403) {
      // Could be locked account or unverified email
      const message = err.message?.toLowerCase() || '';
      if (message.includes('locked')) {
        return {
          code: AuthErrorCodes.ACCOUNT_LOCKED,
          message: 'Account temporarily locked. Try again later.',
        };
      }
      if (message.includes('verified')) {
        return {
          code: AuthErrorCodes.EMAIL_NOT_VERIFIED,
          message: 'Please verify your email address',
        };
      }
      return {
        code: AuthErrorCodes.INVALID_CREDENTIALS,
        message: 'Access denied',
      };
    }
    
    return {
      code: AuthErrorCodes.UNKNOWN_ERROR,
      message: err.message || 'An unexpected error occurred',
      details: { status: err.status, data: err.data },
    };
  }
  
  if (err instanceof Error) {
    return {
      code: AuthErrorCodes.UNKNOWN_ERROR,
      message: err.message,
    };
  }
  
  return {
    code: AuthErrorCodes.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
  };
}

// ============================================================================
// Auth Service Class
// ============================================================================

/**
 * Authentication Service
 * 
 * Provides methods for user authentication including:
 * - Email/password sign up and sign in
 * - OAuth provider authentication
 * - Password reset
 * - Session management
 */
export class AuthService {
  private pb: PocketBase;

  constructor(pb?: PocketBase) {
    this.pb = pb ?? getPocketBaseClient();
  }

  /**
   * Creates a new user account with email and password.
   * Also creates a default "Personal" workspace for the new user.
   * 
   * Requirements: 1.1, 9.2
   * 
   * @param input - Sign up data including email, password, and optional display name
   * @returns AuthResult with user data on success, or error on failure
   */
  async signUp(input: SignUpInput): Promise<AuthResult> {
    try {
      // Validate password confirmation
      if (input.password !== input.passwordConfirm) {
        return createErrorResult({
          code: AuthErrorCodes.VALIDATION_ERROR,
          message: 'Passwords do not match',
        });
      }

      // Create the user record
      const record = await this.pb.collection('users').create<User>({
        email: input.email,
        password: input.password,
        passwordConfirm: input.passwordConfirm,
        displayName: input.displayName || null,
        preferences: null,
        avatarUrl: null,
      });

      // Request email verification (PocketBase sends verification email)
      try {
        await this.pb.collection('users').requestVerification(input.email);
      } catch {
        // Verification email failure shouldn't fail the signup
        console.warn('Failed to send verification email');
      }

      // Auto sign in after signup
      const authResult = await this.pb.collection('users').authWithPassword<User>(
        input.email,
        input.password
      );

      // Create default "Personal" workspace for the new user
      // Requirements: 9.2
      try {
        const workspaceService = new WorkspaceService(this.pb);
        await workspaceService.createDefaultWorkspace();
      } catch {
        // Default workspace creation failure shouldn't fail the signup
        // The user can create a workspace manually later
        console.warn('Failed to create default workspace for new user');
      }

      return createSuccessResult(authResult.record, authResult.token);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Signs in a user with email and password.
   * Implements account lockout after 3 consecutive failed attempts.
   * 
   * Requirements: 1.2, 1.5
   * 
   * @param input - Sign in credentials
   * @returns AuthResult with user data and token on success
   */
  async signIn(input: SignInInput): Promise<AuthResult> {
    try {
      // First, check if the account is locked by looking up the user
      const lockoutCheck = await this.checkAccountLockout(input.email);
      if (lockoutCheck.isLocked) {
        return createErrorResult({
          code: AuthErrorCodes.ACCOUNT_LOCKED,
          message: `Account temporarily locked. Try again in ${lockoutCheck.remainingMinutes} minutes.`,
          details: { lockedUntil: lockoutCheck.lockedUntil },
        });
      }

      // Attempt authentication
      const authResult = await this.pb.collection('users').authWithPassword<User>(
        input.email,
        input.password
      );

      // On successful login, reset failed attempts
      await this.resetFailedAttempts(authResult.record.id);

      return createSuccessResult(authResult.record, authResult.token);
    } catch (err) {
      // On failed login, increment failed attempts
      await this.handleFailedLogin(input.email);
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Checks if an account is currently locked out.
   * 
   * @param email - Email address to check
   * @returns Lockout status with remaining time if locked
   */
  private async checkAccountLockout(email: string): Promise<{
    isLocked: boolean;
    remainingMinutes?: number;
    lockedUntil?: string;
  }> {
    try {
      // Use a separate admin client to look up user by email
      const adminPb = createPocketBaseClient();
      const users = await adminPb.collection('users').getList<User>(1, 1, {
        filter: `email = "${email}"`,
      });

      if (users.items.length === 0) {
        // User not found - don't reveal this, just return not locked
        return { isLocked: false };
      }

      const user = users.items[0];
      
      if (!user || !user.lockedUntil) {
        return { isLocked: false };
      }

      const lockedUntilDate = new Date(user.lockedUntil);
      const now = new Date();

      if (lockedUntilDate > now) {
        const remainingMs = lockedUntilDate.getTime() - now.getTime();
        const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
        return {
          isLocked: true,
          remainingMinutes,
          lockedUntil: user.lockedUntil,
        };
      }

      // Lock has expired - clear it
      await adminPb.collection('users').update(user.id, {
        lockedUntil: null,
        failedLoginAttempts: 0,
      });

      return { isLocked: false };
    } catch {
      // On error, allow login attempt to proceed
      return { isLocked: false };
    }
  }

  /**
   * Handles a failed login attempt by incrementing the counter and potentially locking the account.
   * 
   * Requirements: 1.5
   * 
   * @param email - Email address of the failed login attempt
   */
  private async handleFailedLogin(email: string): Promise<void> {
    try {
      const adminPb = createPocketBaseClient();
      const users = await adminPb.collection('users').getList<User>(1, 1, {
        filter: `email = "${email}"`,
      });

      if (users.items.length === 0) {
        // User not found - don't do anything to avoid revealing user existence
        return;
      }

      const user = users.items[0];
      if (!user) {
        return;
      }
      
      const currentAttempts = (user.failedLoginAttempts ?? 0) + 1;
      const now = new Date().toISOString();

      const updateData: Record<string, unknown> = {
        failedLoginAttempts: currentAttempts,
        lastFailedLogin: now,
      };

      // Lock account after MAX_FAILED_ATTEMPTS consecutive failures
      if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
        updateData.lockedUntil = lockUntil.toISOString();
      }

      await adminPb.collection('users').update(user.id, updateData);
    } catch {
      // Silently fail - don't block login flow due to tracking errors
      console.warn('Failed to track login attempt');
    }
  }

  /**
   * Resets failed login attempts after a successful login.
   * 
   * @param userId - ID of the user who successfully logged in
   */
  private async resetFailedAttempts(userId: string): Promise<void> {
    try {
      await this.pb.collection('users').update(userId, {
        failedLoginAttempts: 0,
        lastFailedLogin: null,
        lockedUntil: null,
      });
    } catch {
      // Silently fail - don't block login flow due to reset errors
      console.warn('Failed to reset login attempts');
    }
  }

  /**
   * Signs out the current user by clearing the auth store.
   * 
   * Requirements: 1.2
   */
  signOut(): void {
    this.pb.authStore.clear();
  }

  /**
   * Initiates OAuth authentication with the specified provider.
   * 
   * Requirements: 1.4
   * 
   * Note: This method returns the OAuth2 URL and code verifier for the client
   * to handle the redirect flow. The actual authentication is completed
   * via authWithOAuth2Code after the provider redirects back.
   * 
   * @param provider - OAuth provider (google, github, apple)
   * @param redirectUrl - URL to redirect to after OAuth completion
   * @returns Promise with OAuth URL and code verifier, or error
   */
  async getOAuthUrl(
    provider: OAuthProvider,
    redirectUrl: string
  ): Promise<{ url: string; codeVerifier: string } | AuthError> {
    try {
      const authMethods = await this.pb.collection('users').listAuthMethods();
      const providerConfig = authMethods.oauth2?.providers?.find(
        (p) => p.name === provider
      );

      if (!providerConfig) {
        return {
          code: AuthErrorCodes.OAUTH_ERROR,
          message: `OAuth provider '${provider}' is not configured`,
        };
      }

      // Generate code verifier for PKCE
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);

      // Build OAuth URL - use type assertion for provider config properties
      // PocketBase SDK types may vary between versions
      const config = providerConfig as {
        name: string;
        clientId?: string;
        authURL?: string;
        scopes?: string[];
        state: string;
        authUrl?: string;
      };
      
      const clientId = config.clientId ?? '';
      const authURL = config.authURL ?? config.authUrl ?? '';
      const scopes = config.scopes ?? [];
      
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUrl,
        response_type: 'code',
        scope: scopes.join(' '),
        state: config.state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      return {
        url: `${authURL}?${params.toString()}`,
        codeVerifier,
      };
    } catch (err) {
      const error = parseError(err);
      error.code = AuthErrorCodes.OAUTH_ERROR;
      return error;
    }
  }

  /**
   * Completes OAuth authentication after provider redirect.
   * Creates a default "Personal" workspace for new OAuth users.
   * 
   * Requirements: 1.4, 9.2
   * 
   * @param provider - OAuth provider
   * @param code - Authorization code from provider
   * @param codeVerifier - Code verifier from getOAuthUrl
   * @param redirectUrl - Same redirect URL used in getOAuthUrl
   * @returns AuthResult with user data on success
   */
  async signInWithOAuth(
    provider: OAuthProvider,
    code: string,
    codeVerifier: string,
    redirectUrl: string
  ): Promise<AuthResult> {
    try {
      const authResult = await this.pb.collection('users').authWithOAuth2Code<User>(
        provider,
        code,
        codeVerifier,
        redirectUrl
      );

      // Check if this is a new user (created just now) by comparing created and updated timestamps
      // For new OAuth users, create a default workspace
      // Requirements: 9.2
      const isNewUser = authResult.meta?.isNew === true;
      if (isNewUser) {
        try {
          const workspaceService = new WorkspaceService(this.pb);
          await workspaceService.createDefaultWorkspace();
        } catch {
          // Default workspace creation failure shouldn't fail the OAuth flow
          console.warn('Failed to create default workspace for new OAuth user');
        }
      }

      return createSuccessResult(authResult.record, authResult.token);
    } catch (err) {
      const error = parseError(err);
      error.code = AuthErrorCodes.OAUTH_ERROR;
      return createErrorResult(error);
    }
  }

  /**
   * Requests a password reset email.
   * 
   * Requirements: 1.3
   * 
   * @param email - Email address to send reset link to
   * @returns true if request was sent, error otherwise
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; error?: AuthError }> {
    try {
      await this.pb.collection('users').requestPasswordReset(email);
      return { success: true };
    } catch (err) {
      return { success: false, error: parseError(err) };
    }
  }

  /**
   * Confirms a password reset with the token from the reset email.
   * 
   * Requirements: 1.3
   * 
   * @param token - Reset token from email
   * @param newPassword - New password
   * @param newPasswordConfirm - Password confirmation
   * @returns true if password was reset, error otherwise
   */
  async confirmPasswordReset(
    token: string,
    newPassword: string,
    newPasswordConfirm: string
  ): Promise<{ success: boolean; error?: AuthError }> {
    try {
      if (newPassword !== newPasswordConfirm) {
        return {
          success: false,
          error: {
            code: AuthErrorCodes.VALIDATION_ERROR,
            message: 'Passwords do not match',
          },
        };
      }

      await this.pb.collection('users').confirmPasswordReset(
        token,
        newPassword,
        newPasswordConfirm
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: parseError(err) };
    }
  }

  /**
   * Gets the current session information.
   * 
   * @returns Session object if authenticated, null otherwise
   */
  getSession(): Session | null {
    if (!this.pb.authStore.isValid) {
      return null;
    }

    return {
      token: this.pb.authStore.token,
      userId: this.pb.authStore.record?.id ?? '',
      isValid: this.pb.authStore.isValid,
    };
  }

  /**
   * Gets the currently authenticated user.
   * 
   * @returns User object if authenticated, null otherwise
   */
  getUser(): User | null {
    if (!this.pb.authStore.isValid || !this.pb.authStore.record) {
      return null;
    }

    const record = this.pb.authStore.record;
    return {
      id: record.id,
      collectionId: record.collectionId,
      collectionName: 'users',
      created: record.created,
      updated: record.updated,
      email: record.email,
      emailVisibility: record.emailVisibility ?? false,
      verified: record.verified ?? false,
      displayName: record.displayName ?? null,
      avatarUrl: record.avatarUrl ?? null,
      preferences: record.preferences ?? null,
      failedLoginAttempts: record.failedLoginAttempts ?? null,
      lastFailedLogin: record.lastFailedLogin ?? null,
      lockedUntil: record.lockedUntil ?? null,
    };
  }

  /**
   * Refreshes the current authentication token.
   * 
   * @returns AuthResult with refreshed token on success
   */
  async refreshAuth(): Promise<AuthResult> {
    try {
      const authResult = await this.pb.collection('users').authRefresh<User>();
      return createSuccessResult(authResult.record, authResult.token);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Updates the current user's profile.
   * 
   * @param data - Profile data to update
   * @returns Updated user on success, error otherwise
   */
  async updateProfile(data: {
    displayName?: string;
    avatarUrl?: string;
    preferences?: UserPreferences;
  }): Promise<{ user: User | null; error?: AuthError }> {
    try {
      const userId = this.pb.authStore.record?.id;
      if (!userId) {
        return {
          user: null,
          error: {
            code: AuthErrorCodes.SESSION_EXPIRED,
            message: 'Not authenticated',
          },
        };
      }

      const record = await this.pb.collection('users').update<User>(userId, data);
      return {
        user: {
          id: record.id,
          collectionId: record.collectionId,
          collectionName: 'users',
          created: record.created,
          updated: record.updated,
          email: record.email,
          emailVisibility: record.emailVisibility ?? false,
          verified: record.verified ?? false,
          displayName: record.displayName ?? null,
          avatarUrl: record.avatarUrl ?? null,
          preferences: record.preferences ?? null,
          failedLoginAttempts: record.failedLoginAttempts ?? null,
          lastFailedLogin: record.lastFailedLogin ?? null,
          lockedUntil: record.lockedUntil ?? null,
        },
      };
    } catch (err) {
      return { user: null, error: parseError(err) };
    }
  }

  /**
   * Checks if the current session is valid.
   * 
   * @returns true if authenticated with valid session
   */
  isAuthenticated(): boolean {
    return this.pb.authStore.isValid;
  }

  /**
   * Gets the underlying PocketBase client.
   * Useful for advanced operations.
   */
  getPocketBase(): PocketBase {
    return this.pb;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Generates a random code verifier for PKCE
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return this.base64UrlEncode(array);
  }

  /**
   * Generates a code challenge from the verifier for PKCE
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(verifier);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return this.base64UrlEncode(new Uint8Array(hash));
    }
    // Fallback: return verifier as-is (less secure but works)
    return verifier;
  }

  /**
   * Base64 URL encodes a byte array
   */
  private base64UrlEncode(array: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...array));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new AuthService instance with a fresh PocketBase client.
 * Use this for server-side operations.
 */
export function createAuthService(): AuthService {
  return new AuthService(createPocketBaseClient());
}

/**
 * Gets the singleton AuthService instance for client-side usage.
 */
let clientAuthService: AuthService | null = null;

export function getAuthService(): AuthService {
  if (typeof window === 'undefined') {
    // Server-side: always create a new instance
    return createAuthService();
  }

  // Client-side: reuse the same instance
  if (!clientAuthService) {
    clientAuthService = new AuthService();
  }

  return clientAuthService;
}
