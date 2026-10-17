import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { ApiError } from '../api/http';
import { es } from '../i18n/es';

export type AsyncState<T> =
  { status: 'loading'; data?: T } | { status: 'success'; data: T } | { status: 'error'; error: ApiError; data?: T };

function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', es.errors.generic);
}

export function useAsync<T>(load: (signal: AbortSignal) => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ status: 'loading', data: current.data }));
    load(controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', error: toApiError(error) });
        }
      });
    return () => controller.abort();
  }, [...deps, attempt]);

  return { state, reload };
}
