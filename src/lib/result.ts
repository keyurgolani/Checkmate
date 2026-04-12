/**
 * Generic result type used by service methods to report success/failure.
 *
 * Prefer this shape over per-service `{ success, <entityName>, error }`
 * wrappers: a single generic type lets callers write reusable helpers
 * (map, match, unwrap) and avoids reinventing the pattern per entity.
 */

export type Ok<T> = { success: true; data: T; error: null };
export type Err<E> = { success: false; data: null; error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(data: T): Ok<T> => ({ success: true, data, error: null });
export const err = <E>(error: E): Err<E> => ({ success: false, data: null, error });
