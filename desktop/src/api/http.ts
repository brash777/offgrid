import { es } from '../i18n/es';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

interface ErrorBody {
  code?: string;
  message?: string;
  fields?: Record<string, string>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export type QueryValue = string | number | undefined;

export function assetUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }
  return /^https?:/.test(path) ? path : `${API_URL}${path}`;
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
  auth?: boolean;
}

export interface AuthHooks {
  accessToken: () => string | null;
  renew: () => Promise<boolean>;
}

let authHooks: AuthHooks | null = null;

export function registerAuthHooks(hooks: AuthHooks) {
  authHooks = hooks;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${API_URL}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function readBody(response: Response): Promise<ErrorBody> {
  return (await response.json().catch(() => ({}))) as ErrorBody;
}

function toError(status: number, body: ErrorBody): ApiError {
  return new ApiError(status, body.code ?? 'UNKNOWN', body.message ?? es.errors.generic, body.fields ?? {});
}

async function send(method: Method, path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const token = options.auth ? authHooks?.accessToken() : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  try {
    return await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(0, 'NETWORK', es.errors.network);
  }
}

export async function request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(method, path, options);
  if (response.status === 401 && options.auth && authHooks) {
    const body = await readBody(response);
    if (body.code !== 'TOKEN_EXPIRED' || !(await authHooks.renew())) {
      throw toError(response.status, body);
    }
    response = await send(method, path, options);
  }
  if (!response.ok) {
    throw toError(response.status, await readBody(response));
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function getJson<T>(
  path: string,
  options: { query?: Record<string, QueryValue>; signal?: AbortSignal } = {},
): Promise<T> {
  return request<T>('GET', path, options);
}
