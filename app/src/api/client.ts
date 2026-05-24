import { env } from '@/config/env';
import { ApiError, type ApiResponse, type ApiErrorBody } from '@/types/api';
import { useAuthStore } from '@/stores/auth.store';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  // If true, skip auth + token refresh handling (used by /auth/refresh itself)
  skipAuth?: boolean;
  // For multipart uploads
  isMultipart?: boolean;
  // If true, skip auto-report ke errorReporting saat 5xx response. Pakai untuk
  // endpoint yang punya local fallback (mis. /public/app-config, /public/cabang) —
  // gracefully handled di caller, no need pollute error dashboard.
  suppressErrorReport?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const { refreshToken, setTokens, logout } = useAuthStore.getState();
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const body = (await res.json()) as ApiResponse<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>;
      if (!body.success) {
        logout();
        return null;
      }
      await setTokens(body.data.accessToken, body.data.refreshToken);
      return body.data.accessToken;
    } catch {
      logout();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function rawRequest<T>(path: string, opts: RequestOptions): Promise<T> {
  const { body, headers, skipAuth, isMultipart, suppressErrorReport, ...rest } = opts;
  const reqHeaders: Record<string, string> = { ...((headers as Record<string, string>) ?? {}) };

  if (!skipAuth) {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) reqHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  if (!isMultipart && body !== undefined && !reqHeaders['Content-Type']) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    ...rest,
    headers: reqHeaders,
    body: body === undefined ? undefined : isMultipart ? (body as FormData) : JSON.stringify(body),
  });

  // Handle 401 — try refresh once. Skip kalau guest mode (no token to
  // refresh, jangan trigger logout). Caller hook biasanya gate dengan
  // `enabled: !isGuest` jadi sebenarnya tidak akan sampai sini, tapi defensive.
  if (res.status === 401 && !skipAuth) {
    const isGuest = useAuthStore.getState().isGuest;
    if (!isGuest) {
      const newToken = await tryRefresh();
      if (newToken) {
        reqHeaders['Authorization'] = `Bearer ${newToken}`;
        const retry = await fetch(`${env.apiBaseUrl}${path}`, {
          ...rest,
          headers: reqHeaders,
          body:
            body === undefined ? undefined : isMultipart ? (body as FormData) : JSON.stringify(body),
        });
        return parseResponse<T>(retry, suppressErrorReport);
      }
    }
  }

  return parseResponse<T>(res, suppressErrorReport);
}

async function parseResponse<T>(res: Response, suppressErrorReport?: boolean): Promise<T> {
  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!json) {
    // Server returned non-JSON (HTML 502/504 dari nginx, etc). Report
    // — biasa indicate gateway misconfig atau upstream crash. Skip kalau
    // caller opt-out (mis. endpoint dengan local fallback).
    const err = new ApiError(
      { code: 'INTERNAL_ERROR', message: 'Invalid response' },
      res.status,
    );
    if (!suppressErrorReport) {
      // Lazy import supaya cycle-safe (errorReporting → no api dependency).
      void import('@/services/errorReporting').then(({ reportError }) =>
        reportError(err, { status: res.status, url: res.url }),
      );
    }
    throw err;
  }
  if (!json.success) {
    // 5xx errors auto-reported (server-side issue worth investigating).
    // 4xx errors NOT reported — those are user/client bug, akan flood
    // (mis. setiap user yang mis-enter OTP akan fire UNAUTHORIZED).
    // suppressErrorReport=true → opt-out (untuk endpoint dengan local fallback).
    if (res.status >= 500 && !suppressErrorReport) {
      void import('@/services/errorReporting').then(({ reportError }) =>
        reportError(new Error((json as ApiErrorBody).error.message), {
          code: (json as ApiErrorBody).error.code,
          status: res.status,
          url: res.url,
        }),
      );
    }
    throw new ApiError((json as ApiErrorBody).error, res.status);
  }
  return json.data;
}

export const api = {
  get: <T,>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    rawRequest<T>(path, { ...opts, method: 'GET' }),
  post: <T,>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    rawRequest<T>(path, { ...opts, method: 'POST', body }),
  put: <T,>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    rawRequest<T>(path, { ...opts, method: 'PUT', body }),
  patch: <T,>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    rawRequest<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T,>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    rawRequest<T>(path, { ...opts, method: 'DELETE' }),
  upload: <T,>(path: string, formData: FormData) =>
    rawRequest<T>(path, { method: 'POST', body: formData, isMultipart: true }),
};
