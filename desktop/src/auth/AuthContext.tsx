import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SessionUser } from '../api/auth';
import { onSessionChange, renewSession, signIn, signOut, signUp } from './session';

export type AuthStatus = 'restoring' | 'anonymous' | 'authenticated';

interface AuthState {
  status: AuthStatus;
  user: SessionUser | null;
}

interface AuthApi extends AuthState {
  signIn: typeof signIn;
  signUp: typeof signUp;
  signOut: typeof signOut;
}

const AuthContext = createContext<AuthApi | null>(null);

function stateFor(user: SessionUser | null): AuthState {
  return { status: user ? 'authenticated' : 'anonymous', user };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'restoring', user: null });

  useEffect(() => {
    let active = true;
    const unsubscribe = onSessionChange((user) => setState(stateFor(user)));
    renewSession().then((user) => {
      if (active && !user) {
        setState((current) => (current.status === 'restoring' ? stateFor(null) : current));
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const api = useMemo<AuthApi>(() => ({ ...state, signIn, signUp, signOut }), [state]);

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return auth;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
