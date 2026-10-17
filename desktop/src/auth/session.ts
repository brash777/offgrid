import { login, logout, refresh, register, type SessionResponse, type SessionUser } from '../api/auth';
import { ApiError, registerAuthHooks } from '../api/http';

interface TokenStore {
  load: () => Promise<string | null>;
  save: (token: string) => Promise<boolean>;
  clear: () => Promise<boolean>;
}

type SessionListener = (user: SessionUser | null) => void;

function memoryStore(): TokenStore {
  let value: string | null = null;
  return {
    load: async () => value,
    save: async (token) => {
      value = token;
      return true;
    },
    clear: async () => {
      value = null;
      return true;
    },
  };
}

const store: TokenStore = window.desktop?.session ?? memoryStore();
const listeners = new Set<SessionListener>();

let accessToken: string | null = null;
let refreshToken: string | null = null;
let renewal: Promise<SessionUser | null> | null = null;

function emit(user: SessionUser | null) {
  listeners.forEach((listener) => listener(user));
}

async function begin(session: SessionResponse): Promise<SessionUser> {
  accessToken = session.accessToken;
  refreshToken = session.refreshToken;
  await store.save(session.refreshToken).catch(() => false);
  emit(session.user);
  return session.user;
}

async function forget() {
  accessToken = null;
  refreshToken = null;
  await store.clear().catch(() => false);
  emit(null);
}

export function onSessionChange(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function signIn(email: string, password: string): Promise<SessionUser> {
  return begin(await login(email, password));
}

export async function signUp(fullName: string, email: string, password: string): Promise<SessionUser> {
  return begin(await register(fullName, email, password));
}

export function renewSession(): Promise<SessionUser | null> {
  renewal ??= (async () => {
    const token = refreshToken ?? (await store.load().catch(() => null));
    if (!token) {
      return null;
    }
    try {
      return await begin(await refresh(token));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await forget();
      }
      return null;
    }
  })().finally(() => {
    renewal = null;
  });
  return renewal;
}

export async function signOut(): Promise<void> {
  const token = refreshToken;
  await forget();
  if (token) {
    await logout(token).catch(() => undefined);
  }
}

registerAuthHooks({
  accessToken: () => accessToken,
  renew: async () => (await renewSession()) !== null,
});
