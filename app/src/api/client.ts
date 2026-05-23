import { env } from '@/config/env';
import { ApiError, type ApiResponse, type ApiErrorBody } from '@/types/api';
import { useAuthStore } from '@/stores/auth.store';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  // If true, skip auth + token refresh handling (used by /auth/refresh itself)
  skipAuth?: boolean;
  // For multipart uploads
  isMultipart?: boolean;
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
  const { body, headers, skipAuth, isMultipart, ...rest } = opts;
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

  // Handle 401 — try refresh once
  if (res.status === 401 && !skipAuth) {
    const newToken = await tryRefresh();
    if (newToken) {
      reqHeaders['Authorization'] = `Bearer ${newToken}`;
      const retry = await fetch(`${env.apiBaseUrl}${path}`, {
        ...rest,
        headers: reqHeaders,
        body:
          body === undefined ? undefined : isMultipart ? (body as FormData) : JSON.stringify(body),
      });
      return parseResponse<T>(retry);
    }
  }

  return parseResponse<T>(res);
}

async function parseResponse<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!json) {
    // Server returned non-JSON (HTML 502/504 dari nginx, etc). Report to Sentry
    // — biasa indicate gateway misconfig atau upstream crash.
    const err = new ApiError(
      { code: 'INTERNAL_ERROR', message: 'Invalid response' },
      res.status,
    );
    // Lazy import supaya cycle-safe (errorReporting → no api dependency).
    void import('@/services/errorReporting').then(({ reportError }) =>
      reportError(err, { status: res.status, url: res.url }),
    );
    throw err;
  }
  if (!json.success) {
    // 5xx errors auto-reported (server-side issue worth investigating).
    // 4xx errors NOT reported — those are user/client bug, akan flood Sentry
    // (mis. setiap user yang mis-enter OTP akan fire UNAUTHORIZED).
    if (res.status >= 500) {
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
