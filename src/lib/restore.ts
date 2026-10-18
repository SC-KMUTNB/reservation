import { prisma } from './prisma';
import type { BackupData } from './backup';

export type RestoreMode = 'merge' | 'replace';

export interface RestoreResult {
  mode: RestoreMode;
  restoredBookings: number;
  restoredSettings: number;
  restoredAuditLogs: number;
  timestamp: string;
}

/**
 * Validates whether parsed object matches valid BackupData structure
 */
export function validateBackupPayload(data: any): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  if (!data.metadata || typeof data.metadata !== 'object') return false;
  if (!Array.isArray(data.bookings)) return false;
  return true;
}

/**
 * Restores database from a BackupData snapshot
 */
export async function restoreDatabase(
  backup: BackupData,
  mode: RestoreMode = 'merge'
): Promise<RestoreResult> {
  if (!validateBackupPayload(backup)) {
    throw new Error('โครงสร้างไฟล์สำรองข้อมูลไม่ถูกต้อง (Invalid backup JSON structure)');
  }

  const { bookings = [], settings = [], auditLogs = [] } = backup;

  let restoredBookings = 0;
  let restoredSettings = 0;
  let restoredAuditLogs = 0;

  if (mode === 'replace') {
    // Transactional wipe and batch insert
    await prisma.$transaction(async (tx) => {
      // 1. Delete dependent data first
      await tx.auditLog.deleteMany();
      await tx.booking.deleteMany();
      await tx.siteSetting.deleteMany();

      // 2. Insert Settings
      if (settings.length > 0) {
        for (const s of settings) {
          await tx.siteSetting.create({
            data: {
              key: s.key,
              value: s.value,
              description: s.description || null,
            },
          });
          restoredSettings++;
        }
      }

      // 3. Insert Bookings
      if (bookings.length > 0) {
        for (const b of bookings) {
          await tx.booking.create({
            data: {
              bookingCode: b.bookingCode,
              date: b.date,
              startTime: b.startTime,
              endTime: b.endTime,
              fullName: b.fullName,
              studentId: b.studentId || '-',
              email: b.email,
              phone: b.phone,
              department: b.department,
              reason: b.reason,
              status: b.status || 'PENDING',
              rejectionReason: b.rejectionReason || null,
              approvedAt: b.approvedAt ? new Date(b.approvedAt) : null,
              checkedInAt: b.checkedInAt ? new Date(b.checkedInAt) : null,
              checkedInByName: b.checkedInByName || null,
              createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
            },
          });
          restoredBookings++;
        }
      }

      // 4. Insert Audit Logs (if any)
      if (auditLogs.length > 0) {
        for (const l of auditLogs) {
          await tx.auditLog.create({
            data: {
              action: l.action,
              details: l.details,
              actorName: l.actorName || 'System Restore',
              actorEmail: l.actorEmail || null,
              actorRole: l.actorRole || null,
              ipAddress: l.ipAddress || null,
              createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
            },
          });
          restoredAuditLogs++;
        }
      }
    });
  } else {
    // Mode: 'merge' (Upsert records)
    // 1. Merge Settings
    for (const s of settings) {
      await prisma.siteSetting.upsert({
        where: { key: s.key },
        create: {
          key: s.key,
          value: s.value,
          description: s.description || null,
        },
        update: {
          value: s.value,
          description: s.description || null,
        },
      });
      restoredSettings++;
    }

    // 2. Merge Bookings by bookingCode
    for (const b of bookings) {
      await prisma.booking.upsert({
        where: { bookingCode: b.bookingCode },
        create: {
          bookingCode: b.bookingCode,
          date: b.date,
          startTime: b.startTime,
          endTime: b.endTime,
          fullName: b.fullName,
          studentId: b.studentId || '-',
          email: b.email,
          phone: b.phone,
          department: b.department,
          reason: b.reason,
          status: b.status || 'PENDING',
          rejectionReason: b.rejectionReason || null,
          approvedAt: b.approvedAt ? new Date(b.approvedAt) : null,
          checkedInAt: b.checkedInAt ? new Date(b.checkedInAt) : null,
          checkedInByName: b.checkedInByName || null,
          createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
        },
        update: {
          date: b.date,
          startTime: b.startTime,
          endTime: b.endTime,
          fullName: b.fullName,
          studentId: b.studentId || '-',
          email: b.email,
          phone: b.phone,
          department: b.department,
          reason: b.reason,
          status: b.status || 'PENDING',
          rejectionReason: b.rejectionReason || null,
          approvedAt: b.approvedAt ? new Date(b.approvedAt) : null,
          checkedInAt: b.checkedInAt ? new Date(b.checkedInAt) : null,
          checkedInByName: b.checkedInByName || null,
        },
      });
      restoredBookings++;
    }

    // 3. Insert Missing Audit Logs
    if (auditLogs.length > 0) {
      for (const l of auditLogs.slice(0, 1000)) {
        await prisma.auditLog.create({
          data: {
            action: l.action,
            details: l.details,
            actorName: l.actorName || 'System Restore',
            actorEmail: l.actorEmail || null,
            actorRole: l.actorRole || null,
            ipAddress: l.ipAddress || null,
            createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
          },
        });
        restoredAuditLogs++;
      }
    }
  }

  return {
    mode,
    restoredBookings,
    restoredSettings,
    restoredAuditLogs,
    timestamp: new Date().toISOString(),
  };
}
