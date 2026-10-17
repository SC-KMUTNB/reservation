# KMUTNB Reservation System — Agent & Developer Guide

> **Important**: This guide is the single source of truth for AI agents (and human developers) working on the KMUTNB Meeting Room Reservation System. Read this document before making architectural changes or shipping releases.

---

## 1. System Overview & Technology Stack

The KMUTNB Meeting Room Reservation System (ระบบจองห้องประชุมสภานักศึกษา มจพ.) is a production-grade full-stack web application designed for university students and administrators.

### Core Technologies
- **Framework:** SvelteKit 2+ / Vite 8+
- **UI Library:** Svelte 5 (Runes), Lucide Svelte icons
- **Styling:** Tailwind CSS v4 (Vite plugin `@tailwindcss/vite`)
- **Runtime & Package Manager:** [Bun](https://bun.sh) (v1.2+)
- **ORM & Database:** Prisma ORM 6.4+ with PostgreSQL
- **Authentication:** HTTP-only JWT sessions signed via `jose`, bcrypt password hashing, optional Google OAuth 2.0
- **Security:** SvelteKit hooks (`hooks.server.ts`), sliding-window in-memory IP rate limiter

---

## 2. Directory Structure & Key Modules

```
├── .github/workflows/ci.yml       # Automated GitHub Actions CI
├── docs/                          # Architecture guides & specifications
├── prisma/schema.prisma           # Prisma database schema & composite indexes
├── scripts/                       # Maintenance, migration & release scripts
│   ├── create-release.ts          # GitHub Release CLI publisher
│   ├── ensure-db-schema.ts        # Database schema validator
│   └── test-db.ts                 # Database integration tester
├── src/
│   ├── app/
│   │   ├── (public)/              # Public user routes: booking, tracking, status
│   │   │   ├── booking/           # Public room booking with availability heatmap
│   │   │   └── track/             # Student booking tracker & self-service cancellation
│   │   ├── admin/                 # Desktop Admin panel
│   │   │   ├── changelog/         # Dynamic changelog synced with GitHub Releases
│   │   │   ├── dashboard/         # Multi-view (Table/Timeline/Calendar) + Batch Actions
│   │   │   ├── reports/           # Executive multi-sheet Excel export (.xlsx)
│   │   │   ├── settings/          # Dynamic facility & site configuration
│   │   │   └── users/             # RBAC admin management & invite flow
│   │   ├── m/                     # Mobile-optimized application suite (/m/*)
│   │   └── api/                   # Next.js Server Route Handlers
│   │       ├── changelog/         # GitHub Releases fetcher with ISR caching
│   │       └── ...
│   ├── lib/
│   │   ├── changelog.ts           # SemVer classification & release markdown parser
│   │   ├── date-utils.ts          # Thai BE (พ.ศ.) date/time & timezone utilities
│   │   ├── facility-config.ts     # Room config, operational slots, equipment list
│   │   └── rate-limit.ts          # Sliding-window IP rate limiter
│   └── middleware.ts              # Edge JWT authentication & route protector
└── tests/                         # Bun test suite (Unit & Integration tests)
```

---

## 3. GitHub-First Release & Changelog Protocol

The system employs a **GitHub-first changelog architecture**. No static JSON/changelog files are bundled in the client application, avoiding file bloat.

### 3.1 Architecture Overview
1. The admin UI (`/admin/changelog` and `/m/admin/changelog`) calls `GET /api/changelog`.
2. The endpoint queries `https://api.github.com/repos/SC-KMUTNB/reservation/releases`.
3. The server caches results for **1 hour** (`revalidate: 3600`) with in-memory persistence.
4. Admins can click **"รีเฟรชข้อมูล" (Force Refresh)** which issues `GET /api/changelog?force=true` to bust the cache immediately.

### 3.2 Semantic Versioning (SemVer) Rules
Releases must strictly adhere to Semantic Versioning:

| Tier | Format | Description & Criteria |
| :--- | :--- | :--- |
| **Major** | `vX.0.0` (e.g. `v1.0.0`, `v2.0.0`) | Breaking changes, complete architectural redesigns, major milestones. |
| **Minor** | `v1.X.0` (e.g. `v1.8.0`, `v1.9.0`) | New features, significant capabilities added in a backward-compatible manner. |
| **Patch** | `v1.X.Y` ($Y > 0$, e.g. `v1.0.1`, `v1.6.1`) | Bug fixes, security patches, small UI adjustments, and performance hotfixes. |

### 3.3 Markdown Section Headings for Release Notes
The parser (`src/lib/changelog.ts`) scans the release body for conventional headings or tag prefixes to render category badges:

- **Summary Paragraph:** Any introductory text placed before the first heading is parsed as the release summary.
- **Section Headings:**
  - `### ✨ ฟีเจอร์ใหม่ (Features)` or `### Features` $\rightarrow$ `feat` badge (Emerald)
  - `### 🐛 แก้ไขข้อผิดพลาด (Bug Fixes)` or `### Bug Fixes` $\rightarrow$ `fix` badge (Rose)
  - `### ⚡ ปรับปรุงระบบ (Improvements)` or `### Improvements` $\rightarrow$ `improve` badge (Blue)
  - `### 🛡️ ความปลอดภัย (Security)` or `### Security` $\rightarrow$ `security` badge (Purple)
- **Bullet Items:** Use standard `- ` or `* ` bullet points for individual changes.

### 3.4 Shipping a New Release (Agent SOP)

When an agent or developer finishes a task that warrants a new release:

```bash
# Step 1: Run complete verification gates (MANDATORY)
bun test
bun run typecheck
bun run lint

# Step 2: Commit and push changes to git
git add .
git commit -m "feat(scope): your descriptive conventional commit"
git push origin main

# Step 3: Publish release to GitHub
# Option A: Using the CLI release helper
bun run release --tag=v1.10.0 --title="Feature Title" --summary="Release summary" --category=feat --desc="Added feature X"

# Option B: Using GitHub CLI directly with a markdown notes file
gh release create v1.10.0 --title "v1.10.0: Feature Title" --notes-file ./release-notes.md --target main
```

---

## 4. Quality & Verification Gates

Before submitting any code changes or completing any turn:

1. **Unit & Integration Tests:**
   ```bash
   bun test
   ```
   *All tests must pass.*

2. **TypeScript Typecheck:**
   ```bash
   bun run typecheck
   ```
   *Must exit with 0 errors (`tsc --noEmit`).*

3. **ESLint Code Style:**
   ```bash
   bun run lint
   ```
   *Must exit with 0 warnings/errors.*

4. **Production Build Verification (for major feature changes):**
   ```bash
   bun run build
   ```
   *Verifies Prisma generation and Next.js Turbopack compilation.*

---

## 5. Security & Development Guidelines

- **Sensitive Data:** Never hardcode secrets, API keys, or JWT tokens. Always read from `process.env`.
- **Database Updates:** When changing `prisma/schema.prisma`, execute `bunx prisma db push` followed by `bun run db:ensure`.
- **Timezone Safety:** All user-facing dates should follow Buddhist Era (พ.ศ.) formatting using helpers from `src/lib/date-utils.ts`.
- **Responsive Architecture:** Maintain parity between desktop routes (`/admin/*`, `/booking`) and mobile routes (`/m/admin/*`, `/m/booking`).
