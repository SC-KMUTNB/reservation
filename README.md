# KMUTNB Student Council Meeting Room Reservation System
(ระบบจองห้องประชุมสภานักศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ)

A modern full-stack meeting room reservation web application built for the KMUTNB Student Council. Developed with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, and **MongoDB (NoSQL Showcase)**, powered by **Bun** as the runtime and package manager.

> 💡 **NoSQL Showcase Branch (`feat/nosql-showcase`):** This branch demonstrates running the entire platform on **MongoDB NoSQL** instead of relational PostgreSQL. See [NOSQL_SHOWCASE.md](./NOSQL_SHOWCASE.md) for full architectural details and comparison.

---

## 💡 System Concept & Architecture

### 1. Core Concept
The system streamlines room reservations by eliminating paper forms and manual scheduling conflicts. It provides:
- A transparent, self-service booking portal for students with instant validation.
- An administrative back-office for student council officers to evaluate, approve, or reject reservation requests.
- An immutable audit trail ensuring accountability, transparency, and university compliance.

### 2. Reservation Lifecycle Workflow
```
[Student]
   │
   ├── 1. Browse Calendar Availability (Thai Buddhist Era Calendar)
   ├── 2. Acknowledge Room Usage Regulations
   ├── 3. Submit Reservation Request (Date, Start/End Time, Reason, Info)
   │
   ▼
[Conflict Engine]
   │ Checks for overlapping approved bookings on the chosen date & time
   │
   ▼
[Booking Status: PENDING]
   │ Automatically issues unique tracking code (KMUTNB-YYYY-XXXX-XXXX)
   │
   ▼
[Admin Console]
   │ Council Officer / Super Admin reviews request
   ├── [APPROVE] ──► Status: APPROVED ──► Slot locked on calendar
   └── [REJECT]  ──► Status: REJECTED ──► Rejection reason recorded
   │
   ▼
[Audit Trail]
   │ System writes AuditLog record (Admin, Action, Timestamp, IP Address)
   │
   ▼
[Student Tracking (/track)]
   │ Student checks status in real time via Student ID or Booking Code
```

### 3. Role-Based Access Control (RBAC)
- **Public / Students:** Unauthenticated access to view schedule availability, submit reservations, and track booking statuses.
- **Admin:** Authenticated council officers who can review reservations, approve/reject requests, inspect audit trails, and export reports.
- **Super Admin:** Highest privilege level; can create and manage other admin accounts, reset passwords, suspend users, and modify dynamic site configurations (rules, contact details, social links).

---

## 🌐 Web Pages Catalog

### 👥 Public Pages (Student Portal)
| Route | Page | Description |
|---|---|---|
| `/` | **Home & Interactive Calendar** | Landing page featuring the Buddhist Era calendar, color-coded room status indicators, rules modal, contact info, and dynamic social media links. |
| `/booking` | **Direct Booking Form** | Dedicated reservation form with slot-conflict checking, auto-fill validation, department selection, and instant confirmation code display. |
| `/track` | **Status Tracking Portal** | Self-service lookup tool where applicants check reservation progress by Student ID or Booking Code (`KMUTNB-YYYY-XXXX-XXXX`), view rejection feedback, and cancel pending requests. |

### 🔒 Protected Pages (Admin Portal)
| Route | Page | Access Level | Description |
|---|---|---|---|
| `/admin/login` | **Admin Authentication** | Public | Secure login screen supporting email/password and KMUTNB Google Workspace OAuth. |
| `/admin/dashboard` | **Management Dashboard** | Admin & Super Admin | Primary management interface to filter, inspect, approve, or reject reservations with custom reason prompts. |
| `/admin/reports` | **Executive Reports** | Admin & Super Admin | Analytics overview and multi-sheet official Excel (`.xlsx`) export for university administration. |
| `/admin/logs` | **Audit Logs Trail** | Admin & Super Admin | Complete security log tracking all admin actions, approvals, rejections, IP addresses, and timestamps. Super Admins can perform log maintenance. |
| `/admin/users` | **User Management** | Super Admin Only | Account administration to create new admins, update roles, reset passwords, and toggle active/suspended statuses. |
| `/admin/settings` | **System Settings** | Super Admin Only | Live dynamic site configuration editor for social media links, complaint form Google Form URL, contact details, and room rules. |
| `/admin/profile` | **Admin Profile** | Admin & Super Admin | Personal profile management to change display names, update passwords, and link/unlink `@email.kmutnb.ac.th` Google accounts. |

---

## 📂 Directory Structure

