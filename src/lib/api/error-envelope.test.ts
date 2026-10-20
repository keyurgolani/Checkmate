/**
 * CHECKMATE-01.2 · envelope (#30), test plan item 7: the helper emits the
 * envelope with a generated correlationId and the registry status for
 * every code, and concealed and missing NOT_FOUND bodies match.
 * error-codes.test.ts covers the registry half of item 7.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import { ERROR_CODES, isOutcomeCode, type ErrorCode, type OutcomeCode, type RegistryCode } from './error-codes';
import { errorEnvelope, errorResponse, outcomeBody, outcomeResponse, type ErrorEnvelope } from './error-envelope';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CODES = Object.keys(ERROR_CODES) as RegistryCode[];
const ERROR_ONLY = CODES.filter((code): code is ErrorCode => !isOutcomeCode(code));
const OUTCOMES = CODES.filter(isOutcomeCode);

/** The response for a code with the smallest valid options: VALIDATION_FAILED must name a field. */
function send(code: ErrorCode): Response {
  return code === 'VALIDATION_FAILED'
    ? errorResponse(code, { details: { fields: { title: 'Required' } } })
    : errorResponse(code);
}

/** Drops the per-request fields the contract lets differ between responses. */
function withoutRequestFields(envelope: ErrorEnvelope): unknown {
  const copy = structuredClone(envelope) as { error: Partial<ErrorEnvelope['error']> };
  delete copy.error.timestamp;
  delete copy.error.correlationId;
  return copy;
}

describe('errorResponse', () => {
  it('sends every error code with its registry status and a generated correlationId', async () => {
    expect(ERROR_ONLY.length).toBeGreaterThan(0);

    for (const code of ERROR_ONLY) {
      const response = send(code);
      const body = (await response.json()) as ErrorEnvelope;

      expect(response.status, code).toBe(ERROR_CODES[code].status);
      expect(body, code).toEqual({
        success: false,
        error: {
          code,
          message: ERROR_CODES[code].message,
          ...(code === 'VALIDATION_FAILED' && { details: { fields: { title: 'Required' } } }),
          timestamp: expect.any(String),
          correlationId: expect.stringMatching(UUID),
        },
      });
      expect(new Date(body.error.timestamp).toISOString()).toBe(body.error.timestamp);
    }
  });

  it('answers a failed policy lookup with 503', async () => {
    const response = errorResponse('POLICY_UNAVAILABLE');

    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe('POLICY_UNAVAILABLE');
  });

  it('keeps the caller copy, details and headers, but never the status', async () => {
    const response = errorResponse('RATE_LIMITED', {
      message: 'Too many sign-in attempts. Try again in 30 seconds.',
      details: { retryAfterSeconds: 30 },
      headers: { 'Retry-After': '30' },
    });

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('30');
    expect((await response.json()).error).toMatchObject({
      code: 'RATE_LIMITED',
      message: 'Too many sign-in attempts. Try again in 30 seconds.',
      details: { retryAfterSeconds: 30 },
    });
  });

  it('uses a supplied correlationId, and a fresh one on each response without it', async () => {
    const supplied = (await errorResponse('FORBIDDEN', { correlationId: 'req-1' }).json()) as ErrorEnvelope;
    const first = errorEnvelope('FORBIDDEN');
    const second = errorEnvelope('FORBIDDEN');

    expect(supplied.error.correlationId).toBe('req-1');
    expect(errorEnvelope('FORBIDDEN', { correlationId: '0f8c2a1e:edge.7_b-9' }).error.correlationId).toBe('0f8c2a1e:edge.7_b-9');
    expect(first.error.correlationId).toMatch(UUID);
    expect(second.error.correlationId).not.toBe(first.error.correlationId);
  });

  it('replaces a malformed correlationId with a generated one', () => {
    for (const correlationId of ['', ' req-1', 'req 1', '<script>', 'req-1\nSet-Cookie: x', '-leading', 'x'.repeat(129)]) {
      expect(errorEnvelope('FORBIDDEN', { correlationId }).error.correlationId, JSON.stringify(correlationId)).toMatch(UUID);
    }
  });

  it('sends a concealing code without the headers a caller slips past the types', () => {
    const unchecked = errorResponse as (code: ErrorCode, options?: Record<string, unknown>) => Response;
    const concealed = unchecked('NOT_FOUND', { headers: { 'X-Template-Owner': 'user-2' } });
    const revoked = unchecked('CAPABILITY_INVALID', { headers: { 'Retry-After': '30' } });

    expect(concealed.status).toBe(404);
    expect(concealed.headers.get('X-Template-Owner')).toBeNull();
    expect(revoked.headers.get('Retry-After')).toBeNull();
    expect([...concealed.headers.keys()]).toEqual([...errorResponse('NOT_FOUND').headers.keys()]);
  });
});

