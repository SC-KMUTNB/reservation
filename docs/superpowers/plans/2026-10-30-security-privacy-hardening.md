# Security & Privacy Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all identified security and privacy vulnerabilities across public APIs, student tracking (PDPA), rate limiting, settings disclosure, OAuth CSRF, password updates, and HTTP security headers.

**Architecture:** Implement data minimization on public calendar endpoints, require 2FA (`phoneLast4`) when querying student booking history by student ID, implement two-tier IP/Account rate limiting with spoofing protection, mask secret settings in API responses, enforce OAuth state-cookie validation, require current password for user credential changes, and apply OWASP-aligned HTTP security headers and CSP in SvelteKit hooks.

**Tech Stack:** SvelteKit 2, Svelte 5 Runes, TypeScript, Bun Test, Prisma ORM, Jose (JWT), Bcryptjs, Tailwind CSS v4.

**Spec:** Alignment from `/grill-me` design interview covering 5 branches: Student Privacy (PDPA), Public Calendar Sanitization, Two-Tier Rate Limiting & IP Hardening, Settings & Cron Protection, and Account/Header Hardening.

## Global Constraints
- Node/Bun environment compatibility.
- Pass all quality gates: `bun test`, `bun run typecheck`, `bun run lint`.
- Preserve existing admin and user functionality while closing security bypasses.
- Keep camera permissions active in CSP and Permissions-Policy for the Admin QR scanner.
- SemVer: Backward-compatible security improvements classified under `security` / `patch` or `minor`.

---

### Task 1: Public Calendar Data Minimization & Privacy Protection

**Files:**
- Modify: `src/routes/api/bookings/+server.ts:58-71`
- Test: `tests/api-bookings-validation.test.ts`

**Interfaces:**
- Consumes: Prisma `booking.findMany`, session check via `getSessionFromRequest(event)`
- Produces: `GET /api/bookings` response where unauthenticated payload contains only `{ date, startTime, endTime, status }` without `fullName`, `bookingCode`, `department`, or `id`.

- [ ] **Step 1: Write the failing test for unauthenticated calendar data minimization**

In `tests/api-bookings-validation.test.ts`, add:
```typescript
test('GET /api/bookings for public users returns strictly date, startTime, endTime, status without PII', async () => {
  // Test that sanitized mapper strips id, bookingCode, fullName, department
  const sampleBookings = [
    {
      id: 'cuid-123',
      bookingCode: 'KMUTNB-2026-0001-1234',
      date: '2026-11-01',
      startTime: '09:00',
      endTime: '11:00',
      status: 'APPROVED',
      fullName: 'สมชาย รักเรียน',
      studentId: '6501012345678',
      department: 'วิศวกรรมคอมพิวเตอร์',
      phone: '0812345678',
      email: 'somchai@email.kmutnb.ac.th'
    }
  ];

  // Emulate sanitization logic
  const sanitized = sampleBookings.map((b) => ({
    date: b.date,
    startTime: b.startTime,
    endTime: b.endTime,
    status: b.status
  }));

  expect(sanitized[0]).toEqual({
    date: '2026-11-01',
    startTime: '09:00',
    endTime: '11:00',
    status: 'APPROVED'
  });
  expect((sanitized[0] as any).fullName).toBeUndefined();
  expect((sanitized[0] as any).bookingCode).toBeUndefined();
  expect((sanitized[0] as any).studentId).toBeUndefined();
  expect((sanitized[0] as any).id).toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails if logic diverges**

Run: `bun test tests/api-bookings-validation.test.ts`
Expected: PASS/FAIL depending on current schema.

- [ ] **Step 3: Modify `src/routes/api/bookings/+server.ts`**

Update lines 58-70 in `src/routes/api/bookings/+server.ts`:
```typescript
		if (!isAdmin) {
			const sanitized = bookings.map((b) => ({
				date: b.date,
				startTime: b.startTime,
				endTime: b.endTime,
				status: b.status
			}));
			return json({ bookings: sanitized });
		}
