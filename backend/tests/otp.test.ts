import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../src/lib/errors.js';
import {
  generateOtpCode,
  hashOtpCode,
  OTP_LOCKOUT_MS,
  OTP_MAX_ATTEMPTS,
  OtpService,
} from '../src/modules/otp/otp.service.js';
import { createUser, prisma, resetUserTables, testConfig } from './helpers.js';

const otpService = new OtpService(prisma, testConfig.OTP_PEPPER);

describe('generateOtpCode', () => {
  it('always produces a 6-digit string (leading zeros allowed)', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });
});

describe('hashOtpCode', () => {
  it('is SHA-256 of pepper + userId + code', () => {
    const expected = createHash('sha256').update('test-pepperuser123123456').digest('hex');
    expect(hashOtpCode('test-pepper', 'user123', '123456')).toBe(expected);
  });

  it('changes with the pepper', () => {
    expect(hashOtpCode('a', 'u', '123456')).not.toBe(hashOtpCode('b', 'u', '123456'));
  });
});

describe('OtpService.issue', () => {
  beforeEach(resetUserTables);

  it('stores only the hash, never the plaintext code', async () => {
    const user = await createUser({ email: 'a@example.com' });
    const code = await otpService.issue(user.id);

    const stored = await prisma.otpCode.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored.codeHash).toBe(hashOtpCode(testConfig.OTP_PEPPER, user.id, code));
    expect(stored.codeHash).not.toBe(code);
    expect(stored.codeHash).not.toContain(code);
  });

  it('sets a 10-minute TTL', async () => {
    const user = await createUser({ email: 'a@example.com' });
    const now = new Date();
    await otpService.issue(user.id, now);
    const stored = await prisma.otpCode.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored.expiresAt.getTime() - now.getTime()).toBe(10 * 60 * 1000);
  });

  it('invalidates the previous code when a new one is issued', async () => {
    const user = await createUser({ email: 'a@example.com' });
    const firstCode = await otpService.issue(user.id);
    const secondCode = await otpService.issue(user.id);

    await expect(otpService.verify(user.id, firstCode)).rejects.toMatchObject({ code: 'INVALID_OTP' });
    await otpService.verify(user.id, secondCode);
    const freshUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(freshUser.verified).toBe(true);
  });
});

describe('OtpService.verify', () => {
  beforeEach(resetUserTables);

  it('verifies a correct code, consumes it and marks the user verified', async () => {
    const user = await createUser({ email: 'a@example.com' });
    const code = await otpService.issue(user.id);

    await otpService.verify(user.id, code);

    const stored = await prisma.otpCode.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored.consumedAt).not.toBeNull();
    const freshUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(freshUser.verified).toBe(true);
  });

  it('is single use: a consumed code cannot be used again', async () => {
    const user = await createUser({ email: 'a@example.com' });
    const code = await otpService.issue(user.id);

    await otpService.verify(user.id, code);
    await expect(otpService.verify(user.id, code)).rejects.toMatchObject({
      code: 'INVALID_OTP',
      statusCode: 400,
    });
  });

  it('rejects a wrong code with INVALID_OTP and decrements attemptsRemaining', async () => {
    const user = await createUser({ email: 'a@example.com' });
    const code = await otpService.issue(user.id);
    const wrongCode = code === '000000' ? '000001' : '000000';

    await expect(otpService.verify(user.id, wrongCode)).rejects.toMatchObject({
      code: 'INVALID_OTP',
      statusCode: 400,
      extra: { attemptsRemaining: OTP_MAX_ATTEMPTS - 1 },
    });
    await expect(otpService.verify(user.id, wrongCode)).rejects.toMatchObject({
      extra: { attemptsRemaining: OTP_MAX_ATTEMPTS - 2 },
    });
  });

  it('locks the account on the 5th wrong attempt and rejects even the correct code afterwards', async () => {
    const user = await createUser({ email: 'a@example.com' });
    const code = await otpService.issue(user.id);
    const wrongCode = code === '000000' ? '000001' : '000000';

    for (let i = 0; i < OTP_MAX_ATTEMPTS - 1; i += 1) {
      await expect(otpService.verify(user.id, wrongCode)).rejects.toMatchObject({ code: 'INVALID_OTP' });
    }
    await expect(otpService.verify(user.id, wrongCode)).rejects.toMatchObject({
      code: 'OTP_LOCKED',
      statusCode: 429,
    });
    // Even the correct code is rejected while locked.
    await expect(otpService.verify(user.id, code)).rejects.toMatchObject({ code: 'OTP_LOCKED' });
    const freshUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(freshUser.verified).toBe(false);
  });

  it('rejects an expired code with OTP_EXPIRED (410)', async () => {
    const user = await createUser({ email: 'a@example.com' });
    const code = await otpService.issue(user.id);
    await prisma.otpCode.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(otpService.verify(user.id, code)).rejects.toMatchObject({
      code: 'OTP_EXPIRED',
      statusCode: 410,
    });
  });

  it('rejects when there is no active code at all', async () => {
    const user = await createUser({ email: 'a@example.com' });
    await expect(otpService.verify(user.id, '123456')).rejects.toMatchObject({
      code: 'INVALID_OTP',
      statusCode: 400,
    });
  });

  it('a code issued to one user does not verify another user', async () => {
    const alice = await createUser({ email: 'alice@example.com' });
    const bob = await createUser({ email: 'bob@example.com' });
    const codeForAlice = await otpService.issue(alice.id);
    await otpService.issue(bob.id);

    await expect(otpService.verify(bob.id, codeForAlice)).rejects.toMatchObject({ code: 'INVALID_OTP' });
  });
});