describe('errorEnvelope', () => {
  it('returns the response body without a status, for server actions', async () => {
    const options = { correlationId: 'req-2' };
    const body = errorEnvelope('CONFLICT', options);
    const sent = (await errorResponse('CONFLICT', options).json()) as ErrorEnvelope;

    expect(JSON.parse(JSON.stringify(body))).toEqual(body);
    expect(withoutRequestFields(body)).toEqual(withoutRequestFields(sent));
    expect(body).not.toHaveProperty('status');
  });

  it('carries the invalid fields of VALIDATION_FAILED in details.fields', () => {
    const body = errorEnvelope('VALIDATION_FAILED', { details: { fields: { title: 'Required', tags: 'At most 20' } } });

    expect(body.error.details).toEqual({ fields: { title: 'Required', tags: 'At most 20' } });
  });

  it('omits details when none are given', () => {
    expect(errorEnvelope('FORBIDDEN').error).not.toHaveProperty('details');
  });

  it('gives a concealed target and a missing one the same NOT_FOUND body apart from timestamp and correlationId', () => {
    const missing = errorEnvelope('NOT_FOUND');
    // A caller that slips target-specific text past the types still conceals.
    const unchecked = errorEnvelope as (code: ErrorCode, options?: Record<string, unknown>) => ErrorEnvelope;
    const concealed = unchecked('NOT_FOUND', { message: 'Template is private', details: { ownerId: 'user-2' } });
    const revoked = unchecked('CAPABILITY_INVALID', { message: 'Link revoked', details: { revokedAt: 'yesterday' } });

    expect(withoutRequestFields(concealed)).toEqual(withoutRequestFields(missing));
    expect(withoutRequestFields(missing)).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: ERROR_CODES.NOT_FOUND.message },
    });
    expect(withoutRequestFields(revoked)).toEqual(withoutRequestFields(errorEnvelope('CAPABILITY_INVALID')));
  });

  it('refuses a code outside the registry and an outcome code', () => {
    const unchecked = errorEnvelope as (code: string) => ErrorEnvelope;

    expect(() => unchecked('TEMPLATE_003')).toThrow(TypeError);
    expect(() => unchecked('UNCHANGED')).toThrow(TypeError);
  });
});

describe('outcome codes', () => {
  it('send every outcome code with its registry status and the success body with a top-level code', async () => {
    expect(OUTCOMES.length).toBeGreaterThan(0);

    for (const code of OUTCOMES) {
      const response = outcomeResponse(code, { revision: 4 });

      expect(response.status, code).toBe(ERROR_CODES[code].status);
      expect(await response.json(), code).toEqual({ success: true, code, revision: 4 });
    }
  });

  it('return the same body without a status, for server actions', () => {
    expect(outcomeBody('UNCHANGED', { revision: 4 })).toEqual({ success: true, code: 'UNCHANGED', revision: 4 });
    expect(outcomeBody('UNCHANGED')).toEqual({ success: true, code: 'UNCHANGED' });
  });

  it('refuse an error code', () => {
    const unchecked = outcomeBody as (code: string) => unknown;

    expect(() => unchecked('NOT_FOUND')).toThrow(TypeError);
  });
});

describe('types', () => {
  it('require details.fields for VALIDATION_FAILED, keep copy and details off concealing codes, and take no status', () => {
    // Checked by tsc; never called.
    function rejectedAtCompileTime(): void {
      // @ts-expect-error VALIDATION_FAILED must name its fields.
      errorEnvelope('VALIDATION_FAILED');
      // @ts-expect-error VALIDATION_FAILED details need fields.
      errorEnvelope('VALIDATION_FAILED', { details: { reason: 'bad' } });
      // @ts-expect-error NOT_FOUND takes no message, so a hidden target can't leak through it.
      errorEnvelope('NOT_FOUND', { message: 'Template is private' });
      // @ts-expect-error CAPABILITY_INVALID takes no details.
      errorEnvelope('CAPABILITY_INVALID', { details: { revokedAt: 'yesterday' } });
      // @ts-expect-error UNCHANGED is an outcome code.
      errorEnvelope('UNCHANGED');
      // @ts-expect-error NOT_FOUND is an error code.
      outcomeBody('NOT_FOUND');
      // @ts-expect-error The status comes from the registry.
      errorResponse('FORBIDDEN', { status: 404 });
      // @ts-expect-error A concealing code takes no headers.
      errorResponse('NOT_FOUND', { headers: { 'X-Template-Owner': 'user-2' } });
    }

    expectTypeOf(rejectedAtCompileTime).toBeFunction();
    expectTypeOf<OutcomeCode>().toEqualTypeOf<'UNCHANGED'>();
    expectTypeOf(errorEnvelope('NOT_FOUND').error.code).toEqualTypeOf<'NOT_FOUND'>();
  });
});
