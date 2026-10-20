/**
 * CHECKMATE-01.2 · envelope (#30): the one error body.
 *
 *   { success: false, error: { code, message, details?, timestamp, correlationId } }
 *
 * Routes return `errorResponse(code)`, which sends the envelope with the
 * code's registry status. Server actions return `errorEnvelope(code)`, the
 * same object without a status. Outcome codes return the success body with
 * a top-level `code` through `outcomeResponse` or `outcomeBody`.
 *
 * `correlationId` is generated until #32 (CHECKMATE-02.1) passes the
 * request's. #91 (CHECKMATE-21.3) moves routes here from `apiError`.
 */

import { NextResponse } from 'next/server';
import {
  ERROR_CODES,
  isOutcomeCode,
  isRegistryCode,
  type CodeSpec,
  type ErrorCode,
  type OutcomeCode,
} from './error-codes';

export interface ErrorEnvelope<C extends ErrorCode = ErrorCode> {
  success: false;
  error: {
    code: C;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    correlationId: string;
  };
}

/** Field name to what is wrong with its value. */
export type FieldErrors = Record<string, string>;

/**
 * Codes whose body never varies. A target the actor may not see answers
 * exactly like a missing one, so these ignore any message or details.
 */
type ConcealingCode = 'NOT_FOUND' | 'CAPABILITY_INVALID';
const CONCEALING: ReadonlySet<string> = new Set<ConcealingCode>(['NOT_FOUND', 'CAPABILITY_INVALID']);

interface BaseOptions {
  /** The request's correlation ID. Generated when absent. */
  correlationId?: string;
}

interface MessageOptions extends BaseOptions {
  /** Replaces the registry copy. */
  message?: string;
}

export type EnvelopeOptions<C extends ErrorCode> = C extends ConcealingCode
  ? BaseOptions
  : C extends 'VALIDATION_FAILED'
    ? MessageOptions & { details: { fields: FieldErrors } & Record<string, unknown> }
    : MessageOptions & { details?: Record<string, unknown> };

export interface ResponseOptions {
  /** Extra response headers, such as `Retry-After`. The status always comes from the registry. */
  headers?: HeadersInit;
}

/** `VALIDATION_FAILED` must name its fields; every other code's options are optional. */
type OptionsArgs<C extends ErrorCode, Extra = unknown> = C extends 'VALIDATION_FAILED'
  ? [options: EnvelopeOptions<C> & Extra]
  : [options?: EnvelopeOptions<C> & Extra];

interface LooseOptions extends MessageOptions, ResponseOptions {
  details?: Record<string, unknown>;
}

function specFor(code: string, kind: 'error' | 'outcome'): CodeSpec {
  if (!isRegistryCode(code)) {
    throw new TypeError(`${code} is not in the error code registry`);
  }
  if (isOutcomeCode(code) !== (kind === 'outcome')) {
    throw new TypeError(`${code} is ${kind === 'outcome' ? 'an error' : 'an outcome'} code`);
  }
  return ERROR_CODES[code];
}

function buildEnvelope<C extends ErrorCode>(code: C, options: LooseOptions | undefined): ErrorEnvelope<C> {
  const spec = specFor(code, 'error');
  const concealed = CONCEALING.has(code);
  const message = (!concealed && options?.message) || spec.message;
  const details = concealed ? undefined : options?.details;
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
      timestamp: new Date().toISOString(),
      correlationId: options?.correlationId || crypto.randomUUID(),
    },
  };
}

/** The envelope for `code`. Server actions return this object as is. */
export function errorEnvelope<C extends ErrorCode>(code: C, ...[options]: OptionsArgs<C>): ErrorEnvelope<C> {
  return buildEnvelope(code, options as LooseOptions | undefined);
}

/** The envelope for `code`, sent with the code's registry status. */
export function errorResponse<C extends ErrorCode>(
  code: C,
  ...[options]: OptionsArgs<C, ResponseOptions>
): NextResponse<ErrorEnvelope<C>> {
  const loose = options as LooseOptions | undefined;
  return NextResponse.json(buildEnvelope(code, loose), {
    status: ERROR_CODES[code].status,
    headers: loose?.headers,
  });
}

export type OutcomeBody<C extends OutcomeCode, T extends object> = Omit<T, 'success' | 'code'> & {
  success: true;
  code: C;
};

/** The success body for an outcome code. Server actions return this object as is. */
export function outcomeBody<C extends OutcomeCode, T extends object = Record<never, never>>(
  code: C,
  data?: T
): OutcomeBody<C, T> {
  specFor(code, 'outcome');
  return { ...data, success: true, code } as OutcomeBody<C, T>;
}

/** The success body for an outcome code, sent with the code's registry status. */
export function outcomeResponse<C extends OutcomeCode, T extends object = Record<never, never>>(
  code: C,
  data?: T,
  options?: ResponseOptions
): NextResponse<OutcomeBody<C, T>> {
  return NextResponse.json(outcomeBody(code, data), {
    status: ERROR_CODES[code].status,
    headers: options?.headers,
  });
}