describe('OtpService.resend', () => {
  beforeEach(resetUserTables);

  it('enforces the 30s cooldown with retryAfterSeconds', async () => {
    const user = await createUser({ email: 'a@example.com' });
    await otpService.issue(user.id);

    const error = (await otpService.resend(user.id).catch((e: unknown) => e)) as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('RESEND_COOLDOWN');
    expect(error.statusCode).toBe(429);
    expect(error.extra?.retryAfterSeconds).toBeGreaterThan(0);
    expect(error.extra?.retryAfterSeconds).toBeLessThanOrEqual(30);
  });

  it('issues a fresh code once the cooldown has passed and invalidates the old one', async () => {
    const user = await createUser({ email: 'a@example.com' });
    const oldCode = await otpService.issue(user.id);
    await prisma.otpCode.updateMany({
      where: { userId: user.id },
      data: { createdAt: new Date(Date.now() - 31_000) },
    });

    const { code: newCode, cooldownSeconds } = await otpService.resend(user.id);
    expect(cooldownSeconds).toBe(30);
    expect(newCode).toMatch(/^\d{6}$/);

    await expect(otpService.verify(user.id, oldCode)).rejects.toMatchObject({ code: 'INVALID_OTP' });
    await otpService.verify(user.id, newCode);
    const freshUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(freshUser.verified).toBe(true);
  });
});

describe('OtpService lockout', () => {
  beforeEach(resetUserTables);

  it('accumulates wrong attempts across resends (counter does not reset with a new code)', async () => {
    const user = await createUser({ email: 'a@example.com' });
    const code1 = await otpService.issue(user.id);
    const wrong1 = code1 === '000000' ? '000001' : '000000';

    await expect(otpService.verify(user.id, wrong1)).rejects.toMatchObject({
      code: 'INVALID_OTP',
      extra: { attemptsRemaining: 4 },
    });
    await expect(otpService.verify(user.id, wrong1)).rejects.toMatchObject({
      code: 'INVALID_OTP',
      extra: { attemptsRemaining: 3 },
    });

    // Resend past the cooldown — the counter must carry over to the new code.
    await prisma.otpCode.updateMany({
      where: { userId: user.id },
      data: { createdAt: new Date(Date.now() - 31_000) },
    });
    const { code: code2 } = await otpService.resend(user.id);
    const wrong2 = code2 === '000000' ? '000001' : '000000';

    await expect(otpService.verify(user.id, wrong2)).rejects.toMatchObject({
      extra: { attemptsRemaining: 2 },
    });
    await expect(otpService.verify(user.id, wrong2)).rejects.toMatchObject({
      extra: { attemptsRemaining: 1 },
    });
    // 5th cumulative wrong attempt locks.
    const error = (await otpService.verify(user.id, wrong2).catch((e: unknown) => e)) as AppError;
    expect(error.code).toBe('OTP_LOCKED');
    expect(error.statusCode).toBe(429);
    expect(error.extra?.retryAfterSeconds).toBeGreaterThan(23 * 3600);
    expect(error.extra?.retryAfterSeconds).toBeLessThanOrEqual(24 * 3600);

    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(fresh.otpLockedUntil).not.toBeNull();
    expect(fresh.otpFailedAttempts).toBe(0);
  });

  it('lock persists across service instances (survives restarts and app refreshes)', async () => {
    const user = await createUser({ email: 'a@example.com' });
    const code = await otpService.issue(user.id);
    const wrongCode = code === '000000' ? '000001' : '000000';
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i += 1) {
      await otpService.verify(user.id, wrongCode).catch(() => {});
    }

    const freshService = new OtpService(prisma, testConfig.OTP_PEPPER);
    await expect(freshService.verify(user.id, code)).rejects.toMatchObject({ code: 'OTP_LOCKED' });
    await expect(freshService.issue(user.id)).rejects.toMatchObject({ code: 'OTP_LOCKED' });
    await expect(freshService.resend(user.id)).rejects.toMatchObject({ code: 'OTP_LOCKED' });
  });

  it('after the 24h lock expires the user can resend and gets a fresh 5 attempts', async () => {
    const user = await createUser({ email: 'a@example.com' });
    const start = new Date();
    const code = await otpService.issue(user.id, start);
    const wrongCode = code === '000000' ? '000001' : '000000';
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i += 1) {
      await otpService.verify(user.id, wrongCode, start).catch(() => {});
    }
    await expect(otpService.resend(user.id, start)).rejects.toMatchObject({ code: 'OTP_LOCKED' });

    const afterLock = new Date(start.getTime() + OTP_LOCKOUT_MS + 1000);
    const { code: freshCode } = await otpService.resend(user.id, afterLock);
    const wrongAgain = freshCode === '000000' ? '000001' : '000000';
    await expect(otpService.verify(user.id, wrongAgain, afterLock)).rejects.toMatchObject({
      code: 'INVALID_OTP',
      extra: { attemptsRemaining: OTP_MAX_ATTEMPTS - 1 },
    });
    await otpService.verify(user.id, freshCode, afterLock);
    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(fresh.verified).toBe(true);
  });

  it('resets the failed-attempt counter after a successful verify', async () => {
    const user = await createUser({ email: 'a@example.com' });
    const code = await otpService.issue(user.id);
    const wrongCode = code === '000000' ? '000001' : '000000';
    await expect(otpService.verify(user.id, wrongCode)).rejects.toMatchObject({ code: 'INVALID_OTP' });
    await expect(otpService.verify(user.id, wrongCode)).rejects.toMatchObject({ code: 'INVALID_OTP' });

    await otpService.verify(user.id, code);

    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(fresh.otpFailedAttempts).toBe(0);
    expect(fresh.otpLockedUntil).toBeNull();
  });
});
