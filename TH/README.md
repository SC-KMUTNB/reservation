# ระบบจองห้องประชุม สภานักศึกษา มจพ.
*(KMUTNB Student Council Meeting Room Reservation System)*

🌐 **ภาษา / Language:** [🇬🇧 English Version](../README.md) | **🇹🇭 ภาษาไทย**

[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.0+-FF3E00?style=flat&logo=svelte)](https://svelte.dev/)
[![Svelte 5](https://img.shields.io/badge/Svelte-5.0+_(Runes)-FF3E00?style=flat&logo=svelte)](https://svelte.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0+-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.2+-fbf0df?style=flat&logo=bun)](https://bun.sh/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4+-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)

เว็บแอปพลิเคชันระบบจองห้องประชุมและสถานที่สำหรับสภานักศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (มจพ.) พัฒนาด้วยเทคโนโลยีฟูลสแต็กระดับ Production ที่เน้นความรวดเร็วและประสิทธิภาพสูง ประกอบด้วย **SvelteKit 2+**, **Svelte 5 (Runes: `$state`, `$derived`, `$effect`)**, **Vite 8**, **TypeScript**, **Tailwind CSS v4**, **Prisma ORM**, และฐานข้อมูล **PostgreSQL** โดยใช้ **Bun** เป็น Runtime และ Package Manager

---

## 🚀 ฟีเจอร์หลักของระบบ

### 1. ระบบปฏิทินจองห้องและฮีตแมปแสดงเวลาว่าง (`/booking`)
- **ปฏิทินรูปแบบปี พ.ศ. ไทย:** แสดงจุดสีบอกสถานะความหนาแน่นของการจองในแต่ละวัน (รออนุมัติ - สีเหลือง, อนุมัติแล้ว - สีเขียว, ถูกปฏิเสธ - สีแดง)
- **แถบฮีตแมปแสดงชั่วโมงว่างจริง (Availability Heatmap):** คำนวณชั่วโมงทำการที่ว่างจริง (08:00 - 20:00) แบบเรียลไทม์ พร้อมแถบสีและข้อความระบุสถานะ (*ว่างทั้งวัน*, *ว่าง X ชม.*, *เต็มทุกช่วง*)
- **การเลือกช่วงเวลาแบบ 2 ระบบ (Dual Mode):** เลือกเวลาเริ่มต้น-สิ้นสุดผ่าน Dropdown หรือคลิกเลือกช่วงบนแท่งเวลาได้โดยตรง (2-Click Range Selection)
- **ระบบป้องกันเวลาชนกันอัจฉริยะ (Smart Conflict Prevention):** ตรวจสอบและล็อกช่วงเวลาที่ทับซ้อนกับคำขอที่ได้รับอนุมัติแล้วโดยอัตโนมัติ
- **ระบบจดจำข้อมูลผู้ขอจอง (Opt-in Profile Memory):** บันทึกข้อมูลนักศึกษาลงใน `localStorage` เพื่อความสะดวกรวดเร็วในการจองครั้งถัดไป
- **หน้าต่างยอมรับกฎระเบียบ (Rules Modal):** บังคับอ่านและกดยอมรับกฎการใช้งานห้องประชุมก่อนส่งแบบฟอร์ม
- **รหัสติดตามคำขอ:** สร้างรหัสติดตามการจองที่เป็นมาตรฐาน (เช่น `KMUTNB-2026-0004-9731`)

### 2. ศูนย์บริการช่วยเหลือตนเองสำหรับนักศึกษา (`/track`)
- **ตรวจสอบสถานะได้ทันที:** ค้นหาประวัติและสถานะคำขอด้วยรหัสนักศึกษา 13 หลัก หรือรหัสติดตามคำขอ
- **ระบบยกเลิกการจองด้วยตนเอง (Self-Service Cancellation):** นักศึกษาสามารถกดยกเลิกการจองได้ด้วยตนเอง โดยยืนยันตัวตนด้วยเลขท้าย 4 หลักของเบอร์โทรศัพท์
- **ส่งออกปฏิทินในคลิกเดียว (1-Click Calendar Export):** เพิ่มรายการลงใน Google Calendar ได้ทันที หรือดาวน์โหลดไฟล์ `.ics` ตามมาตรฐาน RFC 5545
- **ระบบเช็กอินหน้าห้องด้วย QR Code:** สแกน QR Code หน้าห้องประชุมเพื่อยืนยันการเข้าใช้งานจริง

### 3. ระบบจัดการสำหรับผู้ดูแลระบบ (`/admin`)
- **สลับมุมมองได้ 3 รูปแบบ (Switchable Views):**
  - **มุมมองตาราง (Table View):** แสดงรายการอย่างละเอียด ค้นหา จัดเรียง และเปิด Drawer ดูข้อมูลเพิ่มเติมได้
  - **มุมมองไทม์ไลน์ (Visual Timeline 08:00 - 20:00):** แสดงแท่งเวลาแยกเลนไม่ทับซ้อน พร้อมเส้นบอกเวลาปัจจุบัน (Live Time Marker)
  - **มุมมองปฏิทินรายเดือน (Month Calendar):** ตรวจสอบตารางการใช้ห้องตลอดทั้งเดือน
- **จัดการคำขอทีละหลายรายการ (Bulk Batch Actions):** เลือกหลายรายการพร้อมกันด้วย Checkbox เพื่ออนุมัติหรือปฏิเสธในครั้งเดียว พร้อมระบบตรวจจับเวลาชนกันในชุดคำขอ
- **ปรับแต่งแดชบอร์ดส่วนบุคคล (Personalized Dashboard):** แอดมินแต่ละคนสามารถเลือกเปิด-ปิดการ์ดสรุปยอด, ตั้งค่ามุมมองเริ่มต้น, ปรับความหนาแน่นแถว และเลือกคอลัมน์ที่ต้องการ โดยระบบจะบันทึกลงในโปรไฟล์ผู้ใช้ในฐานข้อมูล
- **การแบ่งสิทธิ์แบบลำดับชั้น (RBAC):**
  - **Super Admin:** จัดการบัญชีแอดมิน, ส่งอีเมลคำเชิญ, กำหนดค่าระบบ, ตั้งค่า Webhook และแก้ไขกฎระเบียบ
  - **Staff Admin:** ตรวจสอบ อนุมัติ ปฏิเสธคำขอ (พร้อมระบุเหตุผล), ดู Audit Logs และส่งออกรายงาน
- **ระบบตั้งชื่อผู้ใช้ (Claim Username):** แอดมินสามารถตั้งชื่อบัญชีสั้นๆ เพื่อใช้ล็อกอินแทนการกรอกอีเมลยาว
- **ระบบส่งคำเชิญแอดมินใหม่ (Invitation Flow):** ส่งลิงก์คำเชิญผ่านอีเมลเพื่อให้แอดมินใหม่ตั้งรหัสผ่านด้วยตนเองอย่างปลอดภัย (`/admin/setup-password`)

### 4. ระบบประวัติการอัปเดตแบบไดนามิกจาก GitHub (`/admin/changelog`)
- **ดึงข้อมูลจาก GitHub Releases:** ดึงข้อมูลประวัติการพัฒนาจาก GitHub Releases (`SC-KMUTNB/reservation`) ผ่าน API พร้อมระบบแคช (1 ชั่วโมง) ลดขนาด Client Bundle ของเว็บไซต์ลงอย่างมาก
- **จัดหมวดหมู่เวอร์ชันตามมาตรฐาน SemVer:** จำแนกเวอร์ชันเป็น **Major** (`vX.0.0`), **Minor** (`v1.X.0`), และ **Patch** (`v1.X.Y`) พร้อมตัวกรองและสถิติแยกประเภท
- **ตัวแปลง Markdown เป็น Badge สี:** แปลงหัวข้อใน Release Notes เป็นป้ายหมวดหมู่สวยงาม (✨ ฟีเจอร์ใหม่, 🐛 แก้ไขข้อผิดพลาด, ⚡ ปรับปรุงระบบ, 🛡️ ความปลอดภัย)
- **ปุ่มรีเฟรชข้อมูล (Force Refresh):** สำหรับผู้ดูแลระบบเพื่อดึงข้อมูลล่าสุดจาก GitHub ทันทีหลังปล่อยเวอร์ชันใหม่

### 5. การแจ้งเตือนและการเชื่อมต่อภายนอก
- **อีเมลแจ้งเตือนอัตโนมัติ (Google SMTP):** ส่งอีเมลยืนยันการรับคำขอ, แจ้งผลการอนุมัติ/ปฏิเสธ พร้อมแนบไฟล์ปฏิทิน `.ics` ผ่าน Nodemailer
- **การแจ้งเตือนแบบเรียลไทม์ผ่าน Webhook:** แจ้งเตือนเข้าห้องแชต **Discord** และ **LINE Messaging API** ทันทีที่มีการจองใหม่ พร้อมปุ่มทดสอบส่ง Webhook ในหน้าตั้งค่า
- **เข้าสู่ระบบด้วย Google (Google OAuth 2.0):** ตัวเลือกล็อกอินในคลิกเดียวสำหรับบัญชี `@email.kmutnb.ac.th`

### 6. การส่งออกรายงานสำหรับผู้บริหาร (`/admin/reports`)
- ส่งออกไฟล์ Excel (`.xlsx`) แบบหลายชีตด้วย ExcelJS:
  - **ชีตที่ 1 (รายงานการจองห้องประชุม):** รายละเอียดผู้ขอ, วัตถุประสงค์, สถานะ และชื่อแอดมินผู้อนุมัติพร้อมเวลา
  - **ชีตที่ 2 (บันทึกการตรวจสอบ / Audit Logs):** บันทึกการกระทำของผู้ดูแลระบบ หมายเลข IP และประวัติการเปลี่ยนแปลง
- ตัวกรองรายงาน: กำหนดช่วงวันที่เอง, เดือนปัจจุบัน, เดือนที่แล้ว หรือเลือกตามสถานะ

### 7. ยกระดับความปลอดภัย (Security Hardening)
- **SvelteKit Server Hooks (`hooks.server.ts`):** ป้องกันเส้นทาง `/admin/*` และ `/m/admin/*` ด้วย JOSE JWT ตรวจสอบความถูกต้องอย่างเข้มงวด
- **ระบบจำกัดความถี่ตาม IP (Sliding-Window Rate Limiting):** ป้องกันการยิงสแปมหรือโจมตี API
- **ป้องกันการจองย้อนหลังตาม Timezone:** ตรวจสอบไม่ให้ผู้ใช้ทั่วไปจองวันที่ในอดีตหรือเวลาที่ล่วงเลยไปแล้ว
- **เข้ารหัสรหัสผ่าน:** ใช้มาตรฐานการแฮชรหัสผ่านด้วย bcrypt

### 8. สถาปัตยกรรมสำหรับอุปกรณ์มือถือโดยเฉพาะ (`/m/*`)
- หน้าเว็บที่ออกแบบและปรับแต่ง Layout ให้เหมาะสมกับสมาร์ตโฟน 100% ทั้งหน้าจอง (`/m/booking`), หน้าติดตามสถานะ (`/m/track`) และแดชบอร์ดแอดมิน (`/m/admin/*`)

---

## 💻 Tech Stack & สถาปัตยกรรมระบบ

- **Runtime & Package Manager:** [Bun](https://bun.sh) (v1.2+)
- **Framework:** SvelteKit 2+ / Vite 8+
- **Reactive UI Library:** Svelte 5 (Runes: `$state`, `$derived`, `$effect`)
- **Styling:** Tailwind CSS v4 & Lucide Svelte
- **Database:** PostgreSQL (ผ่าน Prisma ORM 6.4+)
- **Authentication:** JOSE JWT (HTTP-only cookies) & Bcrypt
- **Reports:** ExcelJS
- **Email:** Nodemailer ร่วมกับ Google SMTP

---

## 🛠️ การติดตั้งและรันในสภาพแวดล้อม Development

### 1. สิ่งที่ต้องติดตั้งล่วงหน้า
- [Bun](https://bun.sh) (v1.2 ขึ้นไป)
- [Docker](https://www.docker.com/) (สำหรับรัน PostgreSQL จำลองในเครื่อง)
- [GitHub CLI (`gh`)](https://cli.github.com/) *(ทางเลือกเสริม สำหรับคำสั่งปล่อย Release)*

### 2. เปิดใช้งาน Container ฐานข้อมูล PostgreSQL
```bash
docker compose up -d
```

### 3. ติดตั้ง Dependencies
```bash
bun install
```

### 4. ตั้งค่า Environment Variables
คัดลอกไฟล์ `.env.example` เป็น `.env`:
```bash
cp .env.example .env
```
ตรวจสอบให้แน่ใจว่าค่า `DATABASE_URL`, `JWT_SECRET`, และ `ENCRYPTION_SECRET` ถูกกำหนดเรียบร้อยแล้ว

### 5. ซิงก์โครงสร้างฐานข้อมูลและสร้างข้อมูลตั้งต้น
```bash
bunx prisma db push
bun run seed
```

บัญชีผู้ดูแลระบบเริ่มต้น:
- **Super Admin:** `admin@kmutnb.ac.th`
- **Staff Admin:** `staff@kmutnb.ac.th`
- **รหัสผ่าน:** กำหนดผ่าน `INITIAL_ADMIN_PASSWORD` (ค่าเริ่มต้น: `ChangeMeImmediately123!`)

### 6. เริ่มการทำงานของ Development Server
```bash
bun run dev
```
เปิดเบราว์เซอร์ไปที่ [http://localhost:5173](http://localhost:5173)

---

## 📦 คำสั่งสคริปต์ในโปรเจกต์ (Scripts)

| คำสั่ง | คำสั่งที่ใช้รัน | หน้าที่การทำงาน |
| :--- | :--- | :--- |
| **รันเซิร์ฟเวอร์ Dev** | `bun run dev` | เริ่มต้น Local Development Server ด้วย Vite |
| **บิลด์สำหรับ Production** | `bun run build` | สร้าง Prisma Client และคอมไพล์โปรเจกต์ SvelteKit |
| **พรีวิว Production Build** | `bun run preview` | ทดสอบรัน Production Bundle บนเครื่อง Local |
| **ซิงก์ไทป์ SvelteKit** | `bun run prepare` | สร้างไทป์ที่จำเป็นสำหรับ SvelteKit (`svelte-kit sync`) |
| **รันชุดทดสอบ (Tests)** | `bun test` | รัน Unit & Integration Tests ทั้งหมด (84 รายการ) |
| **ตรวจสอบ Typescript** | `bun run typecheck` | ซิงก์ไทป์และตรวจสอบ Type โค้ดผ่าน `svelte-check` |
| **ตรวจสอบ Linter** | `bun run lint` | ตรวจสอบคุณภาพโค้ดด้วย ESLint |
| **สร้างข้อมูลเริ่มต้น (Seed)** | `bun run seed` | สร้างบัญชีแอดมินและการตั้งค่าระบบเริ่มต้น |
| **ตรวจโครงสร้าง DB** | `bun run db:ensure` | ตรวจสอบความถูกต้องของคอลัมน์ใน Postgres |
| **ปล่อย Release สู่ GitHub** | `bun run release` | สร้างและเผยแพร่ GitHub Release ผ่าน GitHub CLI (`gh`) |

---

## 🔑 ตัวแปรสภาพแวดล้อม (Environment Variables)

| ตัวแปร | ความจำเป็น | คำอธิบาย | ตัวอย่างค่า |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **จำเป็น** | URL สำหรับเชื่อมต่อฐานข้อมูล PostgreSQL | `postgresql://user:pass@localhost:5432/reservation` |
| `JWT_SECRET` | **จำเป็น** | คีย์สำหรับเข้ารหัสและถอดรหัส Session Token | `your-high-entropy-secret-key` |
| `ENCRYPTION_SECRET` | **จำเป็น** | คีย์ 32 ตัวอักษรขึ้นไปสำหรับเข้ารหัส Webhook และ Token | `random-32-char-encryption-key` |
| `INITIAL_ADMIN_PASSWORD`| ไม่บังคับ | รหัสผ่านเริ่มต้นสำหรับบัญชีแอดมินที่สร้างจากคำสั่ง seed | `ChangeMeImmediately123!` |
| `SMTP_USER` | ไม่บังคับ | อีเมล Google Workspace SMTP สำหรับส่งการแจ้งเตือน | `council@kmutnb.ac.th` |
| `SMTP_PASS` | ไม่บังคับ | Google App Password (รหัสผ่านแอป 16 หลัก) | `xxxx xxxx xxxx xxxx` |
| `GOOGLE_CLIENT_ID` | ไม่บังคับ | Client ID จาก Google Cloud OAuth 2.0 | `*.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | ไม่บังคับ | Client Secret จาก Google Cloud OAuth 2.0 | `GOCSPX-...` |
| `GITHUB_REPO` | ไม่บังคับ | ชื่อ Repository สำหรับ API Changelog (ค่าเริ่มต้น: `SC-KMUTNB/reservation`) | `SC-KMUTNB/reservation` |
| `GITHUB_TOKEN` | ไม่บังคับ | Personal Access Token ของ GitHub (เพิ่มโควตา Rate Limit) | `ghp_...` |

---

## 🚀 การ Deploy ขึ้น Vercel

1. Push โค้ดขึ้น GitHub Repository บน branch `main`
2. Import โปรเจกต์เข้าสู่ **Vercel** (เลือก Framework Preset: **SvelteKit**)
3. กำหนด **Build Command** เป็น `bun run build` (หรือ `prisma generate && vite build`)
4. ตั้งค่า **Environment Variables** ในการตั้งค่าโปรเจกต์บน Vercel (`DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_SECRET` ฯลฯ)
5. ตรวจสอบให้แน่ใจว่า Production PostgreSQL รองรับการเชื่อมต่อจากภายนอก (`sslmode=require`)
6. หลัง Deploy เสร็จสิ้น ให้เข้าสู่ระบบแอดมินไปที่ **Admin > Settings** แล้วระบุ **Base URL สำหรับลิงก์ในอีเมล** เป็นโดเมนจริง (เช่น `https://your-domain.vercel.app`) เพื่อให้ปุ่มในอีเมลและลิงก์ OAuth ทำงานได้อย่างถูกต้อง

---

## 🤖 สำหรับ AI Agent และนักพัฒนา
สำหรับ AI Coding Agents ที่เข้ามาทำงานในโปรเจกต์นี้ กรุณาศึกษาคู่มือมาตรฐานการพัฒนาและขั้นตอนการปล่อยเวอร์ชันใน **[`docs/AGENT_GUIDE.md`](../docs/AGENT_GUIDE.md)** ก่อนแก้ไขโค้ดหรือสร้าง Release ทุกครั้ง
