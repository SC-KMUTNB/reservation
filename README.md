# KMUTNB Student Council Meeting Room Reservation System
(ระบบจองห้องประชุมสภานักศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ)

A full-stack meeting room reservation web application recreated from the original HTML mockup, built with **Next.js 14+ (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, and **PostgreSQL**, powered by **Bun** as runtime and package manager, ready for instant deployment on **Vercel**.

---

## Key Features

1. **Interactive Meeting Room Calendar & Booking:**
   - Buddhist Era (พ.ศ.) Thai calendar with live color-coded status dots (รออนุมัติ - สีเหลือง, อนุมัติแล้ว - สีเขียว, ถูกปฏิเสธ - สีแดง).
   - Start Time & End Time picker with automatic conflict validation against approved bookings.
   - Interactive rules modal enforcing regulation acknowledgment before submission.
   - Generates unique tracking codes (e.g. `KMUTNB-2026-0004-9731`).

2. **Student Status Tracking (`/track`):**
   - Students can check booking status anytime using their Student ID or Booking Code.
   - Shows approval status, rejection reason (if rejected), and usage details.

3. **Multi-User Admin System & RBAC (`/admin`):**
   - **Super Admin**: Can manage admin user accounts (add, update, reset passwords, suspend), edit live social media links, complaint form URL, and room rules.
   - **Admin**: Review, approve, or reject student bookings (with custom rejection reasons), view audit logs, and export executive reports.
   - Secure authentication with bcrypt password hashing and HTTP-only JWT session cookies.

4. **Executive Excel Export (`/admin/reports`):**
   - Official multi-sheet Excel spreadsheet (`.xlsx`) generated with ExcelJS for university administrators:
     - **Sheet 1 (รายงานการจองห้องประชุม)**: Complete booking details, applicant info, purpose, status, and approving admin name with timestamp.
     - **Sheet 2 (บันทึกการตรวจสอบ / Audit Logs)**: Transparent timestamped activity trail tracking who approved/rejected/created actions and IP addresses.
   - Filterable by custom date range, current month, last month, or status.

5. **Dynamic Socials & Site Settings (`/admin/settings`):**
   - Super Admins can dynamically update Facebook, Instagram, and TikTok links/handles, complaint Google Form URL, contact phone/email, and rules text without code deployments.

---

## Admin Initialization & Security

- **Initial Accounts Created by Seed (`bun run seed`):**
  - **Super Admin:** `admin@kmutnb.ac.th`
  - **Staff Admin:** `staff@kmutnb.ac.th`
  - **Password:** Configured via `INITIAL_ADMIN_PASSWORD` in your `.env` (defaults to `ChangeMeImmediately123!` if unset in dev).

> ⚠️ **Security Notice:** Change default admin passwords immediately via the Admin Settings/Users panel after initial setup. Always supply a unique, high-entropy `JWT_SECRET` in `.env` before production deployment.

---

## Local Development (with Bun)

### 1. Prerequisites
Ensure [Bun](https://bun.sh) (v1.2+) and [Docker](https://www.docker.com/) are installed.

### 2. Start PostgreSQL Container
```bash
docker compose up -d
```

### 3. Install Dependencies
```bash
bun install
```

### 4. Push Database Schema & Seed Data
```bash
bunx prisma db push
bun run seed
```

### 5. Start Development Server
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deploying to Vercel

1. **Push your code to GitHub / GitLab**.
2. **Import project into Vercel**.
3. **Configure Environment Variables** in Vercel project settings:
   - `DATABASE_URL`: Your cloud PostgreSQL connection string (Neon, Supabase, or Vercel Postgres).
   - `JWT_SECRET`: A secure random string for JWT session encryption.
   - `NEXT_PUBLIC_APP_URL`: Your production domain (e.g. `https://your-domain.vercel.app`).
4. **Build Command**:
   - Vercel will automatically run `prisma generate && next build` defined in `package.json`.
5. **Run Database Migrations / Seed**:
   Run `bunx prisma db push` and `bun run seed` using your remote connection string.
