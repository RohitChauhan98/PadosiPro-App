import bcrypt from 'bcrypt';
import type { FastifyPluginAsync } from 'fastify';
import { AppError } from '../../lib/errors.js';
import { parseWith } from '../../lib/validate.js';
import type { AppDeps } from '../../app.js';
import { OTP_RESEND_COOLDOWN_SECONDS, OtpService } from '../otp/otp.service.js';
import {
  loginBodySchema,
  loginVerifyBodySchema,
  registerBodySchema,
  resendOtpBodySchema,
  verifyOtpBodySchema,
} from './auth.schemas.js';

const BCRYPT_ROUNDS = 10;
// NOTE: @fastify/jwt treats numeric expiresIn as SECONDS — pass a string ('10m') instead.
const PENDING_TOKEN_TTL = '10m'; // 10 minutes to complete the code step

/**
 * Validates a login pending token. Returns the userId only when the JWT verifies
 * AND carries the login-otp scope; anything else (expired, garbage, wrong scope)
 * returns null so callers can decide between UNAUTHORIZED and silent fake-200.
 */
function verifyPendingToken(app: import('fastify').FastifyInstance, token: string): string | null {
  try {
    const payload = app.jwt.verify<{ sub: string; scope?: string }>(token);
    return payload.scope === 'login-otp' ? payload.sub : null;
  } catch {
    return null;
  }
}

export function authRoutes(deps: AppDeps): FastifyPluginAsync {
  const { prisma, mailer, config } = deps;
  const otpService = new OtpService(prisma, config.OTP_PEPPER);

  return async (app) => {
    app.post('/register', async (request, reply) => {
      const { email, password } = parseWith(registerBodySchema, request.body);

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing?.verified) {
        throw AppError.emailTaken();
      }
      if (existing) {
        // Locked accounts get told plainly (and get no email) per the lockout contract.
        await otpService.assertNotLocked(existing.id);
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      // Unverified re-registration overwrites the password so users can fix a typo;
      // email access is still required to activate the account.
      const user = existing
        ? await prisma.user.update({ where: { id: existing.id }, data: { passwordHash } })
        : await prisma.user.create({ data: { email, passwordHash } });

      const code = await otpService.issue(user.id);
      await mailer.sendOtpEmail(user.email, code, 'verify');

      return reply.code(201).send({ message: 'Verification code sent to your email' });
    });

    app.post('/verify-otp', async (request) => {
      const { email, code } = parseWith(verifyOtpBodySchema, request.body);

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw AppError.invalidOtp(0);
      }
      await otpService.verify(user.id, code);

      return { message: 'Email verified' };
    });

    app.post('/resend-otp', async (request) => {
      const { email, pendingToken } = parseWith(resendOtpBodySchema, request.body);

      const user = await prisma.user.findUnique({ where: { email } });
      // A valid login pending token authorizes resend for verified users (login flow).
      const pendingUserId = pendingToken ? verifyPendingToken(app, pendingToken) : null;
      // Unknown emails, and verified emails without a valid pending token, get the
      // same 200 to avoid leaking account state.
      if (!user || (user.verified && pendingUserId !== user.id)) {
        return { message: 'New code sent', cooldownSeconds: 30 };
      }

      const { code, cooldownSeconds } = await otpService.resend(user.id);
      await mailer.sendOtpEmail(user.email, code, user.verified ? 'login' : 'verify');

      return { message: 'New code sent', cooldownSeconds };
    });

    app.post('/login', async (request, reply) => {
      const { email, password } = parseWith(loginBodySchema, request.body);

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw AppError.invalidCredentials();
      }
      const passwordMatches = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatches) {
        throw AppError.invalidCredentials();
      }
      // Lock dominates the verified check: a locked account is told it is locked
      // (and gets no email) regardless of verification state.
      await otpService.assertNotLocked(user.id);
      if (!user.verified) {
        throw AppError.emailNotVerified();
      }

      const code = await otpService.issue(user.id);
      await mailer.sendOtpEmail(user.email, code, 'login');
      const pendingToken = await reply.jwtSign(
        { sub: user.id, email: user.email, scope: 'login-otp' },
        { expiresIn: PENDING_TOKEN_TTL },
      );

      return { otpRequired: true, pendingToken, cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS };
    });

    app.post('/login/verify', async (request, reply) => {
      const { pendingToken, code } = parseWith(loginVerifyBodySchema, request.body);

      const userId = verifyPendingToken(app, pendingToken);
      if (!userId) {
        throw AppError.unauthorized('Your sign-in session has expired. Please sign in again.');
      }
      const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
      if (!user) {
        throw AppError.unauthorized('Your sign-in session has expired. Please sign in again.');
      }

      await otpService.verify(user.id, code);

      // Pass the configured duration string ('24h'): @fastify/jwt reads numeric
      // expiresIn as seconds, so the old jwtExpiresInMs produced 1000-day tokens.
      const token = await reply.jwtSign({ sub: user.id, email: user.email }, { expiresIn: config.JWT_EXPIRES_IN });
      return {
        token,
        user: { id: user.id, email: user.email, profileComplete: user.profile !== null },
      };
    });
  };
}
