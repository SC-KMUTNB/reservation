import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { prisma } from './prisma';
import { BookingStatus } from '@prisma/client';

export type MigrationMode = 'overwrite' | 'add';

export interface MigrationOptions {
  customFilePath?: string;
  mode?: MigrationMode;
}

export interface MigrationResult {
  mode: MigrationMode;
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export function parseDateCell(val: any): string {
  if (val instanceof Date) {
    let year = val.getUTCFullYear();
    if (year > 2400) {
      year -= 543; // BE to CE
    }
    const month = String(val.getUTCMonth() + 1).padStart(2, '0');
    const day = String(val.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof val === 'string' && val.trim()) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      let year = d.getFullYear();
      if (year > 2400) year -= 543;
      return `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }
  return '';
}

export function parseTimeCell(val: any, defaultTime = '00:00'): string {
  if (val instanceof Date) {
    const h = String(val.getUTCHours()).padStart(2, '0');
    const m = String(val.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
  if (typeof val === 'string' && val.trim()) {
    const match = val.match(/(\d{1,2})[:.](\d{2})/);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
  }
  return defaultTime;
}

export function extractStudentId(email: string): string {
  if (!email) return '-';
  const match = email.match(/s?(\d{10,13})/i);
  return match ? match[1] : '-';
}

/**
 * Migrate historical bookings from Excel file in sheetexample.
 * @param options.mode 'overwrite' will update existing matching records; 'add' will only insert new records and skip existing.
 */
export async function migrateSheetHistory(options?: MigrationOptions): Promise<MigrationResult> {
  const mode: MigrationMode = options?.mode === 'add' ? 'add' : 'overwrite';

  const result: MigrationResult = {
    mode,
    totalRows: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const defaultPath = path.join(
    process.cwd(),
    'sheetexample',
    'ฟอร์มสำหรับจองห้องประชุมสภานักศึกษา (การตอบกลับ).xlsx'
  );

  const targetPath = options?.customFilePath || defaultPath;

  if (!fs.existsSync(/*turbopackIgnore: true*/ targetPath)) {
    throw new Error(`ไม่พบไฟล์ข้อมูลประวัติที่พาธ: ${targetPath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(targetPath);

  const sheet = workbook.getWorksheet(1);
  if (!sheet) {
    throw new Error('ไม่พบแผ่นงาน (Worksheet) ในไฟล์ Excel');
  }

  result.totalRows = sheet.rowCount - 1; // excluding header

  for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
    const row = sheet.getRow(rowIdx);

    try {
      const rawTimestamp = row.getCell(1).value;
      const fullName = String(row.getCell(2).value || '').trim();
      const department = String(row.getCell(3).value || '').trim() || 'สภานักศึกษา / ไม่ระบุ';
      const email = String(row.getCell(4).value || row.getCell(11).value || '').trim();
      const dateVal = row.getCell(5).value;
      const startVal = row.getCell(6).value;
      const endVal = row.getCell(7).value;
      const reason = String(row.getCell(9).value || '').trim() || 'ขอใช้ห้องประชุมสภานักศึกษา';
      const phoneRaw = String(row.getCell(10).value || '').trim();
      const approvedRaw = String(row.getCell(12).value || '').trim();

      if (!fullName) {
        result.skipped++;
        continue;
      }

      const dateStr = parseDateCell(dateVal);
      const startTime = parseTimeCell(startVal, '13:00');
      const endTime = parseTimeCell(endVal, '16:00');

      if (!dateStr) {
        result.skipped++;
        continue;
      }

      const studentId = extractStudentId(email);
      const isApproved = approvedRaw.toLowerCase() === 'approved';
      const status = isApproved ? BookingStatus.APPROVED : BookingStatus.PENDING;

      const createdAt = rawTimestamp instanceof Date ? rawTimestamp : new Date();

      // Deterministic booking code for migration tracking
      const year = dateStr.slice(0, 4) || '2025';
      const bookingCode = `HIST-${year}-${String(rowIdx - 1).padStart(4, '0')}`;

      // Check if existing
      const existing = await prisma.booking.findUnique({
        where: { bookingCode },
      });

      if (existing) {
        if (mode === 'overwrite') {
          await prisma.booking.update({
            where: { bookingCode },
            data: {
              date: dateStr,
              startTime,
              endTime,
              fullName,
              studentId,
              email: email || `student-${rowIdx}@kmutnb.ac.th`,
              phone: phoneRaw || '-',
              department,
              reason,
              status,
              createdAt,
            },
          });
          result.updated++;
        } else {
          // 'add' mode: keep existing record untouched
          result.skipped++;
        }
      } else {
        await prisma.booking.create({
          data: {
            bookingCode,
            date: dateStr,
            startTime,
            endTime,
            fullName,
            studentId,
            email: email || `student-${rowIdx}@kmutnb.ac.th`,
            phone: phoneRaw || '-',
            department,
            reason,
            status,
            createdAt,
          },
        });
        result.imported++;
      }
    } catch (rowError: any) {
      console.error(`Error importing row ${rowIdx}:`, rowError);
      result.errors.push({ row: rowIdx, error: rowError.message || String(rowError) });
    }
  }

  return result;
}
