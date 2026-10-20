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
 * Codes whose response never varies apart from `timestamp` and
 * `correlationId`, so a route can answer a target the actor may not see the
 * way it answers a missing one. These take no message, details or headers.
 */
type ConcealingCode = 'NOT_FOUND' | 'CAPABILITY_INVALID';
const CONCEALING: ReadonlySet<string> = new Set<ConcealingCode>(['NOT_FOUND', 'CAPABILITY_INVALID']);

/** 1 to 128 letters, digits, `.`, `_`, `:` or `-`, starting with a letter or digit. */
const CORRELATION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

interface BaseOptions {
  /** The request's correlation ID. A missing or malformed one is replaced with a generated UUID. */
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
type OptionsArgs<C extends ErrorCode> = C extends 'VALIDATION_FAILED'
  ? [options: EnvelopeOptions<C>]
  : [options?: EnvelopeOptions<C>];

/** As `OptionsArgs`, plus response headers for every code that doesn't conceal. */
type ResponseArgs<C extends ErrorCode> = C extends ConcealingCode
  ? [options?: EnvelopeOptions<C>]
  : C extends 'VALIDATION_FAILED'
    ? [options: EnvelopeOptions<C> & ResponseOptions]
    : [options?: EnvelopeOptions<C> & ResponseOptions];

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

function correlationIdFrom(supplied: string | undefined): string {
  return supplied !== undefined && CORRELATION_ID.test(supplied) ? supplied : crypto.randomUUID();
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
      correlationId: correlationIdFrom(options?.correlationId),
    },
  };
}

/** The envelope for `code`. Server actions return this object as is. */
export function errorEnvelope<C extends ErrorCode>(code: C, ...[options]: OptionsArgs<C>): ErrorEnvelope<C> {
  return buildEnvelope(code, options as LooseOptions | undefined);
}

/**
 * The envelope for `code`, sent with the code's registry status. Concealing
 * codes drop any message, details or headers a caller slips past the types.
 */
export function errorResponse<C extends ErrorCode>(
  code: C,
  ...[options]: ResponseArgs<C>
): NextResponse<ErrorEnvelope<C>> {
  const loose = options as LooseOptions | undefined;
  return NextResponse.json(buildEnvelope(code, loose), {
    status: ERROR_CODES[code].status,
    headers: CONCEALING.has(code) ? undefined : loose?.headers,
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