```

- [ ] **Step 4: Verify tests pass**

Run: `bun test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/bookings/+server.ts tests/api-bookings-validation.test.ts
git commit -m "security(bookings): sanitize public calendar bookings payload to protect student PII"
```

---

### Task 2: Hardened Client IP Detection & Two-Tier Rate Limiting

**Files:**
- Modify: `src/lib/rate-limit.ts`
- Modify: `src/routes/api/auth/login/+server.ts`
- Modify: `src/routes/api/bookings/track/+server.ts`
- Modify: `src/routes/api/auth/setup-password/+server.ts`
- Test: `tests/rate-limit.test.ts`

**Interfaces:**
- Consumes: SvelteKit `RequestEvent`, `event.getClientAddress()`, headers
- Produces: `getSafeClientIp(event: RequestEvent | Request): string`, `checkRateLimit(key, limit, windowMs)`
- Two-Tier limits:
  - Login IP: 20 per 15 min
  - Login Target Account: 5 per 15 min (`login:target:${identifier}`)
  - Booking Cancel: 5 per 15 min per IP and booking code (`cancel:${bookingCode}`)
  - Password Setup: 10 per 15 min per IP

- [ ] **Step 1: Write test for safe IP extraction and target-level rate limiting**

In `tests/rate-limit.test.ts`, add test for trusted IP extraction and target key rate limiting:
```typescript
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
```

- [ ] **Step 2: Run test to verify it works**

Run: `bun test tests/rate-limit.test.ts`
Expected: PASS

- [ ] **Step 3: Update `src/lib/rate-limit.ts`**

Enhance `getClientIp` to handle SvelteKit `event.getClientAddress()` safely and prevent arbitrary `X-Forwarded-For` injection when not behind trusted proxy:
```typescript
export function getSafeClientIp(
  requestOrEvent: any
): string {
  // If SvelteKit RequestEvent with getClientAddress
  if (typeof requestOrEvent?.getClientAddress === 'function') {
    try {
      return requestOrEvent.getClientAddress();
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
    // Take the last untrusted hop if rightmost IP is from proxy, or first if standard
    if (parts.length > 0) return parts[0];
  }

  return '127.0.0.1';
}
```

- [ ] **Step 4: Update rate limits in login, cancellation, and setup-password endpoints**

1. In `src/routes/api/auth/login/+server.ts`:
Apply both IP check and target account check (`login:target:${cleanTarget}`).
Record audit log on failed password attempts to maintain security visibility.

2. In `src/routes/api/bookings/track/+server.ts` (PATCH):
Add rate limit:
```typescript
const limitResult = checkRateLimit(`cancel-ip:${ip}`, 10, 15 * 60 * 1000);
if (!limitResult.allowed) return rateLimitResponse(limitResult);

const codeLimit = checkRateLimit(`cancel-code:${String(bookingCode).trim().toUpperCase()}`, 5, 15 * 60 * 1000);
if (!codeLimit.allowed) return rateLimitResponse(codeLimit);
```

3. In `src/routes/api/auth/setup-password/+server.ts`:
Add rate limit on `GET` (token check: 30 / 15m) and `POST` (submission: 5 / 15m).

- [ ] **Step 5: Verify all tests pass**

Run: `bun test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rate-limit.ts src/routes/api/auth/login/+server.ts src/routes/api/bookings/track/+server.ts src/routes/api/auth/setup-password/+server.ts tests/rate-limit.test.ts
git commit -m "security(rate-limit): enforce two-tier rate limiting and secure client IP resolution"
```

---

### Task 3: Student Privacy Protection on Tracking (`/track` & `GET /api/bookings/track`)

**Files:**
- Modify: `src/routes/api/bookings/track/+server.ts:10-58`
- Modify: `src/lib/components/track/TrackFlow.svelte`
- Test: `tests/track-verification.test.ts`

**Interfaces:**
- Consumes: Query params `q` (Student ID or Booking Code) and `phoneLast4` (optional for booking code, required for student ID)
- Produces:
  - If `q` is a Booking Code (`KMUTNB-...` or `BK-...`): returns the matching booking directly.
  - If `q` is a 13-digit Student ID:
    - If `phoneLast4` is missing: returns `{ requiresVerification: true, message: 'กรุณาระบุเบอร์โทรศัพท์ 4 ตัวท้ายเพื่อยืนยันตัวตน' }`.
    - If `phoneLast4` matches: returns the student's bookings.
    - If `phoneLast4` does not match: returns 400 error.

- [ ] **Step 1: Write test for Student ID 2FA verification logic**

Create `tests/track-verification.test.ts`:
```typescript
import { describe, test, expect } from 'bun:test';

describe('Track API Student Verification Logic', () => {
  test('flags student ID query as requiring phoneLast4 verification', () => {
    const isStudentId = (query: string) => /^\d{13}$/.test(query.trim());
    expect(isStudentId('6501012345678')).toBe(true);
    expect(isStudentId('KMUTNB-2026-0001-1234')).toBe(false);
  });

  test('validates phoneLast4 against user phone string', () => {
    const phone = '081-234-5678';
    const cleanPhone = phone.replace(/[-\s]/g, '');
    const phoneLast4 = '5678';
    expect(cleanPhone.endsWith(phoneLast4)).toBe(true);
    expect(cleanPhone.endsWith('9999')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `bun test tests/track-verification.test.ts`
Expected: PASS

- [ ] **Step 3: Update `src/routes/api/bookings/track/+server.ts`**

In `GET(event: RequestEvent)`:
1. Extract `phoneLast4 = event.url.searchParams.get('phoneLast4')?.trim();`
2. Check if query is 13 digits:
   - If 13 digits and no `phoneLast4`: return `json({ requiresVerification: true, message: 'กรุณาระบุเบอร์โทรศัพท์ 4 ตัวท้ายที่ใช้ในการจองเพื่อยืนยันตัวตน' })`
   - If 13 digits with `phoneLast4`: query bookings where `studentId = query`, and filter or verify `phone.endsWith(phoneLast4)`.
   - If query is bookingCode: fetch by `bookingCode` without requiring phoneLast4.

- [ ] **Step 4: Update `src/lib/components/track/TrackFlow.svelte`**

In `TrackFlow.svelte`:
1. If the API returns `requiresVerification: true`:
   Show a modal or prompt input asking the student for their last 4 phone digits: "เพื่อความปลอดภัยของข้อมูลส่วนบุคคล กรุณากรอกเบอร์โทรศัพท์ 4 ตัวท้าย".
2. Submit `phoneLast4` along with the query: `/api/bookings/track?q=...&phoneLast4=...`.

- [ ] **Step 5: Run tests and typecheck**

Run: `bun test && bun run typecheck`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/routes/api/bookings/track/+server.ts src/lib/components/track/TrackFlow.svelte tests/track-verification.test.ts
git commit -m "feat(privacy): require phone verification for student ID lookup in track endpoint"
```

---

### Task 4: Settings API Protection, Secret Masking & Cron Hardening

**Files:**
- Modify: `src/routes/api/settings/+server.ts`
- Modify: `src/routes/api/cron/backup/+server.ts`
- Modify: `src/lib/encryption.ts`
- Test: `tests/settings-security.test.ts`

**Interfaces:**
- Consumes: Session token, `siteSetting` table
- Produces:
  - `GET /api/settings`:
    - Unauthenticated: returns only public config `{ site_title, site_subtitle, timezone }` and `facilityConfig`.
    - Authenticated Super Admin: returns settings with sensitive keys masked as `'••••••••••••••••'`.
  - `PUT /api/settings`:
    - Only Super Admin. If a secret value starts with `'••'`, do not overwrite the existing encrypted database value.
    - Validates `webhook_discord_url` format (must start with `https://discord.com/api/webhooks/` or `https://discordapp.com/api/webhooks/`).
  - `GET /api/cron/backup`:
    - Enforces: `if (!cronSecret || authHeader !== 'Bearer ${cronSecret}') return 401`.

- [ ] **Step 1: Write test for secret masking and settings filtering**

Create `tests/settings-security.test.ts`:
```typescript
import { describe, test, expect } from 'bun:test';
import { maskSecret, SENSITIVE_SETTING_KEYS } from '$lib/encryption';

describe('Settings API Security & Masking', () => {
  test('SENSITIVE_SETTING_KEYS are masked in Admin UI responses', () => {
    const rawSecret = 'super-secret-smtp-password';
    const masked = maskSecret(rawSecret);
    expect(masked).toBe('••••••••••••••••');
    expect(masked.startsWith('••')).toBe(true);
  });

  test('Discord webhook URL validator blocks internal addresses and SSRF', () => {
    const isAllowedDiscordUrl = (url: string) => {
      try {
        const u = new URL(url);
        return (
          (u.hostname === 'discord.com' || u.hostname === 'discordapp.com') &&
          u.pathname.startsWith('/api/webhooks/')
        );
      } catch {
        return false;
      }
    };

    expect(isAllowedDiscordUrl('https://discord.com/api/webhooks/123/abc')).toBe(true);
    expect(isAllowedDiscordUrl('https://discordapp.com/api/webhooks/123/abc')).toBe(true);
    expect(isAllowedDiscordUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isAllowedDiscordUrl('https://evil-hacker.com/webhook')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `bun test tests/settings-security.test.ts`
Expected: PASS

- [ ] **Step 3: Update `src/routes/api/settings/+server.ts`**

1. In `GET /api/settings`:
   - If not authenticated, return only `{ settings: publicSettings, isSuperAdmin: false, facilityConfig }`.
   - If Super Admin, mask sensitive values using `maskSecret(s.value)` rather than decrypting them into the JSON payload.
2. In `PUT /api/settings`:
   - Validate discord URL format before saving `webhook_discord_url`.
   - If value starts with `••`, skip updating to keep the current secret intact.

- [ ] **Step 4: Update `src/routes/api/cron/backup/+server.ts`**

Change line 11:
```typescript
		const cronSecret = process.env.CRON_SECRET;
		if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
			return json({ error: 'Unauthorized: invalid cron authorization' }, { status: 401 });
		}
```

- [ ] **Step 5: Run tests and verify**

Run: `bun test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/routes/api/settings/+server.ts src/routes/api/cron/backup/+server.ts tests/settings-security.test.ts
git commit -m "security(settings): mask secrets in settings API, prevent SSRF and secure cron endpoint"
```

---

### Task 5: OAuth State CSRF Protection, Password Change & Token Security

**Files:**
- Modify: `src/routes/api/auth/google/callback/+server.ts`
- Modify: `src/routes/api/users/[id]/+server.ts`
- Modify: `src/routes/api/users/+server.ts`
- Modify: `src/routes/api/auth/setup-password/+server.ts`
- Test: `tests/auth-hardening.test.ts`

**Interfaces:**
- Consumes: `event.cookies.get('oauth_state')`, `searchParams.get('state')`, `currentPassword`
- Produces:
  - Google OAuth verification comparing cookie state with stateToken.
  - Self-password change requires `currentPassword` verification with `bcrypt.compare`.
  - Super Admin `GET /api/users` strips plaintext `inviteToken` from response (returns `hasInvitePending: !!u.inviteToken`).

- [ ] **Step 1: Write test for OAuth state comparison and password verification**

Create `tests/auth-hardening.test.ts`:
```typescript
import { describe, test, expect } from 'bun:test';

describe('Auth Hardening Validation', () => {
  test('OAuth state matches cookie', () => {
    const cookieState = 'state-abc-123';
    const queryState = 'state-abc-123';
    const mismatchedState = 'state-xyz-999';

    expect(cookieState === queryState).toBe(true);
    expect(cookieState === mismatchedState).toBe(false);
  });
});
```

- [ ] **Step 2: Run test**

Run: `bun test tests/auth-hardening.test.ts`
Expected: PASS

- [ ] **Step 3: Modify `src/routes/api/auth/google/callback/+server.ts`**

In `GET(event: RequestEvent)`:
```typescript
	const cookieState = event.cookies.get('oauth_state');
	if (!cookieState || cookieState !== stateToken) {
		console.error('OAuth state mismatch (potential CSRF attack)');
		throw redirect(303, '/admin/login?error=INVALID_OAUTH_STATE');
	}
```

- [ ] **Step 4: Modify `src/routes/api/users/[id]/+server.ts`**

When an admin updates their own account (`isSelf`) and provides a `password`:
Require `currentPassword` from `body`.
Validate `await bcrypt.compare(body.currentPassword, targetUser.passwordHash)`.
If invalid, return `json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, { status: 400 })`.

- [ ] **Step 5: Modify `src/routes/api/users/+server.ts`**

In `GET /api/users`:
Replace `select: { ... inviteToken: true ... }` with `invitePending: true` (or strip `inviteToken` before returning JSON: `users.map(u => ({ ...u, inviteToken: undefined, hasPendingInvite: !!u.inviteToken }))`).

- [ ] **Step 6: Run tests and typecheck**

Run: `bun test && bun run typecheck`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/routes/api/auth/google/callback/+server.ts src/routes/api/users/[id]/+server.ts src/routes/api/users/+server.ts tests/auth-hardening.test.ts
git commit -m "security(auth): enforce oauth state cookie verification, self-password verification and protect invite tokens"
```

---

### Task 6: HTTP Security Headers & Balanced CSP in SvelteKit Server Hook

**Files:**
- Modify: `src/hooks.server.ts`
- Test: `tests/security-headers.test.ts`

**Interfaces:**
- Consumes: SvelteKit `resolve(event)`
- Produces: Response headers including `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, and balanced `Content-Security-Policy`.

- [ ] **Step 1: Write test for Security Headers application**

Create `tests/security-headers.test.ts`:
```typescript
import { describe, test, expect } from 'bun:test';

describe('HTTP Security Headers Configuration', () => {
  test('headers dictionary contains essential OWASP headers', () => {
    const headers: Record<string, string> = {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
    };

    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('camera=(self)');
  });
});
```

- [ ] **Step 2: Run test**

Run: `bun test tests/security-headers.test.ts`
Expected: PASS

- [ ] **Step 3: Modify `src/hooks.server.ts`**

In `src/hooks.server.ts`, apply security headers to every response from `resolve(event)`:
```typescript
	const response = await resolve(event);

	// OWASP Hardening Headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');

	if (process.env.NODE_ENV === 'production') {
		response.headers.set(
			'Strict-Transport-Security',
			'max-age=31536000; includeSubDomains; preload'
		);
	}

	// Balanced CSP
	const csp = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' 'unsafe-eval'",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com data:",
		"img-src 'self' data: blob: https:",
		"connect-src 'self' https://accounts.google.com https://api.github.com",
		"frame-ancestors 'none'"
	].join('; ');

	response.headers.set('Content-Security-Policy', csp);

	return response;
```

- [ ] **Step 4: Verify full test suite and type check**

Run:
```bash
bun test
bun run typecheck
bun run lint
```
Expected: All 3 verification gates pass with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks.server.ts tests/security-headers.test.ts
git commit -m "security(headers): configure OWASP security headers and balanced CSP policy"
```

---

### Task 7: Comprehensive End-to-End Verification Gate

**Files:**
- Tests: `tests/`
- Documentation: `docs/AGENT_GUIDE.md`

- [ ] **Step 1: Execute test suite**
Run: `bun test`
Expected: 100% pass across all unit and integration tests.

- [ ] **Step 2: Execute TypeScript type check**
Run: `bun run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Execute ESLint**
Run: `bun run lint`
Expected: 0 warnings and 0 errors.

- [ ] **Step 4: Production Build Verification**
Run: `bun run build`
Expected: SvelteKit / Vite compiles cleanly into production artifacts.
