import { isBackdated } from './date-utils';

export interface BookingInput {
  date: string;
  startTime: string;
  endTime: string;
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  department: string;
  reason: string;
}

export interface ValidationOptions {
  checkBackdated?: boolean;
  timezone?: string | null;
  referenceDate?: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<keyof BookingInput, string | undefined>;
  firstError?: string;
  sanitized?: BookingInput;
}

export const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const STUDENT_ID_REGEX = /^\d{13}$/;
export const THAI_PHONE_REGEX = /^0\d{8,9}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizeBookingInput(input: Partial<BookingInput>): BookingInput {
  const cleanPhone = (input.phone || '').replace(/[-\s]/g, '').trim();
  return {
    date: (input.date || '').trim(),
    startTime: (input.startTime || '').trim(),
    endTime: (input.endTime || '').trim(),
    fullName: (input.fullName || '').trim(),
    studentId: (input.studentId || '').trim(),
    email: (input.email || '').trim().toLowerCase(),
    phone: cleanPhone,
    department: (input.department || '').trim(),
    reason: (input.reason || '').trim(),
  };
}

export function validateBookingInput(
  rawInput: Partial<BookingInput>,
  options: ValidationOptions = {}
): ValidationResult {
  const sanitized = sanitizeBookingInput(rawInput);
  const errors: Record<string, string | undefined> = {};

  // 1. Required fields check
  if (!sanitized.fullName) {
    errors.fullName = 'กรุณากรอกชื่อ-นามสกุล';
  } else if (sanitized.fullName.length < 2 || sanitized.fullName.length > 100) {
    errors.fullName = 'ชื่อ-นามสกุลต้องมีความยาว 2 - 100 ตัวอักษร';
  }

  if (!sanitized.studentId) {
    errors.studentId = 'กรุณากรอกรหัสนักศึกษา';
  } else if (!STUDENT_ID_REGEX.test(sanitized.studentId)) {
    errors.studentId = 'รหัสนักศึกษาต้องเป็นตัวเลข 13 หลัก';
  }

  if (!sanitized.email) {
    errors.email = 'กรุณากรอกอีเมล';
  } else if (!EMAIL_REGEX.test(sanitized.email) || sanitized.email.length > 150) {
    errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
  }

  if (!sanitized.phone) {
    errors.phone = 'กรุณากรอกเบอร์โทรศัพท์';
  } else if (!THAI_PHONE_REGEX.test(sanitized.phone)) {
    errors.phone = 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก (ขึ้นต้นด้วย 0)';
  }

  if (!sanitized.department) {
    errors.department = 'กรุณากรอกหน่วยงาน/คณะ';
  } else if (sanitized.department.length < 2 || sanitized.department.length > 100) {
    errors.department = 'หน่วยงาน/คณะต้องมีความยาว 2 - 100 ตัวอักษร';
  }

  if (!sanitized.reason) {
    errors.reason = 'กรุณากรอกวัตถุประสงค์การใช้งาน';
  } else if (sanitized.reason.length < 5 || sanitized.reason.length > 500) {
    errors.reason = 'วัตถุประสงค์ต้องมีความยาว 5 - 500 ตัวอักษร';
  }

  // 2. Date validation
  if (!sanitized.date) {
    errors.date = 'กรุณาเลือกวันที่';
  } else if (!DATE_FORMAT_REGEX.test(sanitized.date)) {
    errors.date = 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)';
  }

  // 3. Time validation
  let timeFormatValid = true;
  if (!sanitized.startTime) {
    errors.startTime = 'กรุณาเลือกเวลาเริ่มต้น';
    timeFormatValid = false;
  } else if (!TIME_FORMAT_REGEX.test(sanitized.startTime)) {
    errors.startTime = 'รูปแบบเวลาเริ่มต้นไม่ถูกต้อง (HH:MM)';
    timeFormatValid = false;
  }

  if (!sanitized.endTime) {
    errors.endTime = 'กรุณาเลือกเวลาสิ้นสุด';
    timeFormatValid = false;
  } else if (!TIME_FORMAT_REGEX.test(sanitized.endTime)) {
    errors.endTime = 'รูปแบบเวลาสิ้นสุดไม่ถูกต้อง (HH:MM)';
    timeFormatValid = false;
  }

  if (timeFormatValid && sanitized.startTime >= sanitized.endTime) {
    errors.endTime = 'เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด';
  }

  // 4. Backdated check
  if (
    options.checkBackdated !== false &&
    !errors.date &&
    !errors.startTime &&
    DATE_FORMAT_REGEX.test(sanitized.date) &&
    TIME_FORMAT_REGEX.test(sanitized.startTime)
  ) {
    const backdatedCheck = isBackdated(
      sanitized.date,
      sanitized.startTime,
      options.timezone,
      options.referenceDate
    );
    if (backdatedCheck.isBackdated) {
      if (backdatedCheck.reason === 'PAST_DATE') {
        errors.date = 'ไม่อนุญาตให้จองย้อนหลัง กรุณาเลือกวันที่ปัจจุบันหรือในอนาคต';
      } else {
        errors.startTime = 'เวลาเริ่มต้นที่เลือกได้ผ่านไปแล้ว กรุณาเลือกเวลาในอนาคต';
      }
    }
  }

  const activeErrors = Object.entries(errors).filter(([_, msg]) => !!msg);
  const isValid = activeErrors.length === 0;
  const firstError = activeErrors.length > 0 ? activeErrors[0][1] : undefined;

  return {
    isValid,
    errors: errors as Record<keyof BookingInput, string | undefined>,
    firstError,
    sanitized,
  };
}
