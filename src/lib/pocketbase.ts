import PocketBase from 'pocketbase';

// PocketBase URLs from environment variables
// - NEXT_PUBLIC_POCKETBASE_URL: Used by browser (client-side) - must be accessible from user's browser
// - POCKETBASE_URL: Used by server (SSR) - can use internal Docker network hostname
const getServerUrl = () => process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
const getClientUrl = () => process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

/**
 * Creates a new PocketBase client instance.
 * Uses appropriate URL based on execution context (server vs client).
 */
export function createPocketBaseClient(): PocketBase {
  const url = typeof window === 'undefined' ? getServerUrl() : getClientUrl();
  return new PocketBase(url);
}

/**
 * Singleton PocketBase client for client-side usage.
 * Use this for browser-side operations where state persistence is desired.
 */
let browserClient: PocketBase | null = null;

export function getPocketBaseClient(): PocketBase {
  if (typeof window === 'undefined') {
    // Server-side: always create a new instance
    return createPocketBaseClient();
  }

  // Client-side: reuse the same instance
  if (!browserClient) {
    browserClient = createPocketBaseClient();
  }

  return browserClient;
}

/**
 * Get the PocketBase URL for configuration purposes.
 * Returns the client-accessible URL.
 */
export function getPocketBaseUrl(): string {
  return getClientUrl();
}

/**
 * Type-safe wrapper for PocketBase authentication state.
 */
export interface AuthState {
  isValid: boolean;
  token: string;
  userId: string | null;
}

/**
 * Get current authentication state from a PocketBase client.
 */
export function getAuthState(pb: PocketBase): AuthState {
  return {
    isValid: pb.authStore.isValid,
    token: pb.authStore.token,
    userId: pb.authStore.record?.id ?? null,
  };
}

/**
 * Clear authentication state from a PocketBase client.
 */
export function clearAuth(pb: PocketBase): void {
  pb.authStore.clear();
}


/**
 * Creates a new PocketBase client instance authenticated as admin.
 * Use this for server-side privileged operations (like searching users).
 */
export async function createAdminClient(): Promise<PocketBase> {
  const pb = createPocketBaseClient();
  const email = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@checkmate.dev';
  const password = process.env.POCKETBASE_ADMIN_PASSWORD || 'password123456';
  
  try {
    await pb.admins.authWithPassword(email, password);
    // console.log('Admin client authenticated successfully for URL:', POCKETBASE_URL);
  } catch (error) {
    console.error('Failed to authenticate as admin:', error);
    // Return unauthenticated client (operations will likely fail)
  }
  
  return pb;
}

export default PocketBase;
