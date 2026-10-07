# NoSQL (MongoDB) Showcase Branch

This branch (`feat/nosql-showcase`) demonstrates the KMUTNB Meeting Room Reservation System running on a **NoSQL document database (MongoDB)** instead of the default relational SQL database (PostgreSQL).

It serves as an architectural showcase comparing relational vs document store data modeling while keeping the business logic and Next.js frontend completely intact.

---

## 📊 SQL vs. NoSQL Comparison

| Dimension | `main` Branch (SQL) | `feat/nosql-showcase` (NoSQL) |
|---|---|---|
| **Database Engine** | PostgreSQL 16 (Relational) | MongoDB 7.0 (Document Store) |
| **Data Structure** | Relational Tables & Rows | Document Collections & BSON Documents |
| **Primary Keys** | CUID strings (`@id @default(cuid())`) | MongoDB ObjectIds (`@id @default(auto()) @map("_id") @db.ObjectId`) |
| **Foreign Keys / Relations** | Relational Foreign Key Constraints (`fields: [approvedById], references: [id]`) | Document References using BSON ObjectId (`@db.ObjectId`) |
| **Schema Migration Tool** | `prisma migrate` or `prisma db push` | `prisma db push` (Indexes & Collections synced) |
| **Transactions Support** | ACID transactions via PostgreSQL engine | Distributed ACID transactions via MongoDB Replica Set (`rs0`) |

---

## 🛠️ Schema Architecture Changes

In `prisma/schema.prisma`:

### 1. Datasource Provider
```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}
```

### 2. Document Models & ObjectIds
All models now map their primary key to MongoDB's internal `_id` field:
```prisma
model User {
  id               String      @id @default(auto()) @map("_id") @db.ObjectId
  email            String      @unique
  passwordHash     String
  fullName         String
  role             Role        @default(ADMIN)
  isActive         Boolean     @default(true)
  googleId         String?     @unique
  googleEmail      String?
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  approvedBookings Booking[]   @relation("ApprovedBy")
  auditLogs        AuditLog[]
}

model Booking {
  id              String        @id @default(auto()) @map("_id") @db.ObjectId
  bookingCode     String        @unique
  date            String
  startTime       String
  endTime         String
  fullName        String
  studentId       String
  email           String
  phone           String
  department      String
  reason          String
  status          BookingStatus @default(PENDING)
  rejectionReason String?
  approvedById    String?       @db.ObjectId
  approvedBy      User?         @relation("ApprovedBy", fields: [approvedById], references: [id])
  approvedAt      DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  auditLogs       AuditLog[]

  @@index([date])
  @@index([status])
  @@index([studentId])
}

model AuditLog {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  action     String
  details    String
  actorName  String
  actorEmail String?
  actorRole  String?
  ipAddress  String?
  bookingId  String?  @db.ObjectId
  booking    Booking? @relation(fields: [bookingId], references: [id], onDelete: SetNull)
  userId     String?  @db.ObjectId
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  createdAt  DateTime @default(now())

  @@index([createdAt])
  @@index([action])
}

model SiteSetting {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  key         String   @unique
  value       String
  description String?
  updatedAt   DateTime @updatedAt
}
```

---

## 🚀 Running the NoSQL Version Locally

### 1. Prerequisites
- [Bun](https://bun.sh) (v1.2+) or Node.js
- [Docker](https://www.docker.com/)

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` connects to MongoDB with replica set enabled:
```env
DATABASE_URL="mongodb://localhost:27017/reservation_db?replicaSet=rs0&directConnection=true"
```
*(Note: Prisma requires a MongoDB Replica Set even for single-node setups to support transactions).*

### 3. Start MongoDB via Docker Compose
```bash
docker compose up -d
```
This runs MongoDB 7.0 configured with a single-node replica set named `rs0`.

### 4. Push Collections and Seed Data
```bash
bunx prisma db push
bun run seed
```

### 5. Start the Application
```bash
bun run dev
```
Navigate to [http://localhost:3000](http://localhost:3000).

---

## 🔍 Verifying CRUD Operations on MongoDB

All existing CRUD flows operate seamlessly against MongoDB collections:
- **Create (C):** Bookings submitted through the student calendar write BSON documents to the `Booking` collection.
- **Read (R):** Filter queries (by date, month, and status) leverage MongoDB compound indexes (`date`, `status`, `studentId`).
- **Update (U):** Admin approval, rejection, and role assignments update documents in place.
- **Delete (D):** Admin deletion removes records and triggers audit log document creation.
