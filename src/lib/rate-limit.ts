export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAfterSec: number;
}

class SlidingWindowRateLimiter {
  private windows: Map<string, number[]> = new Map();
  private lastPruneTime: number = Date.now();
  private readonly pruneIntervalMs: number = 60 * 1000; // prune every 1 minute

  public check(key: string, limit: number, windowMs: number, now: number = Date.now()): RateLimitResult {
    this.maybePrune(now);

    const windowStart = now - windowMs;
    const timestamps = this.windows.get(key) || [];
    const validTimestamps = timestamps.filter((t) => t > windowStart);

    if (validTimestamps.length >= limit) {
      const oldest = validTimestamps[0];
      const resetAfterMs = oldest + windowMs - now;
      const resetAfterSec = Math.max(1, Math.ceil(resetAfterMs / 1000));

      this.windows.set(key, validTimestamps);
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetAfterSec,
      };
    }

    validTimestamps.push(now);
    this.windows.set(key, validTimestamps);

    const resetAfterSec = Math.max(1, Math.ceil(windowMs / 1000));
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - validTimestamps.length),
      resetAfterSec,
    };
  }

  public reset(): void {
    this.windows.clear();
  }

  private maybePrune(now: number): void {
    if (now - this.lastPruneTime < this.pruneIntervalMs) return;
    this.lastPruneTime = now;

    // Prune items older than 20 minutes across all keys
    const threshold = now - 20 * 60 * 1000;
    for (const [key, timestamps] of this.windows.entries()) {
      const active = timestamps.filter((t) => t > threshold);
      if (active.length === 0) {
        this.windows.delete(key);
      } else {
        this.windows.set(key, active);
      }
    }
  }
}

const limiter = new SlidingWindowRateLimiter();

export function getSafeClientIp(
  requestOrEvent: any
): string {
  // If SvelteKit RequestEvent with getClientAddress
  if (typeof requestOrEvent?.getClientAddress === 'function') {
    try {
      const addr = requestOrEvent.getClientAddress();
      if (addr && typeof addr === 'string' && addr.trim()) {
        return addr.trim();
      }
    } catch {}
  }

  const req = requestOrEvent?.request || requestOrEvent;
  const headers = req?.headers;
  if (!headers) return '127.0.0.1';

  // Cloudflare Connecting IP is set directly by Cloudflare edge proxy
  const cfIp = headers.get?.('cf-connecting-ip');
  if (cfIp && cfIp.trim()) return cfIp.trim();

  // Vercel / Standard reverse proxy header
  const realIp = headers.get?.('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();

  const forwarded = headers.get?.('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((p: string) => p.trim()).filter(Boolean);
    // Take the leftmost hop in standard XFF
    if (parts.length > 0) return parts[0];
  }

  return '127.0.0.1';
}

export function getClientIp(
  requestOrEvent: any
): string {
  return getSafeClientIp(requestOrEvent);
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now?: number
): RateLimitResult {
  return limiter.check(key, limit, windowMs, now);
}

export function resetRateLimits(): void {
  limiter.reset();
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return Response.json(
    { error: 'คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง' },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.resetAfterSec),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
      },
    }
  );
}
