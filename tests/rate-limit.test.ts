import { describe, expect, test, beforeEach } from 'bun:test';
import { checkRateLimit, resetRateLimits, getClientIp } from '@/lib/rate-limit';

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
});
