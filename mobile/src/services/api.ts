import { Platform } from 'react-native';
import { deleteAppStorageItem, getAppStorageItem, setAppStorageItem } from './appStorage';

const TOKEN_KEY = 'auth_token';

const DEFAULT_ANDROID_BASE = 'http://10.0.2.2:8000/api';
const DEFAULT_IOS_BASE = 'http://localhost:8000/api';

const API_BASE = (() => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:8000/api`;
  }
  if (Platform.OS === 'android') return DEFAULT_ANDROID_BASE;
  if (Platform.OS === 'ios') return DEFAULT_IOS_BASE;
  return DEFAULT_IOS_BASE;
})();

export class ApiError extends Error {
  status: number;
  data: unknown;

  /** `0` when the request never reached the server — see the transport catch in `request`. */
  constructor(message: string, status: number, data?: unknown, cause?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.cause = cause;
  }
}

export function toFieldErrors(error: unknown): Record<string, string[]> {
  if (error instanceof ApiError && error.status === 422 && error.data) {
    const data = error.data as { errors?: Record<string, string[]> };
    if (data.errors) return data.errors;
  }
  return {};
}

export async function getToken(): Promise<string | null> {
  return getAppStorageItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await setAppStorageItem(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await deleteAppStorageItem(TOKEN_KEY);
}

export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Client': 'mobile',
    ...(options?.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options?.body && typeof options.body === 'string') {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }

  // A transport-level failure — no connection, DNS, TLS, or a request body the
  // runtime cannot serialise — rejects with the platform's own Error, whose
  // message is a Java/native string. Screens render `error.message` directly,
  // so an unwrapped rejection would show the user things like
  // `fetch failed: java.net.ConnectException: Failed to connect to
  // localhost/127.0.0.1:8000`, leaking the internal host and port. API
  // responses never leak backend internals; this keeps the client to the same
  // standard. The original error is kept as `cause` for logging.
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new ApiError(
      'Could not reach the server. Check your connection and try again.',
      0,
      null,
      error,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    const body = isJson ? await response.json() : await response.text();
    const message = typeof body === 'object' && body !== null && 'message' in body
      ? (body as { message: string }).message
      : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, body);
  }

  if (isJson) {
    return response.json() as Promise<T>;
  }

  return response.text() as unknown as T;
}

export function getApiBase(): string {
  return API_BASE;
}

export function resolveStorageUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }
  if (path.startsWith('http')) {
    return path;
  }
  const origin = API_BASE.replace(/\/api$/, '');
  return `${origin}${path}`;
}
