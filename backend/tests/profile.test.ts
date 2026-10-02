import { beforeEach, describe, expect, it } from 'vitest';
import { normalizeIndianMobile } from '../src/modules/profile/profile.schemas.js';
import { registerVerifyAndLogin, resetUserTables } from './helpers.js';

beforeEach(resetUserTables);

const VALID_PROFILE = {
  name: 'Rohit Chauhan',
  mobileNumber: '9876543210',
  address: '221B Baker Street, Mumbai',
};

describe('normalizeIndianMobile', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['+919876543210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeIndianMobile(input)).toBe(expected);
  });
});

describe('GET /api/profile', () => {
  it('returns 404 NOT_FOUND before the profile is saved', async () => {
    const { app, token } = await registerVerifyAndLogin('noprofile@example.com');
    const res = await app.inject({ method: 'GET', url: '/api/profile', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });
});

describe('PUT /api/profile', () => {
  it('saves a profile and normalizes the mobile number to +91 format', async () => {
    const { app, token } = await registerVerifyAndLogin('save@example.com');

    const res = await app.inject({
      method: 'PUT',
      url: '/api/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...VALID_PROFILE, mobileNumber: '919876543210' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      name: 'Rohit Chauhan',
      mobileNumber: '+919876543210',
      address: '221B Baker Street, Mumbai',
      businessName: null,
    });

    const fetched = await app.inject({
      method: 'GET',
      url: '/api/profile',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json().mobileNumber).toBe('+919876543210');
  });

  it('upserts: a second PUT overwrites the profile', async () => {
    const { app, token } = await registerVerifyAndLogin('twice@example.com');
    const headers = { authorization: `Bearer ${token}` };

    await app.inject({ method: 'PUT', url: '/api/profile', headers, payload: VALID_PROFILE });
    const res = await app.inject({
      method: 'PUT',
      url: '/api/profile',
      headers,
      payload: { ...VALID_PROFILE, name: 'R Chauhan', businessName: 'Padosi Services' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('R Chauhan');
    expect(res.json().businessName).toBe('Padosi Services');
  });

  it('maps an empty businessName to null and keeps a provided one', async () => {
    const { app, token } = await registerVerifyAndLogin('biz@example.com');
    const headers = { authorization: `Bearer ${token}` };

    const empty = await app.inject({
      method: 'PUT',
      url: '/api/profile',
      headers,
      payload: { ...VALID_PROFILE, businessName: '' },
    });
    expect(empty.statusCode).toBe(200);
    expect(empty.json().businessName).toBeNull();
  });

  it.each(['12345', '+14155552671', '91987654321', '09876543210', '+915876543210'])(
    'rejects invalid mobile %s with VALIDATION_ERROR',
    async (mobileNumber) => {
      const { app, token } = await registerVerifyAndLogin('badmobile@example.com');
      const res = await app.inject({
        method: 'PUT',
        url: '/api/profile',
        headers: { authorization: `Bearer ${token}` },
        payload: { ...VALID_PROFILE, mobileNumber },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
      expect(res.json().error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'mobileNumber' })]),
      );
    },
  );

  it('validates name and address lengths', async () => {
    const { app, token } = await registerVerifyAndLogin('lengths@example.com');
    const headers = { authorization: `Bearer ${token}` };

    const emptyName = await app.inject({
      method: 'PUT',
      url: '/api/profile',
      headers,
      payload: { ...VALID_PROFILE, name: '' },
    });
    expect(emptyName.statusCode).toBe(400);

    const longName = await app.inject({
      method: 'PUT',
      url: '/api/profile',
      headers,
      payload: { ...VALID_PROFILE, name: 'x'.repeat(101) },
    });
    expect(longName.statusCode).toBe(400);

    const longAddress = await app.inject({
      method: 'PUT',
      url: '/api/profile',
      headers,
      payload: { ...VALID_PROFILE, address: 'x'.repeat(501) },
    });
    expect(longAddress.statusCode).toBe(400);
  });

  it('marks profileComplete=true on login after the profile is saved', async () => {
    const { app, mailer, token } = await registerVerifyAndLogin('complete@example.com');
    await app.inject({
      method: 'PUT',
      url: '/api/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: VALID_PROFILE,
    });

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'complete@example.com', password: 'password1' },
    });
    const verify = await app.inject({
      method: 'POST',
      url: '/api/auth/login/verify',
      payload: { pendingToken: login.json().pendingToken, code: mailer.lastCodeFor('complete@example.com') },
    });
    expect(verify.json().user.profileComplete).toBe(true);
  });
});
