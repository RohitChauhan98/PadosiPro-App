import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { ApiUser } from './types';

const TOKEN_KEY = 'padosipro.jwt';
const USER_KEY = 'padosipro.user';

// SecureStore has no web implementation (its web stub is an empty object).
// The web target is a dev/preview surface, so it falls back to localStorage;
// native builds keep the hardware-backed store.
const isWeb = Platform.OS === 'web';

const storage = {
  async get(key: string): Promise<string | null> {
    if (isWeb) return window.localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (isWeb) {
      window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (isWeb) {
      window.localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export interface StoredSession {
  token: string;
  user: ApiUser;
}

export async function saveSession(session: StoredSession): Promise<void> {
  await storage.set(TOKEN_KEY, session.token);
  await storage.set(USER_KEY, JSON.stringify(session.user));
}

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const [token, rawUser] = await Promise.all([storage.get(TOKEN_KEY), storage.get(USER_KEY)]);
    if (!token || !rawUser) return null;
    const user = JSON.parse(rawUser) as ApiUser;
    if (!user || typeof user.email !== 'string') return null;
    return { token, user };
  } catch {
    return null;
  }
}

export async function updateStoredUser(user: ApiUser): Promise<void> {
  await storage.set(USER_KEY, JSON.stringify(user));
}

export async function clearSession(): Promise<void> {
  await Promise.all([storage.remove(TOKEN_KEY), storage.remove(USER_KEY)]);
}
