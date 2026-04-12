/**
 * Shared route-handler helpers.
 *
 * Every [id] route in this app follows the same three-step shape:
 *   1. Await route params
 *   2. Resolve auth (required or optional)
 *   3. Run handler logic, return a JSON response; trap exceptions and
 *      emit a 500 with the owning service's UNKNOWN_ERROR code.
 *
 * `withAuth` / `withPublicAccess` wrap that scaffolding so handlers can
 * focus on business logic. `apiError` centralises the error-response
 * shape so every route emits the same `{ code, message, details?,
 * timestamp }` envelope.
 */

import { NextRequest, NextResponse } from 'next/server';
import type PocketBase from 'pocketbase';
import { getServerAuth } from '@/lib/server-auth';
import type { User } from '@/lib/pocketbase-types';

interface ErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

interface ErrorResponseBody {
  success: false;
  error: ErrorPayload;
}

/**
 * Formatted JSON error response with an ISO timestamp.
 */
export function apiError(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse<ErrorResponseBody> {
  const payload: ErrorPayload = {
    code,
    message,
    timestamp: new Date().toISOString(),
  };
  if (details !== undefined) {
    payload.details = details;
  }
  return NextResponse.json<ErrorResponseBody>(
    { success: false, error: payload },
    { status }
  );
}

interface RouteContext<P> {
  params: Promise<P>;
}

export interface PublicHandlerContext<P> {
  req: NextRequest;
  params: P;
  isAuthenticated: boolean;
  user: User | null;
  pb: PocketBase;
}

export interface AuthedHandlerContext<P> {
  req: NextRequest;
  params: P;
  user: User;
  pb: PocketBase;
}

interface RouteErrorOptions {
  /** Prefix for console.error on uncaught exceptions, e.g. "Get template" */
  tag: string;
  /** Service-specific error code used when an uncaught exception reaches the wrapper (500) */
  unknownCode: string;
}

interface AuthedRouteOptions extends RouteErrorOptions {
  /** Service-specific error code used when the caller is unauthenticated (401) */
  unauthorizedCode: string;
}

type RouteHandler<P, R> = (
  req: NextRequest,
  ctx: RouteContext<P>
) => Promise<NextResponse<R> | NextResponse<ErrorResponseBody>>;

/**
 * Wrap a handler that permits unauthenticated access. The handler
 * receives the resolved auth state and must return a NextResponse.
 * Uncaught exceptions become a 500 with the configured `unknownCode`.
 */
export function withPublicAccess<P, R>(
  options: RouteErrorOptions,
  handler: (ctx: PublicHandlerContext<P>) => Promise<NextResponse<R>>
): RouteHandler<P, R> {
  return async (req, routeCtx) => {
    try {
      const params = await routeCtx.params;
      const { isAuthenticated, user, pb } = await getServerAuth();
      return await handler({ req, params, isAuthenticated, user, pb });
    } catch (error) {
      console.error(`${options.tag} error:`, error);
      return apiError(options.unknownCode, 'An unexpected error occurred', 500);
    }
  };
}

/**
 * Wrap a handler that requires authentication. Unauthenticated callers
 * get a 401 with `unauthorizedCode`. Uncaught exceptions become a 500
 * with `unknownCode`.
 */
export function withAuth<P, R>(
  options: AuthedRouteOptions,
  handler: (ctx: AuthedHandlerContext<P>) => Promise<NextResponse<R>>
): RouteHandler<P, R> {
  return async (req, routeCtx) => {
    try {
      const params = await routeCtx.params;
      const { isAuthenticated, user, pb } = await getServerAuth();
      if (!isAuthenticated || !user) {
        return apiError(options.unauthorizedCode, 'Authentication required', 401);
      }
      return await handler({ req, params, user, pb });
    } catch (error) {
      console.error(`${options.tag} error:`, error);
      return apiError(options.unknownCode, 'An unexpected error occurred', 500);
    }
  };
}
