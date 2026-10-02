// Types mirroring internal/api-contract.md (API Contract v1)

export interface ApiUser {
  id: string;
  email: string;
  profileComplete: boolean;
}

export interface Profile {
  name: string;
  mobileNumber: string;
  address: string;
  businessName: string | null;
}

export interface ProfileInput {
  name: string;
  mobileNumber: string;
  address: string;
  businessName?: string | null;
}

export interface TaskItem {
  id: string;
  name: string;
  description: string;
}

export interface TaskCategory {
  id: string;
  name: string;
  tasks: TaskItem[];
}

export interface MyTask extends TaskItem {
  category: { id: string; name: string };
}

export interface LoginResponse {
  otpRequired: true;
  pendingToken: string;
  cooldownSeconds: number;
}

export interface LoginVerifyResponse {
  token: string;
  user: ApiUser;
}

export interface TaskCatalogResponse {
  categories: TaskCategory[];
}

export interface MyTasksResponse {
  tasks: MyTask[];
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'EMAIL_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_VERIFIED'
  | 'INVALID_OTP'
  | 'OTP_EXPIRED'
  | 'OTP_LOCKED'
  | 'RESEND_COOLDOWN'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';
