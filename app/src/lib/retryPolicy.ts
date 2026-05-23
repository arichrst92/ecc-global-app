/**
 * React Query retry policy — smart classification per error type.
 *
 * Rationale:
 * - 4xx errors (BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, etc) = client bug atau
 *   stale auth. Retry tidak akan resolve, hanya delay error feedback ke user.
 * - 5xx errors (server crash, gateway timeout) = transient infrastructure issue.
 *   Retry dengan exponential backoff bisa recover.
 * - Network errors (fetch fail, AbortError, TypeError) = device offline /
 *   poor signal. Retry dengan backoff useful (user mungkin pindah tempat dapat
 *   signal lagi).
 *
 * Pattern: pass `retry: shouldRetry` ke useQuery / useMutation, atau set di
 * QueryClient defaultOptions untuk apply globally.
 */

import { ApiError } from '@/types/api';

/** Max retry attempts untuk query (read). Mutation usually 0 atau 1
 *  karena side-effect risk. */
const MAX_QUERY_RETRIES = 3;
const MAX_MUTATION_RETRIES = 2;

/**
 * Decide apakah suatu error worth retrying.
 *
 * @param failureCount  Current attempt number (1 = first retry after initial fail)
 * @param error         Error thrown by queryFn / mutationFn
 * @param maxRetries    Cap retry attempts
 */
function shouldRetryError(
  failureCount: number,
  error: unknown,
  maxRetries: number,
): boolean {
  if (failureCount >= maxRetries) return false;

  // ApiError dari kita sendiri — classify by status code
  if (error instanceof ApiError) {
    const status = error.status;
    // 5xx server errors — retry
    if (status >= 500 && status < 600) return true;
    // 408 Request Timeout — retry
    if (status === 408) return true;
    // 429 Too Many Requests — retry dengan backoff (delay will give server breath)
    if (status === 429) return true;
    // 4xx lainnya (400, 401, 403, 404, 409, etc) — don't retry, error legit
    return false;
  }

  // Native fetch errors — TypeError ("Network request failed") = network issue.
  // AbortError = user cancelled atau timeout di-fire. Network: retry, Abort: no.
  if (error instanceof Error) {
    if (error.name === 'AbortError') return false;
    // Most network errors hit ini — retry
    return true;
  }

  // Unknown error shape — retry once untuk safety, kalau persist drop
  return failureCount < 1;
}

/** Retry function untuk useQuery. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return shouldRetryError(failureCount, error, MAX_QUERY_RETRIES);
}

/** Retry function untuk useMutation — lebih konservatif (max 2). */
export function shouldRetryMutation(failureCount: number, error: unknown): boolean {
  return shouldRetryError(failureCount, error, MAX_MUTATION_RETRIES);
}

/**
 * Exponential backoff dengan jitter.
 *
 * Sequence: 1s, 2s, 4s (capped). Plus ±20% jitter untuk avoid thundering herd
 * kalau banyak client retry bersamaan setelah server recovery.
 *
 * React Query default: `Math.min(1000 * 2 ** attemptIndex, 30000)` (no jitter).
 * Kita override untuk add jitter.
 */
export function retryBackoffDelay(attemptIndex: number): number {
  const base = Math.min(1000 * 2 ** attemptIndex, 8000);
  // ±20% jitter
  const jitter = base * 0.2 * (Math.random() * 2 - 1);
  return Math.max(500, Math.round(base + jitter));
}
