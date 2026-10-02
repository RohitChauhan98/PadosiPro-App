import { Platform } from 'react-native';

import type {
  ErrorCode,
  LoginResponse,
  LoginVerifyResponse,
  MyTasksResponse,
  Profile,
  ProfileInput,
  TaskCatalogResponse,
} from './types';

// Android emulators reach the host machine via 10.0.2.2.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000/api' : 'http://localhost:4000/api');

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: { field: string; message: string }[];
    attemptsRemaining?: number;
    retryAfterSeconds?: number;
  };
}

export class ApiError extends Error {
  status: number;
  code: ErrorCode;
  details?: { field: string; message: string }[];
  attemptsRemaining?: number;
  retryAfterSeconds?: number;

  constructor(init: {
    status: number;
    code: ErrorCode;
    message: string;
    details?: { field: string; message: string }[];
    attemptsRemaining?: number;
    retryAfterSeconds?: number;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
    this.attemptsRemaining = init.attemptsRemaining;
    this.retryAfterSeconds = init.retryAfterSeconds;
  }
}

// Registered by the auth provider so an expired/invalid token signs the user out.
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message:
        'Could not reach the PadosiPro server. Check your connection and that the API is running.',
    });
  }

  let data: (ErrorEnvelope & Record<string, unknown>) | null = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text) as ErrorEnvelope & Record<string, unknown>;
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const envelope = data?.error;
    const code = (envelope?.code ?? 'UNKNOWN_ERROR') as ErrorCode;
    // A 401 on an authenticated call means the stored token is dead — sign out.
    if (res.status === 401 && token) {
      unauthorizedHandler?.();
    }
    throw new ApiError({
      status: res.status,
      code,
      message: envelope?.message ?? 'Something went wrong. Please try again.',
      details: envelope?.details,
      attemptsRemaining: envelope?.attemptsRemaining,
      retryAfterSeconds: envelope?.retryAfterSeconds,
    });
  }

  return data as T;
}

// ---- Auth ----

export function register(input: { email: string; password: string }) {
  return request<{ message: string }>('/auth/register', { method: 'POST', body: input });
}

export function verifyOtp(input: { email: string; code: string }) {
  return request<{ message: string }>('/auth/verify-otp', { method: 'POST', body: input });
}

export function resendOtp(input: { email: string; pendingToken?: string }) {
  return request<{ message: string; cooldownSeconds: number }>('/auth/resend-otp', {
    method: 'POST',
    body: input,
  });
}

export function login(input: { email: string; password: string }) {
  return request<LoginResponse>('/auth/login', { method: 'POST', body: input });
}

export function loginVerify(input: { pendingToken: string; code: string }) {
  return request<LoginVerifyResponse>('/auth/login/verify', { method: 'POST', body: input });
}

// ---- Profile (auth) ----

export async function getProfile(token: string): Promise<Profile | null> {
  try {
    return await request<Profile>('/profile', { token });
  } catch (error) {
    if (error instanceof ApiError && error.code === 'NOT_FOUND') {
      return null;
    }
    throw error;
  }
}

export function saveProfile(token: string, input: ProfileInput) {
  return request<Profile>('/profile', { method: 'PUT', body: input, token });
}

// ---- Tasks (auth) ----

export function getTaskCatalog(token: string) {
  return request<TaskCatalogResponse>('/tasks', { token });
}

export function getMyTasks(token: string) {
  return request<MyTasksResponse>('/users/me/tasks', { token });
}

export function saveMyTasks(token: string, taskIds: string[]) {
  return request<MyTasksResponse>('/users/me/tasks', {
    method: 'PUT',
    body: { taskIds },
    token,
  });
}
