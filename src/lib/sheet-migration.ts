import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { prisma } from './prisma';
import { BookingStatus } from '@prisma/client';

export type MigrationMode = 'overwrite' | 'add';

export interface MigrationOptions {
  customFilePath?: string;
  buffer?: Buffer | ArrayBuffer;
  fileName?: string;
  mode?: MigrationMode;
  defaultStatus?: BookingStatus;
}

export interface MigrationResult {
  mode: MigrationMode;
  source: string;
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  statusBreakdown: {
    APPROVED: number;
    PENDING: number;
    REJECTED: number;
    CANCELLED: number;
  };
  sampleRecords: Array<{
    bookingCode: string;
    fullName: string;
    date: string;
    startTime: string;
    endTime: string;
    status: BookingStatus;
  }>;
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
    const trimmed = val.trim();
    // Check YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      let y = parseInt(isoMatch[1], 10);
      if (y > 2400) y -= 543;
      const m = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
      const d = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    // Check DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      let y = parseInt(dmyMatch[3], 10);
      if (y > 2400) y -= 543;
      const m = String(parseInt(dmyMatch[2], 10)).padStart(2, '0');
      const d = String(parseInt(dmyMatch[1], 10)).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
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

export function parseStatusCell(val: any, defaultStatus: BookingStatus = BookingStatus.PENDING): BookingStatus {
  if (val === null || val === undefined) return defaultStatus;
  const str = String(val).trim().toLowerCase();
  if (!str) return defaultStatus;

  // Check Approved (Thai / Eng / Boolean)
  if (
    str === 'approved' ||
    str === 'yes' ||
    str === 'true' ||
    str === '1' ||
    str === 'ผ่าน' ||
    str === 'ยืนยัน' ||
    str === 'อนุมัติแล้ว' ||
    (str.includes('อนุมัติ') && !str.includes('ไม่อนุมัติ') && !str.includes('รออนุมัติ'))
  ) {
    return BookingStatus.APPROVED;
  }

  // Check Rejected
  if (
    str === 'rejected' ||
    str === 'disapproved' ||
    str === 'ไม่อนุมัติ' ||
    str === 'ปฏิเสธ' ||
    str === 'ไม่ผ่าน'
  ) {
    return BookingStatus.REJECTED;
  }

  // Check Cancelled
  if (
    str === 'cancelled' ||
    str === 'canceled' ||
    str === 'ยกเลิก'
  ) {
    return BookingStatus.CANCELLED;
  }

  // Check Pending
  if (
    str === 'pending' ||
    str === 'รออนุมัติ' ||
    str === 'รอดำเนินการ'
  ) {
    return BookingStatus.PENDING;
  }

  return defaultStatus;
}

export function extractStudentId(email: string): string {
  if (!email) return '-';
  const match = email.match(/s?(\d{10,13})/i);
  return match ? match[1] : '-';
}

function detectColumnIndices(headerRow: ExcelJS.Row): {
  timestampCol: number;
  fullNameCol: number;
  departmentCol: number;
  emailCol: number;
  dateCol: number;
  startTimeCol: number;
  endTimeCol: number;
  roomCol: number;
  reasonCol: number;
  phoneCol: number;
  altEmailCol: number;
  statusCol: number;
  bookingCodeCol: number;
} {
  const indices = {
    timestampCol: 1,
    fullNameCol: 2,
    departmentCol: 3,
    emailCol: 4,
    dateCol: 5,
    startTimeCol: 6,
    endTimeCol: 7,
    roomCol: 8,
    reasonCol: 9,
    phoneCol: 10,
    altEmailCol: 11,
    statusCol: 12,
    bookingCodeCol: -1,
  };

  headerRow.eachCell((cell, colNumber) => {
    const header = String(cell.value || '').trim().toLowerCase();
    if (!header) return;

    if (header.includes('รหัสการจอง') || header.includes('booking code') || header.includes('booking_code')) {
      indices.bookingCodeCol = colNumber;
    } else if (header.includes('ประทับเวลา') || header.includes('timestamp')) {
      indices.timestampCol = colNumber;
    } else if (header.includes('ชื่อผู้จอง') || header.includes('ชื่อ-สกุล') || header.includes('ชื่อผู้ขอ') || header === 'ชื่อ' || header.includes('fullname')) {
      indices.fullNameCol = colNumber;
    } else if (header.includes('หน่วยงาน') || header.includes('สังกัด') || header.includes('ชมรม') || header.includes('department')) {
      indices.departmentCol = colNumber;
    } else if (header.includes('วันที่จอง') || header === 'วันที่' || header.includes('date')) {
      indices.dateCol = colNumber;
    } else if (header.includes('เวลาเริ่มต้น') || header.includes('เริ่ม') || header.includes('start time')) {
      indices.startTimeCol = colNumber;
    } else if (header.includes('เวลาสิ้นสุด') || header.includes('สิ้นสุด') || header.includes('end time')) {
      indices.endTimeCol = colNumber;
    } else if (header.includes('เหตุผล') || header.includes('วัตถุประสงค์') || header.includes('reason')) {
      indices.reasonCol = colNumber;
    } else if (header.includes('ช่องทางการติดต่อ') || header.includes('โทร') || header.includes('เบอร์') || header.includes('phone') || header.includes('tel')) {
      indices.phoneCol = colNumber;
    } else if (header.includes('อีเมลผู้จอง') || header.includes('อีเมล') || header.includes('email')) {
      if (indices.emailCol === 4 && colNumber !== 4) {
        indices.emailCol = colNumber;
      }
    } else if (header.includes('ที่อยู่อีเมล')) {
      indices.altEmailCol = colNumber;
    } else if (
      header.includes('approved') ||
      header.includes('สถานะ') ||
      header.includes('status') ||
      header.includes('ผลการพิจารณา') ||
      header.includes('ผลการอนุมัติ')
    ) {
      indices.statusCol = colNumber;
    }
  });

  return indices;
}

/**
 * Migrate historical bookings from Excel buffer or local file path.
 * @param options.mode 'overwrite' will update existing matching records; 'add' will only insert new records and skip existing.
 * @param options.buffer Excel file as Buffer or ArrayBuffer uploaded from device.
 * @param options.defaultStatus Fallback status when cell is empty/unspecified (defaults to PENDING).
 */
export async function migrateSheetHistory(options?: MigrationOptions): Promise<MigrationResult> {
  const mode: MigrationMode = options?.mode === 'add' ? 'add' : 'overwrite';
  const defaultStatus: BookingStatus = options?.defaultStatus || BookingStatus.PENDING;

  const result: MigrationResult = {
    mode,
    source: options?.fileName || (options?.customFilePath ? path.basename(options.customFilePath) : 'sheetexample (ไฟล์เซิร์ฟเวอร์)'),
    totalRows: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    statusBreakdown: {
      APPROVED: 0,
      PENDING: 0,
      REJECTED: 0,
      CANCELLED: 0,
    },
    sampleRecords: [],
    errors: [],
  };

  const workbook = new ExcelJS.Workbook();

  if (options?.buffer) {
    const rawBuffer = Buffer.isBuffer(options.buffer) ? options.buffer : Buffer.from(options.buffer);
    await workbook.xlsx.load(rawBuffer as any);
  } else {
    const defaultPath = path.join(
      process.cwd(),
      'sheetexample',
      'ฟอร์มสำหรับจองห้องประชุมสภานักศึกษา (การตอบกลับ).xlsx'
    );
    const targetPath = options?.customFilePath || defaultPath;

    if (!fs.existsSync(/*turbopackIgnore: true*/ targetPath)) {
      throw new Error(`ไม่พบไฟล์ข้อมูลประวัติที่พาธ: ${targetPath}`);
    }

    await workbook.xlsx.readFile(targetPath);
  }

  const sheet = workbook.getWorksheet(1);
  if (!sheet) {
    throw new Error('ไม่พบแผ่นงาน (Worksheet) ในไฟล์ Excel');
  }

  const headerRow = sheet.getRow(1);
  const colMap = detectColumnIndices(headerRow);

  result.totalRows = sheet.rowCount - 1; // excluding header

  for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
    const row = sheet.getRow(rowIdx);

    try {
      const rawTimestamp = row.getCell(colMap.timestampCol).value;
      const fullName = String(row.getCell(colMap.fullNameCol).value || '').trim();
      const department = String(row.getCell(colMap.departmentCol).value || '').trim() || 'สภานักศึกษา / ไม่ระบุ';
      const email = String(
        row.getCell(colMap.emailCol).value || (colMap.altEmailCol > 0 ? row.getCell(colMap.altEmailCol).value : '') || ''
      ).trim();
      const dateVal = row.getCell(colMap.dateCol).value;
      const startVal = row.getCell(colMap.startTimeCol).value;
      const endVal = row.getCell(colMap.endTimeCol).value;
      const reason = String(row.getCell(colMap.reasonCol).value || '').trim() || 'ขอใช้ห้องประชุมสภานักศึกษา';
      const phoneRaw = String(row.getCell(colMap.phoneCol).value || '').trim();
      const statusRaw = row.getCell(colMap.statusCol).value;

      const customBookingCode = colMap.bookingCodeCol > 0
        ? String(row.getCell(colMap.bookingCodeCol).value || '').trim()
        : '';

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
      const status = parseStatusCell(statusRaw, defaultStatus);
      const createdAt = rawTimestamp instanceof Date ? rawTimestamp : new Date();

      // Deterministic booking code for migration tracking
      const year = dateStr.slice(0, 4) || '2025';
      const bookingCode = customBookingCode || `HIST-${year}-${String(rowIdx - 1).padStart(4, '0')}`;

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
              approvedAt: status === BookingStatus.APPROVED ? (existing.approvedAt || createdAt) : null,
              rejectionReason: status === BookingStatus.REJECTED ? (existing.rejectionReason || 'นำเข้าจากระบบประวัติเดิม') : null,
              createdAt,
            },
          });
          result.updated++;
          result.statusBreakdown[status]++;

          if (result.sampleRecords.length < 10) {
            result.sampleRecords.push({
              bookingCode,
              fullName,
              date: dateStr,
              startTime,
              endTime,
              status,
            });
          }
        } else {
          // 'add' mode: keep existing record untouched
          result.skipped++;
          result.statusBreakdown[existing.status]++;
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
            approvedAt: status === BookingStatus.APPROVED ? createdAt : null,
            rejectionReason: status === BookingStatus.REJECTED ? 'นำเข้าจากระบบประวัติเดิม' : null,
            createdAt,
          },
        });
        result.imported++;
        result.statusBreakdown[status]++;

        if (result.sampleRecords.length < 10) {
          result.sampleRecords.push({
            bookingCode,
            fullName,
            date: dateStr,
            startTime,
            endTime,
            status,
          });
        }
      }
    } catch (rowError: any) {
      console.error(`Error importing row ${rowIdx}:`, rowError);
      result.errors.push({ row: rowIdx, error: rowError.message || String(rowError) });
    }
  }

  return result;
}
