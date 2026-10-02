import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { setUnauthorizedHandler } from './api';
import { clearSession, loadSession, saveSession, updateStoredUser } from './auth-storage';
import type { ApiUser } from './types';

export type AuthState =
  | { status: 'loading'; token: null; user: null }
  | { status: 'signedOut'; token: null; user: null }
  | { status: 'signedIn'; token: string; user: ApiUser };

type AuthContextValue = AuthState & {
  signIn: (token: string, user: ApiUser) => Promise<void>;
  signOut: () => Promise<void>;
  markProfileComplete: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading', token: null, user: null });

  useEffect(() => {
    let cancelled = false;
    loadSession().then((session) => {
      if (cancelled) return;
      if (session) {
        setState({ status: 'signedIn', token: session.token, user: session.user });
      } else {
        setState({ status: 'signedOut', token: null, user: null });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    // Profile and task queries are cached for the whole app session. Drop them
    // before the next account mounts, or its screens read the previous user's data.
    queryClient.clear();
    setState({ status: 'signedOut', token: null, user: null });
  }, [queryClient]);

  // A 401 on any authenticated call (expired/invalid JWT) drops the session.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const signIn = useCallback(async (token: string, user: ApiUser) => {
    await saveSession({ token, user });
    setState({ status: 'signedIn', token, user });
  }, []);

  const markProfileComplete = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'signedIn') return prev;
      const user = { ...prev.user, profileComplete: true };
      void updateStoredUser(user);
      return { ...prev, user };
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, signOut, markProfileComplete }),
    [state, signIn, signOut, markProfileComplete],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
