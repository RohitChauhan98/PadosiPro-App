import { beforeEach, describe, expect, it } from 'vitest';
import { createUser, makeApp, prisma, registerVerifyAndLogin, resetUserTables } from './helpers.js';

beforeEach(resetUserTables);

describe('POST /api/auth/register', () => {
  it('creates an unverified user, emails an OTP and returns 201', async () => {
    const { app, mailer } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'New@Example.com', password: 'password1' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ message: 'Verification code sent to your email' });

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'new@example.com' } });
    expect(user.verified).toBe(false);
    expect(user.passwordHash).not.toBe('password1');
    expect(mailer.lastCodeFor('new@example.com')).toMatch(/^\d{6}$/);
  });

  it('rejects invalid email and weak passwords with VALIDATION_ERROR details', async () => {
    const { app } = await makeApp();

    const badEmail = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'not-an-email', password: 'password1' },
    });
    expect(badEmail.statusCode).toBe(400);
    expect(badEmail.json().error.code).toBe('VALIDATION_ERROR');
    expect(badEmail.json().error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'email' })]),
    );

    for (const password of ['short1', 'onlyletters', '12345678']) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'a@example.com', password },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns 409 EMAIL_TAKEN for an already-verified email', async () => {
    const { app } = await makeApp();
    await createUser({ email: 'taken@example.com', verified: true });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'taken@example.com', password: 'password1' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('EMAIL_TAKEN');
  });

  it('re-registering an unverified email overwrites the password and issues a fresh OTP', async () => {
    const { app, mailer } = await makeApp();
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'typo@example.com', password: 'password1' },
    });
    const firstCode = mailer.lastCodeFor('typo@example.com');
    const firstHash = (await prisma.user.findUniqueOrThrow({ where: { email: 'typo@example.com' } })).passwordHash;

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'typo@example.com', password: 'newpassword9' },
    });
    expect(res.statusCode).toBe(201);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'typo@example.com' } });
    expect(user.passwordHash).not.toBe(firstHash);

    // Old code invalidated; only the newest code verifies.
    const secondCode = mailer.lastCodeFor('typo@example.com');
    const oldAttempt = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: { email: 'typo@example.com', code: firstCode },
    });
    expect(oldAttempt.statusCode).toBe(400);
    const newAttempt = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: { email: 'typo@example.com', code: secondCode },
    });
    expect(newAttempt.statusCode).toBe(200);
  });
});

describe('POST /api/auth/verify-otp', () => {
  it('verifies with the emailed code', async () => {
    const { app, mailer } = await makeApp();
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'verify@example.com', password: 'password1' },
    });
    const code = mailer.lastCodeFor('verify@example.com');

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: { email: 'verify@example.com', code },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ message: 'Email verified' });
  });

  it('rejects a wrong code with INVALID_OTP and attemptsRemaining', async () => {
    const { app, mailer } = await makeApp();
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'wrong@example.com', password: 'password1' },
    });
    const code = mailer.lastCodeFor('wrong@example.com');
    const wrongCode = code === '000000' ? '000001' : '000000';

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: { email: 'wrong@example.com', code: wrongCode },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_OTP');
    expect(res.json().error.attemptsRemaining).toBe(4);
  });

  it('rejects malformed codes with VALIDATION_ERROR', async () => {
    const { app } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: { email: 'a@example.com', code: '12345' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/resend-otp', () => {
  it('enforces the cooldown then sends a fresh code', async () => {
    const { app, mailer } = await makeApp();
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'cooldown@example.com', password: 'password1' },
    });

    const tooSoon = await app.inject({
      method: 'POST',
      url: '/api/auth/resend-otp',
      payload: { email: 'cooldown@example.com' },
    });
    expect(tooSoon.statusCode).toBe(429);
    expect(tooSoon.json().error.code).toBe('RESEND_COOLDOWN');
    expect(tooSoon.json().error.retryAfterSeconds).toBeGreaterThan(0);

    await prisma.otpCode.updateMany({
      where: { user: { email: 'cooldown@example.com' } },
      data: { createdAt: new Date(Date.now() - 31_000) },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/resend-otp',
      payload: { email: 'cooldown@example.com' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ message: 'New code sent', cooldownSeconds: 30 });
    expect(mailer.sent.filter((m) => m.to === 'cooldown@example.com')).toHaveLength(2);
  });

  it('returns 200 without leaking for unknown or verified emails', async () => {
    const { app, mailer } = await makeApp();
    await createUser({ email: 'verified@example.com', verified: true });

    for (const email of ['nobody@example.com', 'verified@example.com']) {
      const res = await app.inject({ method: 'POST', url: '/api/auth/resend-otp', payload: { email } });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ message: 'New code sent', cooldownSeconds: 30 });
    }
    expect(mailer.sent).toHaveLength(0);
  });
});

