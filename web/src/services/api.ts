import { reportUnauthorizedResponse } from '../lib/sessionExpiredSignal';

const API_BASE = '/api';
const CSRF_COOKIE_PATH = '/sanctum/csrf-cookie';
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN';

function fallbackErrorMessage(status: number): string {
  if (status === 413) {
    return 'That file is too large for the server to accept. Please choose a smaller file.';
  }

  if (status === 502 || status === 503 || status === 504) {
    return 'The server is temporarily unavailable. Please try again in a moment.';
  }

  if (status >= 500) {
    return 'Something went wrong on our end. Please try again.';
  }

  return 'Request failed. Please try again.';
}

function getCookie(name: string): string | null {
  const encodedName = encodeURIComponent(name);

  for (const cookie of document.cookie.split(';')) {
    const trimmed = cookie.trim();
    if (!trimmed) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const cookieName = trimmed.slice(0, separatorIndex);
    if (cookieName !== encodedName && cookieName !== name) {
      continue;
    }

    return decodeURIComponent(trimmed.slice(separatorIndex + 1));
  }

  return null;
}

async function ensureCsrfToken(): Promise<string> {
  let token = getCookie(CSRF_COOKIE_NAME);

  if (!token) {
    const response = await fetch(CSRF_COOKIE_PATH, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!response.ok) {
      throw new ApiError('Unable to initialize a secure session. Please refresh and try again.', response.status);
    }

    token = getCookie(CSRF_COOKIE_NAME);
  }

  if (!token) {
    throw new ApiError('Unable to initialize a secure session. Please refresh and try again.', 419);
  }

  return token;
}

function requiresCsrfProtection(method: string | undefined): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes((method ?? 'GET').toUpperCase());
}

export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  const method = options?.method ?? 'GET';

  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  if (!isFormData) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  if (requiresCsrfProtection(method)) {
    defaultHeaders[CSRF_HEADER_NAME] = await ensureCsrfToken();
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options?.headers,
    },
    credentials: 'include',
  });

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      reportUnauthorizedResponse();
    }

    const message = (data as { message?: string } | null)?.message || fallbackErrorMessage(response.status);
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export async function requestBlob(url: string): Promise<{ blob: Blob; filename: string | null }> {
  const response = await fetch(`${API_BASE}${url}`, {
    cache: 'no-store',
    credentials: 'include',
    headers: {
      'Accept': '*/*',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!response.ok) {
    let data: { message?: string } | null = null;
    try {
      data = await response.json() as { message?: string };
    } catch {
      data = null;
    }

    if (response.status === 401) {
      reportUnauthorizedResponse();
    }

    throw new ApiError(data?.message || fallbackErrorMessage(response.status), response.status, data ?? undefined);
  }

  const disposition = response.headers.get('content-disposition') ?? '';
  const encodedFilename = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const plainFilename = /filename="?([^";]+)"?/i.exec(disposition)?.[1];

  return {
    blob: await response.blob(),
    filename: encodedFilename
      ? decodeURIComponent(encodedFilename)
      : plainFilename ?? null,
  };
}

/**
 * Pulls Laravel's per-field validation messages out of a rejected request.
 * Returns null when the failure was not a 422, so callers can tell "the user
 * needs to fix a field" apart from "the request failed" and word it accordingly.
 */
export function toApiFieldErrors(error: unknown): Record<string, string[]> | null {
  if (!(error instanceof ApiError) || error.status !== 422) {
    return null;
  }

  return (error.data as { errors?: Record<string, string[]> } | null)?.errors ?? {};
}

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}
