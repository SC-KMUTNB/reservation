import { describe, expect, test, beforeEach, spyOn } from 'bun:test';
import { checkRateLimit, resetRateLimits, getClientIp, getSafeClientIp } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';

describe('Sliding-window IP rate limiter', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  test('allows requests within limit and updates remaining', () => {
    const key = 'test-ip-1';
    const limit = 3;
    const windowMs = 60 * 1000;
    const baseTime = 1000000;

    const r1 = checkRateLimit(key, limit, windowMs, baseTime);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, limit, windowMs, baseTime + 1000);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(key, limit, windowMs, baseTime + 2000);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    // 4th request exceeds limit
    const r4 = checkRateLimit(key, limit, windowMs, baseTime + 3000);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.resetAfterSec).toBeGreaterThan(0);
  });

  test('slides window and frees slots once oldest request expires', () => {
    const key = 'test-ip-slide';
    const limit = 2;
    const windowMs = 10 * 1000; // 10s
    const t0 = 50000;

    checkRateLimit(key, limit, windowMs, t0);
    checkRateLimit(key, limit, windowMs, t0 + 2000);

    // Blocked at t0 + 5000
    const blocked = checkRateLimit(key, limit, windowMs, t0 + 5000);
    expect(blocked.allowed).toBe(false);

    // After 10.1s from t0, first request has fallen out of window
    const allowedAfterExpiry = checkRateLimit(key, limit, windowMs, t0 + 10100);
    expect(allowedAfterExpiry.allowed).toBe(true);
  });

  test('Two-tier rate limiting distinguishes different target keys under the same IP', () => {
    const ip = '192.168.1.50';
    const user1 = 'admin1@kmutnb.ac.th';
    const user2 = 'admin2@kmutnb.ac.th';

    for (let i = 0; i < 5; i++) {
      checkRateLimit(`login:target:${user1}`, 5, 60000);
    }

    const user1Blocked = checkRateLimit(`login:target:${user1}`, 5, 60000);
    const user2Allowed = checkRateLimit(`login:target:${user2}`, 5, 60000);

    expect(user1Blocked.allowed).toBe(false);
    expect(user2Allowed.allowed).toBe(true);
  });

  test('Two-tier rate limiting allows multiple accounts from shared IP up to IP limit', () => {
    const ip = '192.168.1.100';
    // 20 requests under login-ip
    for (let i = 0; i < 20; i++) {
      const res = checkRateLimit(`login:${ip}`, 20, 60000);
      expect(res.allowed).toBe(true);
    }
    // 21st request from same IP is blocked
    const ipBlocked = checkRateLimit(`login:${ip}`, 20, 60000);
    expect(ipBlocked.allowed).toBe(false);
  });

  test('Rate limiting handles cancel-ip and cancel-code independently', () => {
    const ip = '10.0.0.1';
    const code1 = 'BK-20261030-001';
    const code2 = 'BK-20261030-002';

    for (let i = 0; i < 5; i++) {
      checkRateLimit(`cancel-code:${code1}`, 5, 60000);
    }
    expect(checkRateLimit(`cancel-code:${code1}`, 5, 60000).allowed).toBe(false);
    expect(checkRateLimit(`cancel-code:${code2}`, 5, 60000).allowed).toBe(true);
    expect(checkRateLimit(`cancel-ip:${ip}`, 10, 60000).allowed).toBe(true);
  });

  test('getClientIp extracts IP correctly from headers', () => {
    // 1. Multiple x-forwarded-for IPs
    const req1 = {
      headers: new Headers({ 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' }),
    };
    expect(getClientIp(req1 as any)).toBe('203.0.113.195');

    // 2. x-real-ip
    const req2 = {
      headers: new Headers({ 'x-real-ip': '198.51.100.4' }),
    };
    expect(getClientIp(req2 as any)).toBe('198.51.100.4');

    // 3. Fallback when empty
    const req3 = {
      headers: new Headers(),
    };
    expect(getClientIp(req3 as any)).toBe('127.0.0.1');
  });

  test('getSafeClientIp prioritizes getClientAddress when available on event', () => {
    const mockEvent = {
      getClientAddress: () => '203.0.113.50',
      request: {
        headers: new Headers({
          'cf-connecting-ip': '198.51.100.99',
          'x-forwarded-for': '1.2.3.4'
        })
      }
    };
    expect(getSafeClientIp(mockEvent as any)).toBe('203.0.113.50');
  });

  test('getSafeClientIp falls back to headers if getClientAddress throws', () => {
    const mockEvent = {
      getClientAddress: () => {
        throw new Error('Not available');
      },
      request: {
        headers: new Headers({
          'cf-connecting-ip': '198.51.100.99'
        })
      }
    };
    expect(getSafeClientIp(mockEvent as any)).toBe('198.51.100.99');
  });

  test('getSafeClientIp prioritizes cf-connecting-ip over x-real-ip and x-forwarded-for', () => {
    const req = {
      headers: new Headers({
        'cf-connecting-ip': '1.1.1.1',
        'x-real-ip': '2.2.2.2',
        'x-forwarded-for': '3.3.3.3, 4.4.4.4'
      })
    };
    expect(getSafeClientIp(req as any)).toBe('1.1.1.1');
  });

  test('getSafeClientIp prioritizes x-real-ip over x-forwarded-for when cf-connecting-ip is absent', () => {
    const req = {
      headers: new Headers({
        'x-real-ip': '2.2.2.2',
        'x-forwarded-for': '3.3.3.3, 4.4.4.4'
      })
    };
    expect(getSafeClientIp(req as any)).toBe('2.2.2.2');
  });

  test('getSafeClientIp returns 127.0.0.1 for null, undefined, or missing headers', () => {
    expect(getSafeClientIp(null as any)).toBe('127.0.0.1');
    expect(getSafeClientIp(undefined as any)).toBe('127.0.0.1');
    expect(getSafeClientIp({} as any)).toBe('127.0.0.1');
  });

  describe('Route-level rate limit integration', () => {
    beforeEach(() => {
      (prisma as any).user = {
        findFirst: async () => null,
        findUnique: async () => null,
      };
      (prisma as any).booking = {
        findFirst: async () => null,
      };
    });

    test('POST /api/auth/login enforces IP and target rate limits and logs audit', async () => {
      const { POST: loginHandler } = await import('@/routes/api/auth/login/+server');
      const auditModule = await import('@/lib/audit');
      const auditLogs: any[] = [];
      const auditSpy = spyOn(auditModule, 'recordAuditLog').mockImplementation(async (entry) => {
        auditLogs.push(entry);
        return entry as any;
      });

      const ip = '10.20.30.40';
      const makeLoginRequest = (body: any) => ({
        getClientAddress: () => ip,
        request: new Request('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body)
        }),
        cookies: { set: () => {} }
      });

      // Target level rate limit: 5 attempts
      for (let i = 0; i < 5; i++) {
        const res = await loginHandler(makeLoginRequest({
          identifier: 'victim@kmutnb.ac.th',
          password: 'wrong-password'
        }) as any);
        expect(res.status).toBe(401);
      }

      // 6th attempt on the same target is blocked by target limit (429)
      const blockedTargetRes = await loginHandler(makeLoginRequest({
        identifier: 'victim@kmutnb.ac.th',
        password: 'wrong-password'
      }) as any);
      expect(blockedTargetRes.status).toBe(429);

      // Verify LOGIN_FAILED was logged for failed attempts
      expect(auditLogs.some(log => log.action === 'LOGIN_FAILED')).toBe(true);
      // Verify LOGIN_RATE_LIMITED was logged when blocked
      expect(auditLogs.some(log => log.action === 'LOGIN_RATE_LIMITED')).toBe(true);

      auditSpy.mockRestore();
    });

    test('PATCH /api/bookings/track enforces cancellation rate limits on IP and bookingCode', async () => {
      const { PATCH: trackPatchHandler } = await import('@/routes/api/bookings/track/+server');
      const ip = '10.50.60.70';
      const bookingCode = 'BK-CANCEL-TEST';

      const makeCancelRequest = (code: string) => ({
        getClientAddress: () => ip,
        request: new Request('http://localhost:3000/api/bookings/track', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            bookingCode: code,
            studentId: '1234567890123',
            phoneLast4: '1234'
          })
        })
      });

      // 5 requests on code
      for (let i = 0; i < 5; i++) {
        const res = await trackPatchHandler(makeCancelRequest(bookingCode) as any);
        expect(res.status).toBe(404);
      }

      // 6th request for same code is blocked (429)
      const resBlocked = await trackPatchHandler(makeCancelRequest(bookingCode) as any);
      expect(resBlocked.status).toBe(429);
    });

    test('setup-password GET and POST enforce rate limits', async () => {
      const { GET: setupGetHandler, POST: setupPostHandler } = await import('@/routes/api/auth/setup-password/+server');
      const ip = '10.70.80.90';

      const makeGetRequest = () => ({
        getClientAddress: () => ip,
        url: new URL('http://localhost:3000/api/auth/setup-password?token=some-token'),
        request: new Request('http://localhost:3000/api/auth/setup-password?token=some-token')
      });

      const makePostRequest = () => ({
        getClientAddress: () => ip,
        request: new Request('http://localhost:3000/api/auth/setup-password', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: 'test-token', password: 'new-password-123' })
        }),
        cookies: { set: () => {} }
      });

      // GET limit is 30
      for (let i = 0; i < 30; i++) {
        const res = await setupGetHandler(makeGetRequest() as any);
        expect(res.status).toBe(400); // 400 because token not found in mock
      }
      const blockedGet = await setupGetHandler(makeGetRequest() as any);
      expect(blockedGet.status).toBe(429);

      // POST limit is 5
      for (let i = 0; i < 5; i++) {
        const res = await setupPostHandler(makePostRequest() as any);
        expect(res.status).toBe(400); // 400 because token not found in mock
      }
      const blockedPost = await setupPostHandler(makePostRequest() as any);
      expect(blockedPost.status).toBe(429);
    });
  });
});