describe('POST /api/auth/login', () => {
  it('blocks unverified users with 403 EMAIL_NOT_VERIFIED', async () => {
    const { app } = await makeApp();
    await createUser({ email: 'unverified@example.com', password: 'password1', verified: false });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'unverified@example.com', password: 'password1' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('rejects a wrong password with 401 INVALID_CREDENTIALS', async () => {
    const { app } = await makeApp();
    await createUser({ email: 'user@example.com', password: 'password1', verified: true });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'user@example.com', password: 'wrongpass1' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an unknown email with the same 401 INVALID_CREDENTIALS', async () => {
    const { app } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ghost@example.com', password: 'password1' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('INVALID_CREDENTIALS');
    expect(res.json().error.message).toBe('Invalid email or password');
  });

  it('returns otpRequired + pendingToken (no session token) and emails a login code', async () => {
    const { app, mailer } = await makeApp();
    await createUser({ email: 'happy@example.com', password: 'password1', verified: true });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'happy@example.com', password: 'password1' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.otpRequired).toBe(true);
    expect(typeof body.pendingToken).toBe('string');
    expect(body.token).toBeUndefined();
    expect(body.cooldownSeconds).toBe(30);

    const mail = mailer.sent.find((m) => m.to === 'happy@example.com');
    expect(mail?.purpose).toBe('login');
    expect(mail?.code).toMatch(/^\d{6}$/);
  });
});

describe('POST /api/auth/login/verify', () => {
  async function loginForPendingToken(app: Awaited<ReturnType<typeof makeApp>>['app'], email: string, password = 'password1') {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });
    return res.json().pendingToken as string;
  }

  it('exchanges pendingToken + correct code for a session token and user', async () => {
    const { app, mailer } = await makeApp();
    await createUser({ email: 'happy@example.com', password: 'password1', verified: true });
    const pendingToken = await loginForPendingToken(app, 'happy@example.com');

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login/verify',
      payload: { pendingToken, code: mailer.lastCodeFor('happy@example.com') },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token.split('.')).toHaveLength(3);
    expect(body.user).toEqual({ id: expect.any(String), email: 'happy@example.com', profileComplete: false });

    // Session token lifetime matches JWT_EXPIRES_IN (24h) — guards the regression
    // where a millisecond number was passed as seconds (1000-day tokens).
    const payload = JSON.parse(Buffer.from(body.token.split('.')[1], 'base64url').toString());
    expect(payload.exp - payload.iat).toBe(24 * 60 * 60);

    // The session token works on an authenticated route.
    const me = await app.inject({ method: 'GET', url: '/api/tasks', headers: { authorization: `Bearer ${body.token}` } });
    expect(me.statusCode).toBe(200);
  });

  it('rejects garbage, expired, and wrong-scope pending tokens with 401 UNAUTHORIZED', async () => {
    const { app } = await makeApp();
    const user = await createUser({ email: 'happy@example.com', password: 'password1', verified: true });
    // @fastify/jwt reads numeric expiresIn as SECONDS: 600 = 10 minutes.
    const wrongScope = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: 600 });
    // 1s expiry + 1.1s wait = deterministically expired token.
    const expired = app.jwt.sign({ sub: user.id, email: user.email, scope: 'login-otp' }, { expiresIn: 1 });
    await new Promise((resolve) => setTimeout(resolve, 1100));

    for (const pendingToken of ['garbage', wrongScope, expired]) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login/verify',
        payload: { pendingToken, code: '123456' },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('UNAUTHORIZED');
    }
  });

  it('wrong codes count toward the same account counter and lock at 5', async () => {
    const { app, mailer } = await makeApp();
    await createUser({ email: 'happy@example.com', password: 'password1', verified: true });
    const pendingToken = await loginForPendingToken(app, 'happy@example.com');
    const realCode = mailer.lastCodeFor('happy@example.com');
    const wrongCode = realCode === '000000' ? '000001' : '000000';

    for (let i = 0; i < 4; i += 1) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login/verify',
        payload: { pendingToken, code: wrongCode },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INVALID_OTP');
      expect(res.json().error.attemptsRemaining).toBe(4 - i);
    }
    const fifth = await app.inject({
      method: 'POST',
      url: '/api/auth/login/verify',
      payload: { pendingToken, code: wrongCode },
    });
    expect(fifth.statusCode).toBe(429);
    expect(fifth.json().error.code).toBe('OTP_LOCKED');

    // And now login itself is fully blocked: correct password, no email sent.
    const sentBefore = mailer.sent.length;
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'happy@example.com', password: 'password1' },
    });
    expect(login.statusCode).toBe(429);
    expect(login.json().error.code).toBe('OTP_LOCKED');
    expect(mailer.sent.length).toBe(sentBefore);
  });

  it('a pending token for one user cannot verify another user', async () => {
    const { app, mailer } = await makeApp();
    await createUser({ email: 'alice@example.com', password: 'password1', verified: true });
    await createUser({ email: 'bob@example.com', password: 'password1', verified: true });
    const alicePending = await loginForPendingToken(app, 'alice@example.com');
    await loginForPendingToken(app, 'bob@example.com'); // issues bob's active code
    const bobCode = mailer.lastCodeFor('bob@example.com');

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login/verify',
      payload: { pendingToken: alicePending, code: bobCode },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_OTP');
  });
});

