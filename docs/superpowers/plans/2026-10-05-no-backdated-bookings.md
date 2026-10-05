# No Backdated Bookings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent backdated bookings across both dates and same-day past time slots based on the admin-configured timezone, while allowing logged-in administrators to bypass the restriction.

**Architecture:** 
1. Centralize timezone calculations in `src/lib/date-utils.ts` to convert current time reliably into the admin-configured timezone (defaulting to `Asia/Bangkok`).
2. Enforce server-side validation in `src/app/api/bookings/route.ts` with distinct error messages for past dates vs past times, with admin session bypass.
3. Update Desktop (`src/app/booking/page.tsx`) and Mobile (`src/app/m/booking/page.tsx`) interfaces to anchor "today" to the admin timezone, render past dates in read-only mode, disable past slots on today with a "เลยเวลาแล้ว" indicator, auto-select upcoming slots, and enforce real-time feedback.
4. Record update log in `src/data/updates.json` under version `v1.6.0`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma, Bun Test, Tailwind CSS v4

**Spec:** Aligned design from /grill-me session (Date + Same-day time validation, read-only past date calendar modal, admin bypass, admin-configured timezone, distinct error messages, changelog update).

## Global Constraints

- Default timezone: `Asia/Bangkok` when unset or invalid in `SiteSetting`.
- Thai Buddhist Era (พ.ศ.) display formatting must be preserved.
- Past dates message: `"ไม่อนุญาตให้จองย้อนหลัง กรุณาเลือกวันที่ปัจจุบันหรือในอนาคต"`.
- Past time on today message: `"เวลาเริ่มต้นที่เลือกได้ผ่านไปแล้ว กรุณาเลือกเวลาในอนาคต"`.
- Admin bypass: Users with role `ADMIN` or `SUPER_ADMIN` can submit backdated bookings via API.

## Review Focus

1. Timezone boundary at midnight: when the user's browser is in UTC or US timezone while the system timezone is `Asia/Bangkok`, the system must use `Asia/Bangkok` date/time.
2. Same-day time slot validation: selecting today at 16:15 must reject start times <= 16:15 and disable past quick-select buttons.
3. All slots expired on today: if user opens today after the last operational slot (e.g. 21:00), UI must clearly show that no booking slots are remaining for today.
4. Calendar past date click: clicking a past date still opens the modal to inspect existing bookings in read-only mode, but disables the form.
5. Admin bypass verification: authenticated admin sessions must successfully book past dates/times without 400 error.

---

### Task 1: Timezone & Backdate Helper Functions with Unit Tests

**Files:**
- Modify: `src/lib/date-utils.ts`
- Create: `tests/date-utils.test.ts`

- [ ] **Step 1: Write failing unit tests for timezone-aware date/time functions**
  Create `tests/date-utils.test.ts` verifying:
  - `resolveTimezone` falls back to `Asia/Bangkok` for empty/invalid timezones.
  - `getNowInTimezone` returns `YYYY-MM-DD` and `HH:mm` in the specified timezone.
  - `isBackdated` detects past date as `PAST_DATE`.
  - `isBackdated` detects past time today as `PAST_TIME`.
  - `isBackdated` permits future time today and future dates.

- [ ] **Step 2: Run tests to verify failure**
  Run `bun test tests/date-utils.test.ts`.

- [ ] **Step 3: Implement timezone and backdate helper functions**
  Update `src/lib/date-utils.ts` with `resolveTimezone`, `getNowInTimezone`, and `isBackdated`.

- [ ] **Step 4: Run tests to verify all pass**
  Run `bun test tests/date-utils.test.ts`.

---

### Task 2: Server-Side Validation in Booking API (`POST /api/bookings`)

**Files:**
- Modify: `src/app/api/bookings/route.ts`
- Create: `tests/api-bookings-validation.test.ts`

- [ ] **Step 1: Write unit tests for booking backdate validation logic**
  Create `tests/api-bookings-validation.test.ts` testing the validation logic against regular users and admin sessions.

- [ ] **Step 2: Implement server-side validation in `src/app/api/bookings/route.ts`**
  - Check if session exists and role is `ADMIN` or `SUPER_ADMIN`.
  - If not admin, fetch `timezone` setting from `prisma.siteSetting`.
  - Validate with `isBackdated(date, startTime, timezone)`.
  - Return HTTP 400 with specific error messages if invalid.

- [ ] **Step 3: Run tests to verify validation works**
  Run `bun test tests/api-bookings-validation.test.ts`.

---

### Task 3: Desktop UI Updates (`src/app/booking/page.tsx`)

**Files:**
- Modify: `src/app/booking/page.tsx`

- [ ] **Step 1: Compute today's date and current time using configured timezone**
  Use `getNowInTimezone(settings.timezone)` to determine `todayStr` and `currentTimeStr`.

- [ ] **Step 2: Update calendar styling and read-only mode for past dates**
  - Style past dates (`dateStr < todayStr`) with muted styling.
  - In modal: if `selectedDate < todayStr`, render booking list but hide booking form and display an informational badge/card: `"ไม่อนุญาตให้จองย้อนหลัง (วันที่ผ่านมาแล้ว)"`.

- [ ] **Step 3: Update quick-select slots and default slot selection for today**
  - Disable past slots (`slot.start <= currentTimeStr`) with styling and `"เลยเวลาแล้ว"` tag.
  - Auto-select first available upcoming slot.
  - If all slots passed today, show notice that no slots remain today.

- [ ] **Step 4: Update real-time validation and form submission error handling**
  - Detect `formData.startTime <= currentTimeStr` when `selectedDate === todayStr`.
  - Show warning message and disable submit button.

---

### Task 4: Mobile UI Updates (`src/app/m/booking/page.tsx`)

**Files:**
- Modify: `src/app/m/booking/page.tsx`

- [ ] **Step 1: Align timezone calculations in mobile view**
  Use `getNowInTimezone(settings.timezone)` for `todayStr` and `currentTimeStr`.

- [ ] **Step 2: Handle past dates and same-day past slots in mobile view**
  - Set `min` attribute on native date input to `todayStr`.
  - If a past date is somehow viewed, show existing bookings in read-only mode and hide the booking form with notice.
  - Disable past time slots on today with `"เลยเวลาแล้ว"` indicator.
  - Show real-time feedback if user selects a past time on today.

---

### Task 5: Update Changelog (`src/data/updates.json`)

**Files:**
- Modify: `src/data/updates.json`

- [ ] **Step 1: Add `v1.6.0` release entry**
  Include title, summary, and itemized changes for no-backdated bookings, timezone alignment, and admin bypass.

- [ ] **Step 2: Verify `updates.json` is valid JSON and renders properly in admin changelog**
  Run check or test to verify `src/data/updates.json`.

---

### Task 6: Full Verification and Build Check

- [ ] **Step 1: Run all unit tests**
  Execute `bun test`.

- [ ] **Step 2: Run Next.js build / typecheck**
  Execute `bun run build` or Next.js typecheck to ensure zero TypeScript/lint issues.
