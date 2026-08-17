import { ApiErrorCode, type ApiErrorBody } from '@booking/shared';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const SAFE_METHODS = new Set(['GET', 'HEAD']);

/**
 * Error carrying the server's machine-readable code, so screens can react to
 * specific situations (a slot being taken, a session expiring) instead of
 * matching on message text.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** The slot went away: either never offered, or taken while the user typed. */
  get isSlotConflict(): boolean {
    return this.code === ApiErrorCode.SLOT_TAKEN || this.code === ApiErrorCode.SLOT_UNAVAILABLE;
  }
}

function readCsrfCookie(): string | null {
  const match = new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`).exec(document.cookie);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * The API sets a readable CSRF cookie on any response. If this is the very first
 * request of a session the cookie may not exist yet, so ask for one.
 */
async function ensureCsrfToken(): Promise<string | null> {
  const existing = readCsrfCookie();

  if (existing) {
    return existing;
  }

  await fetch('/api/auth/csrf', { credentials: 'same-origin' });
  return readCsrfCookie();
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> = {};

  try {
    body = (await response.json()) as Partial<ApiErrorBody>;
  } catch {
    // A non-JSON error body means something outside the API failed, such as the
    // reverse proxy. The status alone has to carry the meaning.
  }

  return new ApiError(
    response.status,
    body.code ?? ApiErrorCode.INTERNAL,
    body.message ?? fallbackMessage(response.status),
    body.details,
  );
}

function fallbackMessage(status: number): string {
  if (status === 0 || status >= 502) {
    return 'The server is unreachable. Please check your connection and try again.';
  }

  if (status >= 500) {
    return 'Something went wrong on our side. Please try again.';
  }

  return 'The request could not be completed.';
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!SAFE_METHODS.has(method)) {
    const token = await ensureCsrfToken();

    if (token) {
      headers[CSRF_HEADER_NAME] = token;
    }
  }

  let response: Response;

  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      // Same-origin in both development (via the Vite proxy) and production
      // (via Caddy), so cookies travel without CORS involvement.
      credentials: 'same-origin',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (cause) {
    throw new ApiError(0, ApiErrorCode.INTERNAL, fallbackMessage(0), [String(cause)]);
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const http = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