describe('OTP lockout over HTTP', () => {
  async function lockViaVerifyOtp(app: Awaited<ReturnType<typeof makeApp>>['app'], email: string, realCode: string) {
    const wrongCode = realCode === '000000' ? '000001' : '000000';
    for (let i = 0; i < 5; i += 1) {
      await app.inject({ method: 'POST', url: '/api/auth/verify-otp', payload: { email, code: wrongCode } });
    }
  }

  it('verify-otp returns OTP_LOCKED with retryAfterSeconds once locked', async () => {
    const { app, mailer } = await makeApp();
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'lock@example.com', password: 'password1' } });
    const code = mailer.lastCodeFor('lock@example.com');
    await lockViaVerifyOtp(app, 'lock@example.com', code);

    const res = await app.inject({ method: 'POST', url: '/api/auth/verify-otp', payload: { email: 'lock@example.com', code } });
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe('OTP_LOCKED');
    expect(res.json().error.retryAfterSeconds).toBeGreaterThan(23 * 3600);
  });

  it('resend-otp returns OTP_LOCKED and sends no email while locked', async () => {
    const { app, mailer } = await makeApp();
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'lock@example.com', password: 'password1' } });
    await lockViaVerifyOtp(app, 'lock@example.com', mailer.lastCodeFor('lock@example.com'));
    const sentBefore = mailer.sent.length;

    const res = await app.inject({ method: 'POST', url: '/api/auth/resend-otp', payload: { email: 'lock@example.com' } });
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe('OTP_LOCKED');
    expect(mailer.sent.length).toBe(sentBefore);
  });

  it('register returns OTP_LOCKED and sends no email for a locked unverified email', async () => {
    const { app, mailer } = await makeApp();
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'lock@example.com', password: 'password1' } });
    await lockViaVerifyOtp(app, 'lock@example.com', mailer.lastCodeFor('lock@example.com'));
    const sentBefore = mailer.sent.length;

    const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'lock@example.com', password: 'newpassword9' } });
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe('OTP_LOCKED');
    expect(mailer.sent.length).toBe(sentBefore);
  });

  it('the lock survives a fresh app instance (the "app refresh" case)', async () => {
    const { app, mailer } = await makeApp();
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'lock@example.com', password: 'password1' } });
    await lockViaVerifyOtp(app, 'lock@example.com', mailer.lastCodeFor('lock@example.com'));

    // Brand-new app instance against the same database = user closed and reopened everything.
    const { app: freshApp, mailer: freshMailer } = await makeApp();
    const res = await freshApp.inject({ method: 'POST', url: '/api/auth/resend-otp', payload: { email: 'lock@example.com' } });
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe('OTP_LOCKED');
    expect(freshMailer.sent).toHaveLength(0);
  });
});

describe('resend-otp with a login pending token', () => {
  it('resends for a verified user holding a valid login-otp token', async () => {
    const { app, mailer } = await makeApp();
    const user = await createUser({ email: 'verified@example.com', verified: true });
    const pendingToken = app.jwt.sign({ sub: user.id, email: user.email, scope: 'login-otp' }, { expiresIn: 600 });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/resend-otp',
      payload: { email: 'verified@example.com', pendingToken },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ message: 'New code sent', cooldownSeconds: 30 });
    const mail = mailer.sent.find((m) => m.to === 'verified@example.com');
    expect(mail?.purpose).toBe('login');
  });

  it('keeps the fake-200 (no email) for a verified user with a garbage or wrong-scope token', async () => {
    const { app, mailer } = await makeApp();
    const user = await createUser({ email: 'verified@example.com', verified: true });
    const wrongScope = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: 600 });

    for (const pendingToken of ['garbage', wrongScope]) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/resend-otp',
        payload: { email: 'verified@example.com', pendingToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ message: 'New code sent', cooldownSeconds: 30 });
    }
    expect(mailer.sent).toHaveLength(0);
  });
});

describe('auth guard', () => {
  it('rejects requests without a token with 401 UNAUTHORIZED', async () => {
    const { app } = await makeApp();
    for (const url of ['/api/profile', '/api/tasks', '/api/users/me/tasks']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('UNAUTHORIZED');
    }
  });

  it('rejects a garbage token with 401 UNAUTHORIZED', async () => {
    const { app } = await makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/profile',
      headers: { authorization: 'Bearer not-a-token' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });
});
