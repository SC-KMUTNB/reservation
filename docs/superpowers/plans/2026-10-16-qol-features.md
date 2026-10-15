# Comprehensive QoL Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement high-value Quality-of-Life (QoL) features for both students and administrators in the KMUTNB room reservation system, including public calendar availability heatmaps, per-person customizable admin dashboards with database sync, switchable visual calendar/timeline schedule views, and batch approval/rejection with conflict protection.

**Architecture:** Extend Prisma schema with user-level preferences for cross-device persistence; provide dedicated batch booking mutation API with transactional conflict detection; introduce pure helper functions for date availability/capacity calculations; build modular React components for switchable timeline/calendar views and customizable dashboard widgets across Desktop and Mobile routes.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS v4, Lucide React.

**Spec:** Synthesized through `/grill-me` interactive interview session (2026-10-16).

## Global Constraints

- Preserve all existing business logic for booking validation, timezone handling (`Asia/Bangkok`), Google Sheets sync, and audit logging.
- Maintain full feature parity between desktop routes (`/booking`, `/admin/...`) and mobile routes (`/m/booking`, `/m/admin/...`).
- Database migrations must be non-destructive and backward compatible with existing records.
- All client-side components must remain accessible, responsive, and follow the existing KMUTNB orange/slate UI aesthetic.

## Review Focus

- **Overlapping Batch Approval:** If an admin bulk-selects 3 bookings where 2 share the same time slot, only the non-conflicting one is approved and the remaining ones are safely rejected/flagged with specific conflict reasons.
- **Capacity Calculation Accuracy:** Partial hour bookings or multi-hour bookings must accurately subtract from the 12-hour operational window (08:00 - 20:00) without negative or overflowing percentages.
- **Preference Fallback:** If a user has no custom preferences saved in the database (or is an existing user prior to migration), the dashboard must fall back smoothly to sensible defaults without crashes.
- **Mobile Touch Usability:** Visual calendar timeline and batch checkboxes must be comfortably tappable on smaller screens (min 44px touch targets).
- **Timezone Preservation:** Availability indicators must respect `SiteSetting` timezone (`Asia/Bangkok`) consistently across client rendering.

---

### Task 1: Database Schema & User Dashboard Preferences API

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/app/api/users/preferences/route.ts`
- Modify: `src/lib/auth.ts`
- Test: `tests/user-preferences.test.ts`

**Interfaces:**
- Consumes: `getSessionFromRequest(req)` from `src/lib/auth.ts`, `prisma.user`
- Produces: `UserDashboardPreferences` type, `GET /api/users/preferences`, `PATCH /api/users/preferences`

- [ ] **Step 1: Write the failing test for user preferences API**

```typescript
// tests/user-preferences.test.ts
import { describe, it, expect } from 'bun:test';

