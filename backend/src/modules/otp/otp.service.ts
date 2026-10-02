import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { AppError } from '../../lib/errors.js';

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5; // account-level, cumulative across codes
export const OTP_LOCKOUT_MS = 24 * 60 * 60 * 1000; // 24 hours
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
export const OTP_RESEND_COOLDOWN_SECONDS = OTP_RESEND_COOLDOWN_MS / 1000;

/** 6-digit cryptographically random code; leading zeros allowed ("000001" is valid). */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Only the hash is ever stored: SHA-256 of pepper + userId + code. */
export function hashOtpCode(pepper: string, userId: string, code: string): string {
  return createHash('sha256').update(`${pepper}${userId}${code}`).digest('hex');
}

function hashesEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export class OtpService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly pepper: string,
  ) {}

  /**
   * Throws OTP_LOCKED (429, retryAfterSeconds) while the account's 24h lock is active.
   * Routes call this before issuing any code so locked users never receive emails.
   */
  async assertNotLocked(userId: string, now: Date = new Date()): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.otpLockedUntil && user.otpLockedUntil.getTime() > now.getTime()) {
      throw AppError.otpLocked(Math.ceil((user.otpLockedUntil.getTime() - now.getTime()) / 1000));
    }
  }

  /**
   * Creates a fresh code for the user, invalidating every previous active one.
   * Returns the plaintext code so the caller can email it; it is never persisted or logged.
   */
  async issue(userId: string, now: Date = new Date()): Promise<string> {
    await this.assertNotLocked(userId, now);
    const code = generateOtpCode();
    await this.prisma.$transaction([
      this.prisma.otpCode.updateMany({
        where: { userId, consumedAt: null, invalidatedAt: null },
        data: { invalidatedAt: now },
      }),
      this.prisma.otpCode.create({
        data: {
          userId,
          codeHash: hashOtpCode(this.pepper, userId, code),
          expiresAt: new Date(now.getTime() + OTP_TTL_MS),
        },
      }),
    ]);
    return code;
  }

  /**
   * Verifies a code against the user's active OTP. Wrong attempts accumulate on the
   * USER (across codes); the 5th locks the account for 24h and no further codes can
   * be issued or verified until it expires. On success the code is consumed (single
   * use), the user is marked verified, and the counter/lock state resets.
   * Throws the contract's AppErrors: OTP_LOCKED, INVALID_OTP, OTP_EXPIRED.
   */
  async verify(userId: string, code: string, now: Date = new Date()): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.otpLockedUntil && user.otpLockedUntil.getTime() > now.getTime()) {
      throw AppError.otpLocked(Math.ceil((user.otpLockedUntil.getTime() - now.getTime()) / 1000));
    }

    const otp = await this.prisma.otpCode.findFirst({
      where: { userId, consumedAt: null, invalidatedAt: null },
      orderBy: { id: 'desc' },
    });

    if (!otp) {
      throw AppError.invalidOtp(OTP_MAX_ATTEMPTS - user.otpFailedAttempts);
    }
    if (otp.expiresAt.getTime() <= now.getTime()) {
      throw AppError.otpExpired();
    }

    const candidateHash = hashOtpCode(this.pepper, userId, code);
    if (hashesEqual(candidateHash, otp.codeHash)) {
      await this.prisma.$transaction([
        this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: now } }),
        this.prisma.user.update({
          where: { id: userId },
          data: { verified: true, otpFailedAttempts: 0, otpLockedUntil: null },
        }),
      ]);
      return;
    }

    const failedAttempts = user.otpFailedAttempts + 1;
    const maxedOut = failedAttempts >= OTP_MAX_ATTEMPTS;
    await this.prisma.$transaction([
      this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: otp.attempts + 1, ...(maxedOut ? { invalidatedAt: now } : {}) },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: maxedOut
          ? { otpFailedAttempts: 0, otpLockedUntil: new Date(now.getTime() + OTP_LOCKOUT_MS) }
          : { otpFailedAttempts: failedAttempts },
      }),
    ]);
    if (maxedOut) {
      throw AppError.otpLocked(OTP_LOCKOUT_MS / 1000);
    }
    throw AppError.invalidOtp(OTP_MAX_ATTEMPTS - failedAttempts);
  }

  /**
   * Enforces the lock, then the 30s resend cooldown (based on the most recently sent
   * code, whatever its state), then issues a fresh code.
   * Throws OTP_LOCKED, or RESEND_COOLDOWN with retryAfterSeconds.
   */
  async resend(userId: string, now: Date = new Date()): Promise<{ code: string; cooldownSeconds: number }> {
    await this.assertNotLocked(userId, now);
    const last = await this.prisma.otpCode.findFirst({
      where: { userId },
      orderBy: { id: 'desc' },
    });
    if (last) {
      const elapsedMs = now.getTime() - last.createdAt.getTime();
      if (elapsedMs < OTP_RESEND_COOLDOWN_MS) {
        throw AppError.resendCooldown(Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsedMs) / 1000));
      }
    }
    const code = await this.issue(userId, now);
    return { code, cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS };
  }
}
