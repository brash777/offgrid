import { es } from '../i18n/es';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

interface ErrorBody {
  code?: string;
  message?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export type QueryValue = string | number | undefined;

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${API_URL}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function readError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as ErrorBody;
  return new ApiError(response.status, body.code ?? 'UNKNOWN', body.message ?? es.errors.generic);
}

export async function getJson<T>(
  path: string,
  options: { query?: Record<string, QueryValue>; signal?: AbortSignal } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      headers: { Accept: 'application/json' },
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(0, 'NETWORK', es.errors.network);
  }
  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as T;
}