describe('User Preferences Schema & Defaults', () => {
  it('should validate and merge default preferences correctly', () => {
    const { mergeUserPreferences, DEFAULT_USER_PREFERENCES } = require('../src/lib/user-preferences');
    const custom = { defaultView: 'CALENDAR', density: 'compact' };
    const merged = mergeUserPreferences(custom);
    expect(merged.defaultView).toBe('CALENDAR');
    expect(merged.density).toBe('compact');
    expect(merged.visibleWidgets).toEqual(DEFAULT_USER_PREFERENCES.visibleWidgets);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/user-preferences.test.ts`
Expected: FAIL with "Cannot find module '../src/lib/user-preferences'"

- [ ] **Step 3: Update `prisma/schema.prisma` and create preference helpers**

Add `preferences Json?` to `model User` in `prisma/schema.prisma`.
Create `src/lib/user-preferences.ts`:
```typescript
export interface UserDashboardPreferences {
  defaultView: 'TABLE' | 'TIMELINE' | 'MONTH';
  defaultStatusFilter: 'ALL' | 'PENDING' | 'APPROVED' | 'TODAY';
  tableDensity: 'normal' | 'compact';
  visibleWidgets: string[]; // e.g. ['PENDING', 'TODAY', 'URGENT', 'WEEKLY']
  visibleColumns: {
    department: boolean;
    studentId: boolean;
    reason: boolean;
    approvedBy: boolean;
  };
}

export const DEFAULT_USER_PREFERENCES: UserDashboardPreferences = {
  defaultView: 'TABLE',
  defaultStatusFilter: 'ALL',
  tableDensity: 'normal',
  visibleWidgets: ['PENDING', 'TODAY', 'URGENT', 'WEEKLY'],
  visibleColumns: {
    department: true,
    studentId: true,
    reason: true,
    approvedBy: true,
  },
};
```

Run Prisma push/generate:
`bunx prisma generate`

- [ ] **Step 4: Implement `src/app/api/users/preferences/route.ts`**

Implement `GET` and `PATCH` routes requiring admin session, reading and updating `user.preferences`.

- [ ] **Step 5: Run tests and verify they pass**

Run: `bun test tests/user-preferences.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/lib/user-preferences.ts src/app/api/users/preferences/route.ts tests/user-preferences.test.ts
git commit -m "feat(preferences): add user dashboard preferences schema and api"
```

---

### Task 2: Public Calendar Availability Heatmap & Free Hours Calculation

**Files:**
- Create: `src/lib/booking-capacity.ts`
- Modify: `src/app/booking/page.tsx`
- Modify: `src/app/m/booking/page.tsx`
- Test: `tests/booking-capacity.test.ts`

**Interfaces:**
- Consumes: `OPERATIONAL_SLOTS` (08:00 to 20:00 = 12 total hours), `BookingItem`
- Produces: `calculateDayAvailability(dateStr: string, bookings: BookingItem[], isPast: boolean)`

- [ ] **Step 1: Write the failing test for day capacity calculations**

```typescript
// tests/booking-capacity.test.ts
import { describe, it, expect } from 'bun:test';
import { calculateDayAvailability } from '../src/lib/booking-capacity';

describe('calculateDayAvailability', () => {
  it('should return 12 free hours for an empty future day', () => {
    const res = calculateDayAvailability('2026-11-01', [], false);
    expect(res.freeHours).toBe(12);
    expect(res.statusLevel).toBe('FREE');
    expect(res.label).toBe('ว่างทั้งวัน');
  });

  it('should deduct approved hours correctly', () => {
    const bookings = [
      { startTime: '09:00', endTime: '12:00', status: 'APPROVED' as const, id: '1', bookingCode: 'A', date: '2026-11-01', department: 'D', fullName: 'F' }
    ];
    const res = calculateDayAvailability('2026-11-01', bookings, false);
    expect(res.freeHours).toBe(9);
    expect(res.statusLevel).toBe('MODERATE');
    expect(res.label).toBe('ว่าง 9 ชม.');
  });

  it('should mark completely booked day as FULL', () => {
    const bookings = [
      { startTime: '08:00', endTime: '20:00', status: 'APPROVED' as const, id: '1', bookingCode: 'A', date: '2026-11-01', department: 'D', fullName: 'F' }
    ];
    const res = calculateDayAvailability('2026-11-01', bookings, false);
    expect(res.freeHours).toBe(0);
    expect(res.statusLevel).toBe('FULL');
    expect(res.label).toBe('เต็มทุกช่วง');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/booking-capacity.test.ts`
Expected: FAIL with "Cannot find module '../src/lib/booking-capacity'"

- [ ] **Step 3: Implement `src/lib/booking-capacity.ts`**

Implement capacity deduction logic handling disjoint and contiguous approved bookings between 08:00 and 20:00.

- [ ] **Step 4: Update Desktop & Mobile booking calendars**

In `src/app/booking/page.tsx` and `src/app/m/booking/page.tsx`:
- Import `calculateDayAvailability`.
- In the calendar day cell loop, render the availability badge pill and color-coded mini capacity progress bar:
  - Green bar (> 60% free)
  - Amber bar (20% - 60% free)
  - Rose bar (< 20% or 0 free)
- Replace generic "X รายการ" with the free hour pill and bar.

- [ ] **Step 5: Run tests and verify**

Run: `bun test tests/booking-capacity.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/booking-capacity.ts src/app/booking/page.tsx src/app/m/booking/page.tsx tests/booking-capacity.test.ts
git commit -m "feat(calendar): add availability heatmap and free-hours indicator on public calendar"
```

---

### Task 3: Admin Batch Actions API & UI

**Files:**
- Create: `src/app/api/admin/bookings/batch/route.ts`
- Modify: `src/app/admin/dashboard/page.tsx`
- Modify: `src/app/m/admin/dashboard/page.tsx`
- Test: `tests/batch-bookings.test.ts`

**Interfaces:**
- Consumes: `prisma.booking`, `recordAuditLog`, `notifyUserBookingStatusUpdate`
- Produces: `POST /api/admin/bookings/batch` accepting `{ action: 'APPROVE' | 'REJECT', bookingIds: string[], rejectionReason?: string }`

- [ ] **Step 1: Write test for batch booking conflict validation logic**

```typescript
// tests/batch-bookings.test.ts
import { describe, it, expect } from 'bun:test';
import { validateBatchApproval } from '../../src/lib/batch-validation';

describe('validateBatchApproval', () => {
  it('should detect overlaps among selected batch candidates', () => {
    const candidates = [
      { id: '1', date: '2026-11-01', startTime: '09:00', endTime: '11:00', fullName: 'User A' },
      { id: '2', date: '2026-11-01', startTime: '10:00', endTime: '12:00', fullName: 'User B' }
    ];
    const { approved, conflicts } = validateBatchApproval(candidates, []);
    expect(approved.map(a => a.id)).toEqual(['1']);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].id).toBe('2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/batch-bookings.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/lib/batch-validation.ts` and `src/app/api/admin/bookings/batch/route.ts`**

- In `src/lib/batch-validation.ts`: pure validation function checking pairwise overlaps and overlaps against existing approved bookings.
- In `src/app/api/admin/bookings/batch/route.ts`:
  - Enforce admin authentication.
  - Execute database updates inside a Prisma transaction for approved items.
  - Trigger email notification and audit logging for each processed booking.
  - Return `{ successCount, conflictCount, conflicts }`.

- [ ] **Step 4: Integrate multi-select checkboxes & floating action bar in Admin Dashboards**

In `src/app/admin/dashboard/page.tsx` and `src/app/m/admin/dashboard/page.tsx`:
- Add `selectedIds: Set<string>` state.
- Add select-all checkbox header in table.
- Display sticky bottom floating bar when `selectedIds.size > 0` with:
  - Selected count badge
  - "อนุมัติที่เลือก" button with confirmation modal & conflict preview
  - "ปฏิเสธที่เลือก" button with preset/custom reason dropdown
  - "ยกเลิกการเลือก" button

- [ ] **Step 5: Run tests and verify**

Run: `bun test tests/batch-bookings.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/batch-validation.ts src/app/api/admin/bookings/batch/route.ts src/app/admin/dashboard/page.tsx src/app/m/admin/dashboard/page.tsx tests/batch-bookings.test.ts
git commit -m "feat(admin): add bulk approve and bulk reject with conflict validation"
```

---

### Task 4: Switchable Admin Visual Calendar & Timeline View

**Files:**
- Create: `src/components/admin/AdminScheduleTimeline.tsx`
- Create: `src/components/admin/AdminMonthCalendar.tsx`
- Modify: `src/app/admin/dashboard/page.tsx`
- Modify: `src/app/m/admin/dashboard/page.tsx`

**Interfaces:**
- Consumes: `bookings: AdminBooking[]`, `onSelectBooking: (b: AdminBooking) => void`
- Produces: Visual Day/Week timeline grid and Month view components with conflict highlighting and click-to-open actions

- [ ] **Step 1: Build `AdminScheduleTimeline.tsx`**

Component props:
```typescript
interface AdminScheduleTimelineProps {
  bookings: AdminBooking[];
  mode: 'day' | 'week';
  selectedDate: Date;
  onDateChange: (d: Date) => void;
  onBookingClick: (b: AdminBooking) => void;
}
```
Features:
- Time column from 08:00 to 20:00.
- Columns for days of the week (or single day).
- Booking blocks positioned by `startTime` and `endTime` with color tokens:
  - Green solid for `APPROVED`
  - Amber dashed border for `PENDING`
  - Flashing badge if multiple pending items collide on the same slot.
- Click triggers the standard booking approval/rejection modal.

- [ ] **Step 2: Build `AdminMonthCalendar.tsx`**

Calendar grid showing whole month with badges of pending/approved counts per day, clickable to filter table or inspect that day.

- [ ] **Step 3: Integrate View Switcher in Desktop and Mobile Admin Dashboards**

Add segmented view switcher pills in header:
- `[ 📋 รายการตาราง | 🕒 ไทม์ไลน์รายสัปดาห์ | 📅 ปฏิทินรายเดือน ]`
- Smooth conditional rendering of the chosen view without loss of search/filter state.

- [ ] **Step 4: Verify build and component rendering**

Run: `bun run build` (or `bun x next build --no-lint`)
Expected: Successful compile.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AdminScheduleTimeline.tsx src/components/admin/AdminMonthCalendar.tsx src/app/admin/dashboard/page.tsx src/app/m/admin/dashboard/page.tsx
git commit -m "feat(admin): add switchable day/week timeline and month calendar view"
```

---

### Task 5: Per-Person Customizable Dashboard UI & Customizer Modal

**Files:**
- Create: `src/components/admin/DashboardCustomizerModal.tsx`
- Modify: `src/app/admin/dashboard/page.tsx`
- Modify: `src/app/m/admin/dashboard/page.tsx`
- Modify: `src/app/api/auth/me/route.ts`

**Interfaces:**
- Consumes: `GET /api/users/preferences`, `PATCH /api/users/preferences`
- Produces: User dashboard personalization modal and dynamic widget rendering

- [ ] **Step 1: Build `DashboardCustomizerModal.tsx`**

Modal UI containing:
- Metric Widget selector checkboxes (Pending Count, Today's Bookings, 48h Urgent Attention, Weekly Total).
- Default landing view picker (`TABLE`, `TIMELINE`, `MONTH`).
- Default status filter picker (`ALL`, `PENDING`, `TODAY`).
- Table density toggle (`Normal` vs `Compact`).
- Table column toggles (`Department`, `Student ID`, `Reason`, `Approved By`).
- "บันทึกการตั้งค่า" button calling `PATCH /api/users/preferences`.

- [ ] **Step 2: Hook user preferences into Desktop and Mobile Dashboards**

- In `src/app/api/auth/me/route.ts`, return `user.preferences` with user session data.
- In `src/app/admin/dashboard/page.tsx` and `src/app/m/admin/dashboard/page.tsx`:
  - Initialize dashboard state (`currentView`, `statusFilter`, `visibleColumns`, `visibleWidgets`, `tableDensity`) from loaded user preferences.
  - Render a "ปรับแต่งแดชบอร์ด (Customize)" button in dashboard header with a Settings icon.
  - Dynamically render metric cards and table columns based on `preferences`.

- [ ] **Step 3: Verify and test end-to-end responsiveness**

Verify on desktop and mobile viewport widths.
Run: `bun test`

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/DashboardCustomizerModal.tsx src/app/admin/dashboard/page.tsx src/app/m/admin/dashboard/page.tsx src/app/api/auth/me/route.ts
git commit -m "feat(admin): add per-admin customizable dashboard preferences"
```

---

### Task 6: Changelog Update & Final Verification

**Files:**
- Modify: `src/data/updates.json`
- Test: All tests across the test suite

**Interfaces:**
- Consumes: Version `v1.7.0` release data
- Produces: Updated changelog rendered in Admin Changelog page

- [ ] **Step 1: Update `src/data/updates.json` with v1.7.0 release notes**

Document all 4 QoL features in Thai with category tags (`feat`, `improve`, `ui`).

- [ ] **Step 2: Run full test suite and build check**

Run: `bun test`
Run: `bun run build`
Expected: 0 errors, all tests passing.

- [ ] **Step 3: Commit**

```bash
git add src/data/updates.json
git commit -m "docs(changelog): document v1.7.0 QoL features release"
```
