import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { buildApp, type AppDeps } from '../src/app.js';
import type { Config } from '../src/config.js';
import type { Mailer, OtpEmailPurpose } from '../src/lib/mailer.js';

export const testConfig: Config = {
  PORT: 4000,
  DATABASE_URL: 'file:./test.db',
  JWT_SECRET: 'test-secret',
  JWT_EXPIRES_IN: '24h',
  jwtExpiresInMs: 24 * 60 * 60 * 1000,
  OTP_PEPPER: 'test-pepper',
  SMTP_HOST: 'localhost',
  SMTP_PORT: 1025,
  SMTP_USER: '',
  SMTP_PASS: '',
  SMTP_FROM: 'PadosiPro <no-reply@padosipro.local>',
  RUN_MIGRATIONS: false,
};

export class FakeMailer implements Mailer {
  readonly sent: { to: string; code: string; purpose: OtpEmailPurpose }[] = [];

  async sendOtpEmail(to: string, code: string, purpose: OtpEmailPurpose): Promise<void> {
    this.sent.push({ to, code, purpose });
  }

  lastCodeFor(to: string): string {
    const matches = this.sent.filter((mail) => mail.to === to);
    const last = matches[matches.length - 1];
    if (!last) {
      throw new Error(`No OTP email sent to ${to}`);
    }
    return last.code;
  }
}

export const prisma = new PrismaClient({ datasourceUrl: 'file:./test.db' });

export async function resetUserTables(): Promise<void> {
  await prisma.userTask.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
}

export function makeDeps(mailer: FakeMailer = new FakeMailer()): AppDeps & { mailer: FakeMailer } {
  return { config: testConfig, prisma, mailer };
}

export async function makeApp(mailer: FakeMailer = new FakeMailer()) {
  const app = await buildApp(makeDeps(mailer), { logger: false });
  return { app, mailer };
}

export async function createUser(options: { email: string; password?: string; verified?: boolean }) {
  const { email, password = 'password1', verified = false } = options;
  return prisma.user.create({
    data: { email, passwordHash: await bcrypt.hash(password, 10), verified },
  });
}

/** Registers + verifies a user through the real HTTP flow and returns its auth token. */
export async function registerVerifyAndLogin(email: string, password = 'password1') {
  const { app, mailer } = await makeApp();
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email, password } });
  const signupCode = mailer.lastCodeFor(email);
  await app.inject({ method: 'POST', url: '/api/auth/verify-otp', payload: { email, code: signupCode } });
  const loginRes = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });
  const { pendingToken } = loginRes.json();
  const verify = await app.inject({
    method: 'POST',
    url: '/api/auth/login/verify',
    payload: { pendingToken, code: mailer.lastCodeFor(email) },
  });
  const token = verify.json().token as string;
  return { app, mailer, token };
}
