# KMUTNB Student Council Meeting Room Reservation System
*(ระบบจองห้องประชุมสภานักศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ)*

🌐 **Language / ภาษา:** **English** | [🇹🇭 ภาษาไทย](./TH/README.md)

[![Next.js](https://img.shields.io/badge/Next.js-16.3.7-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.2+-fbf0df?style=flat&logo=bun)](https://bun.sh/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4+-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Private-orange.svg)]()

A modern, production-ready full-stack meeting room reservation web application built for the KMUTNB Student Council. Powered by **Next.js 16 (App Router with Turbopack)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **Prisma ORM**, and **PostgreSQL**, with **Bun** as runtime and package manager.

---

## 🚀 Key Features

### 1. Interactive Booking Calendar & Availability Heatmap (`/booking`)
- **Buddhist Era (พ.ศ.) Thai Calendar:** Live color-coded dots showing booking density (Pending - Yellow, Approved - Green, Rejected - Red).
- **Public Availability Heatmap:** Real-time calculation of remaining operational hours (08:00 - 20:00) with color bars (*Available all day*, *X hrs free*, *Fully booked*).
- **Dual-Mode Time Selection:** Reserve rooms using Start/End dropdowns or 2-click interactive slot range selection.
- **Smart Conflict Prevention:** Automatically prevents double bookings and restricts valid end times dynamically.
- **Opt-in Profile Memory:** Saves applicant information in `localStorage` for faster subsequent bookings.
- **Rules Modal:** Requires applicants to review and acknowledge official regulations before booking.
- **Unique Tracking Code:** Generates standardized tracking codes (e.g., `KMUTNB-2026-0004-9731`).

### 2. Student Self-Service & Tracking (`/track`)
- **Instant Status Lookup:** Query booking status using Student ID or Tracking Code.
- **Self-Service Cancellation:** Students can cancel bookings independently by verifying the last 4 digits of their phone number.
- **1-Click Calendar Export:** Add reservations to Google Calendar directly or download standard RFC 5545 `.ics` files.
- **QR Code Check-in:** Check in at the venue by scanning the room's QR code.

### 3. Advanced Admin Dashboard & Management (`/admin`)
- **Switchable Views:** Seamlessly toggle between:
  - **Table View:** Dense, searchable, and sortable list with expandable drawer details.
  - **Visual Timeline (08:00 - 20:00):** Non-overlapping visual schedule lane display with a live time indicator.
  - **Month Calendar:** Full-month schedule overview.
- **Bulk Batch Actions:** Select multiple bookings via checkboxes to approve or reject them simultaneously, complete with automated conflict detection.
- **Personalized Dashboard:** Admins can customize visible stat cards, default views, row densities, and column visibility, persisted to their user profile in the database.
- **Multi-Tier RBAC:**
  - **Super Admin:** Full control over admin accounts, invitation links, system settings, webhooks, and rules.
  - **Staff Admin:** Review, approve, and reject bookings, view audit logs, and export reports.
- **Username Claiming:** Admins can claim a short username to log in without typing their full email address.
- **Invitation Flow:** Super Admins can invite new admins via email tokens to securely set up their passwords (`/admin/setup-password`).

### 4. Dynamic GitHub Releases Changelog (`/admin/changelog`)
- **Dynamic Fetching:** Changelog data is fetched live from GitHub Releases API (`SC-KMUTNB/reservation`) with server-side ISR caching (1 hour) to keep the client bundle lightweight.
- **Strict SemVer Classification:** Releases are categorized into **Major** (`vX.0.0`), **Minor** (`v1.X.0`), and **Patch** (`v1.X.Y`).
- **Markdown Parser & Badges:** Automatically maps release notes into structured badges (✨ Features, 🐛 Bug Fixes, ⚡ Improvements, 🛡️ Security).
- **Admin Force Refresh:** Includes a manual refresh button to bypass cache immediately after publishing.

### 5. Notifications & Integrations
- **Google SMTP Email Service:** Sends automated notification emails (booking receipts, approvals, rejections, and admin invites) with `.ics` calendar attachments via Nodemailer.
- **Real-Time Webhooks:** Instant event notifications to **Discord** and **LINE Messaging API** with live test ping capability in settings.
- **Google OAuth 2.0:** Optional one-click login for `@email.kmutnb.ac.th` Google accounts.

### 6. Executive Excel Reports (`/admin/reports`)
- Multi-sheet `.xlsx` workbook generated via ExcelJS:
  - **Sheet 1 (Meeting Room Bookings):** Full applicant details, purpose, status, and approval audit timestamps.
  - **Sheet 2 (Audit Trail):** Security audit log tracking IP addresses, actions, and administrative changes.
- Quick filters: Custom date range, Current Month, Last Month, or Status.

### 7. Security Hardening
- **Edge Middleware:** Protected `/admin/*` and `/m/admin/*` routes verified via JOSE JWT.
- **IP Rate Limiting:** Sliding-window in-memory rate limiter protecting public endpoints against abuse.
- **Timezone Validation:** Enforces strict timezone-aware validation preventing backdated bookings.
- **Password Hashing:** Industry-standard bcrypt hashing for all credentials.

### 8. Dedicated Mobile Suite (`/m/*`)
- Fully optimized responsive mobile views for public booking (`/m/booking`), tracking (`/m/track`), and admin dashboard (`/m/admin/*`).

---

## 💻 Tech Stack & Architecture

- **Runtime & Package Manager:** [Bun](https://bun.sh) (v1.2+)
- **Framework:** Next.js 16.3.7 (App Router with Turbopack)
- **Database:** PostgreSQL (via Prisma ORM 6.4+)
- **Styling:** Tailwind CSS v4 & Lucide React
- **Authentication:** JOSE JWT (HTTP-only cookies) & Bcrypt
- **Reports:** ExcelJS
- **Email:** Nodemailer with Google SMTP

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- [Bun](https://bun.sh) (v1.2+) installed
- [Docker](https://www.docker.com/) installed (for local PostgreSQL container)
- [GitHub CLI (`gh`)](https://cli.github.com/) *(optional, for publishing releases)*

### 2. Start PostgreSQL Container
```bash
docker compose up -d
```

### 3. Install Dependencies
```bash
bun install
```

### 4. Setup Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL`, `JWT_SECRET`, and `ENCRYPTION_SECRET` are populated.

### 5. Initialize Database & Seed Admin
```bash
bunx prisma db push
bun run seed
```

Default credentials created:
- **Super Admin:** `admin@kmutnb.ac.th`
- **Staff Admin:** `staff@kmutnb.ac.th`
- **Password:** Configured via `INITIAL_ADMIN_PASSWORD` (defaults to `ChangeMeImmediately123!`)

### 6. Run Development Server
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Project Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| **Development** | `bun run dev` | Starts local Next.js dev server with Turbopack |
| **Production Build** | `bun run build` | Generates Prisma client and builds Next.js application |
| **Start Server** | `bun run start` | Starts Next.js production server |
| **Run Tests** | `bun test` | Runs the Bun unit & integration test suite |
| **Typecheck** | `bun run typecheck` | Checks TypeScript compilation (`tsc --noEmit`) |
| **Lint** | `bun run lint` | Runs ESLint |
| **Seed Database** | `bun run seed` | Seeds default admin accounts and site configuration |
| **Schema Validation**| `bun run db:ensure` | Ensures required columns exist in Postgres |
| **Create Release** | `bun run release` | Publishes a structured release to GitHub via `gh` CLI |

---

## 🔑 Environment Variables Reference

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/reservation` |
| `JWT_SECRET` | **Yes** | Secret string for signing admin session tokens | `your-high-entropy-secret-key` |
| `ENCRYPTION_SECRET` | **Yes** | 32+ character key for encrypting webhooks/tokens | `random-32-char-encryption-key` |
| `INITIAL_ADMIN_PASSWORD`| No | Default password for seeded admin accounts | `ChangeMeImmediately123!` |
| `SMTP_USER` | No | Google Workspace SMTP email for notifications | `council@kmutnb.ac.th` |
| `SMTP_PASS` | No | Google Workspace App Password (16 characters) | `xxxx xxxx xxxx xxxx` |
| `GOOGLE_CLIENT_ID` | No | Google Cloud OAuth 2.0 Client ID | `*.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | No | Google Cloud OAuth 2.0 Client Secret | `GOCSPX-...` |
| `GITHUB_REPO` | No | Repository for changelog API (defaults to `SC-KMUTNB/reservation`) | `SC-KMUTNB/reservation` |
| `GITHUB_TOKEN` | No | GitHub PAT (optional, increases rate limit for releases API) | `ghp_...` |

---

## 🚀 Deployment to Vercel

1. Push your repository to GitHub.
2. Import the project into **Vercel**.
3. Configure the **Environment Variables** in Vercel project settings (`DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_SECRET`, etc.).
4. The build command `prisma generate && next build` will automatically run.
5. In **Admin > Settings**, configure the **Base URL** (e.g. `https://your-domain.vercel.app`) so email deep links and OAuth redirects point to your production URL.

---

## 🤖 AI Agent Guidelines
For automated AI coding agents working on this repository, please consult the single source of truth in **[`docs/AGENT_GUIDE.md`](docs/AGENT_GUIDE.md)** before modifying code or publishing releases.