```text
reservation/
├── prisma/
│   ├── schema.prisma               # Prisma data schema & MongoDB models definition
│   └── seed.ts                     # Database seeder (default super admin & site settings)
├── src/
│   ├── app/                        # Next.js App Router (Pages, Layouts & Endpoints)
│   │   ├── (public)/
│   │   │   ├── page.tsx            # Landing page with Buddhist Era calendar
│   │   │   ├── booking/page.tsx    # Dedicated room booking form
│   │   │   └── track/page.tsx      # Student reservation tracking portal
│   │   ├── admin/                  # Protected administrator interface
│   │   │   ├── dashboard/page.tsx  # Booking approval & management dashboard
│   │   │   ├── login/page.tsx      # Admin authentication page
│   │   │   ├── logs/page.tsx       # System audit trail viewer
│   │   │   ├── profile/page.tsx    # Account settings & Google OAuth linking
│   │   │   ├── reports/page.tsx    # Summary reports & Excel exporter
│   │   │   ├── settings/page.tsx   # Dynamic site & social settings manager
│   │   │   ├── users/page.tsx      # Admin user management (RBAC)
│   │   │   └── layout.tsx          # Admin layout shell with sidebar navigation
│   │   ├── api/                    # RESTful Next.js Route Handlers
│   │   │   ├── auth/               # Login, logout, session verification, OAuth
│   │   │   ├── bookings/           # Booking CRUD, conflict checking, tracking
│   │   │   ├── logs/               # Audit log querying and clearing
│   │   │   ├── reports/            # Excel report generation endpoint
│   │   │   ├── settings/           # Dynamic site settings read/write
│   │   │   └── users/              # Admin account creation & management
│   │   ├── globals.css             # Tailwind CSS styles & design tokens
│   │   └── layout.tsx              # Root HTML layout with university meta branding
│   └── lib/                        # Core backend utilities & application libraries
│       ├── audit.ts                # Immutable audit log recording service
│       ├── auth.ts                 # JWT session signing, cookie verification, auth guard
│       └── prisma.ts               # Singleton Prisma Client connection instance
├── docker-compose.yml              # Local container orchestrator (MongoDB Replica Set)
├── .env.example                    # Environment variable template
├── package.json                    # Project dependencies and script runner definitions
├── tsconfig.json                   # TypeScript configuration
├── NOSQL_SHOWCASE.md               # Dedicated NoSQL (MongoDB) architectural documentation
└── README.md                       # Main project documentation
```

---

## ✨ Key Features

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

## 🔑 Admin Initialization & Security

- **Initial Accounts Created by Seed (`bun run seed`):**
  - **Super Admin:** `admin@kmutnb.ac.th`
  - **Staff Admin:** `staff@kmutnb.ac.th`
  - **Password:** Configured via `INITIAL_ADMIN_PASSWORD` in your `.env` (defaults to `ChangeMeImmediately123!` if unset in dev).

> ⚠️ **Security Notice:** Change default admin passwords immediately via the Admin Settings/Users panel after initial setup. Always supply a unique, high-entropy `JWT_SECRET` in `.env` before production deployment.

---

## 🚀 Local Development (with Bun)

### 1. Prerequisites
Ensure [Bun](https://bun.sh) (v1.2+) and [Docker](https://www.docker.com/) are installed.

### 2. Start MongoDB Container (Replica Set)
```bash
docker compose up -d
```

### 3. Install Dependencies & Setup Environment
```bash
bun install
cp .env.example .env
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

## 🔐 Google OAuth Setup (Optional)

Admin users can link their Google accounts for one-click login. Only `@email.kmutnb.ac.th` Google accounts are accepted.

### 1. Create OAuth Credentials in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Navigate to **APIs & Services → Credentials**.
4. Click **Create Credentials → OAuth 2.0 Client ID**.
5. Set **Application type** to **Web application**.
6. Add **Authorized redirect URIs**:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`
7. Copy the **Client ID** and **Client Secret**.

### 2. Configure Environment Variables

Add to your `.env`:
```env
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. Admin Linking Flow

1. Super Admin creates an admin account via `/admin/users`.
2. The admin logs in with email/password, goes to **โปรไฟล์ของฉัน** (`/admin/profile`).
3. Clicks **"เชื่อมบัญชี Google"** and authorizes with their `@email.kmutnb.ac.th` Google account.
4. After linking, the admin can use the **"เข้าสู่ระบบด้วย Google"** button on the login page.

---

## ☁️ Deploying to Vercel

1. **Push your code to GitHub / GitLab**.
2. **Import project into Vercel**.
3. **Configure Environment Variables** in Vercel project settings:
   - `DATABASE_URL`: Your MongoDB connection string (e.g., MongoDB Atlas).
   - `JWT_SECRET`: A secure random string for JWT session encryption.
   - `NEXT_PUBLIC_APP_URL`: Your production domain (e.g. `https://your-domain.vercel.app`).
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` *(optional)*: For Google OAuth admin login.
4. **Build Command**:
   - Vercel will automatically run `prisma generate && next build` defined in `package.json`.
5. **Run Database Schema & Seed**:
   Run `bunx prisma db push` and `bun run seed` using your remote connection string.
