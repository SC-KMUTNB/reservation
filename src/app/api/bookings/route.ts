import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

import { notifyAdminNewBooking, notifyUserBookingReceived } from '@/lib/email';
import { syncBookingToGoogleSheet } from '@/lib/google-sheets';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { validateBookingInput } from '@/lib/booking-validation';
import { getFacilityConfig } from '@/lib/facility-config';
import { dispatchWebhookEvent } from '@/lib/webhook-notify';

function hasTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && end1 > start2;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month'); // YYYY-MM
    const date = searchParams.get('date');   // YYYY-MM-DD
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate'); // YYYY-MM-DD
    const status = searchParams.get('status');

    const session = await getSessionFromRequest(request);
    const isAdmin = !!session;

    const where: any = {};

    if (date) {
      where.date = date;
    } else if (month) {
      where.date = {
        startsWith: month,
      };
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startDate;
      }
      if (endDate) {
        where.date.lte = endDate;
      }
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        approvedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!isAdmin) {
      const sanitized = bookings.map((b) => ({
        id: b.id,
        bookingCode: b.bookingCode,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        department: b.department,
        fullName: b.fullName,
      }));
      return NextResponse.json({ bookings: sanitized });
    }

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูลการจองได้' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limitResult = checkRateLimit(`booking-submit:${ip}`, 5, 10 * 60 * 1000);
    if (!limitResult.allowed) {
      return rateLimitResponse(limitResult);
    }

    const body = await request.json();

    const session = await getSessionFromRequest(request);
    const isAdmin = session?.role === 'ADMIN' || session?.role === 'SUPER_ADMIN';

    let timezone = 'Asia/Bangkok';
    if (!isAdmin) {
      const timezoneSetting = await prisma.siteSetting.findUnique({
        where: { key: 'timezone' },
      });
      if (timezoneSetting?.value) {
        timezone = timezoneSetting.value;
      }
    }

    const validation = validateBookingInput(body, {
      checkBackdated: !isAdmin,
      timezone,
    });

    if (!validation.isValid || !validation.sanitized) {
      return NextResponse.json(
        {
          error: validation.firstError || 'ข้อมูลการจองไม่ถูกต้อง',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const {
      date,
      startTime,
      endTime,
      fullName,
      studentId,
      email,
      phone,
      department,
      reason,
    } = validation.sanitized;

    const facilityConfig = await getFacilityConfig();

    // Check closed dates
    const blackoutDate = facilityConfig.closedDates?.find((c) => c.date === date);
    if (blackoutDate) {
      return NextResponse.json(
        { error: `ห้องประชุมปิดให้บริการในวันที่ระบุ (${blackoutDate.reason || 'วันหยุดทำการ'})` },
        { status: 400 }
      );
    }

    // Check operating hours
    if (startTime < facilityConfig.openTime || endTime > facilityConfig.closeTime) {
      return NextResponse.json(
        { error: `เวลาที่เลือกอยู่นอกเวลาทำการ (${facilityConfig.openTime} - ${facilityConfig.closeTime} น.)` },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const activeBookingsOnDate = await tx.booking.findMany({
        where: {
          date,
          status: {
            in: ['APPROVED', 'PENDING'],
          },
        },
      });

      for (const booking of activeBookingsOnDate) {
        if (hasTimeOverlap(startTime, endTime, booking.startTime, booking.endTime)) {
          const statusText = booking.status === 'APPROVED' ? 'ได้รับการอนุมัติแล้ว' : 'มีผู้ส่งคำขอจองแล้ว (รอตรวจสอบ)';
          throw new Error(
            `OVERLAP:ช่วงเวลาดังกล่าว (${startTime} - ${endTime} น.) ${statusText} (${booking.startTime} - ${booking.endTime} น.) กรุณาเลือกช่วงเวลาอื่น`
          );
        }
      }

      const countToday = await tx.booking.count();
      const currentYear = new Date().getFullYear();
      const codeNumber = String(countToday + 1).padStart(4, '0');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const bookingCode = `KMUTNB-${currentYear}-${codeNumber}-${randomSuffix}`;

      const created = await tx.booking.create({
        data: {
          bookingCode,
          date,
          startTime,
          endTime,
          fullName: fullName.trim(),
          studentId: studentId.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          department: department.trim(),
          reason: reason.trim(),
          status: 'PENDING',
        },
      });

      return created;
    });

    await recordAuditLog({
      action: 'BOOKING_CREATED',
      details: `สร้างคำขอจองห้องประชุมวันที่ ${date} เวลา ${startTime} - ${endTime} น. โดย ${fullName} (${studentId})`,
      actorName: fullName.trim(),
      actorEmail: email.trim(),
      actorRole: 'STUDENT',
      ipAddress: ip,
      bookingId: result.id,
    });

    after(async () => {
      try {
        await notifyAdminNewBooking(result);
      } catch (err: any) {
        console.error('Admin email notify failed:', err);
        await recordAuditLog({
          action: 'EMAIL_DELIVERY_FAILED',
          details: `ส่งอีเมลแจ้งเตือนแอดมินล้มเหลว (${result.bookingCode}): ${err?.message}`,
          actorName: 'ระบบแจ้งเตือนอัตโนมัติ',
          actorRole: 'SYSTEM',
          bookingId: result.id,
        });
      }

      try {
        await notifyUserBookingReceived(result);
      } catch (err: any) {
        console.error('User email notify failed:', err);
        await recordAuditLog({
          action: 'EMAIL_DELIVERY_FAILED',
          details: `ส่งอีเมลยืนยันคำขอผู้จองล้มเหลว (${result.bookingCode}): ${err?.message}`,
          actorName: 'ระบบแจ้งเตือนอัตโนมัติ',
          actorRole: 'SYSTEM',
          bookingId: result.id,
        });
      }

      try {
        await syncBookingToGoogleSheet(result, 'CREATE');
      } catch (err: any) {
        console.error('Google Sheet sync failed:', err);
        await recordAuditLog({
          action: 'SHEET_SYNC_FAILED',
          details: `ซิงก์ข้อมูลสร้างคำขอ ${result.bookingCode} ไปยัง Google Sheet ล้มเหลว: ${err?.message}`,
          actorName: 'ระบบซิงก์อัตโนมัติ',
          actorRole: 'SYSTEM',
          bookingId: result.id,
        });
      }

      try {
        await dispatchWebhookEvent('BOOKING_CREATED', {
          bookingCode: result.bookingCode,
          fullName: result.fullName,
          studentId: result.studentId,
          department: result.department,
          date: result.date,
          startTime: result.startTime,
          endTime: result.endTime,
          reason: result.reason,
        });
      } catch (err: any) {
        console.error('Webhook dispatch failed:', err);
      }
    });

    return NextResponse.json({
      success: true,
      message: 'ส่งคำขอจองห้องประชุมเรียบร้อยแล้ว',
      booking: result,
    });
  } catch (error: any) {
    if (error?.message && error.message.startsWith('OVERLAP:')) {
      return NextResponse.json(
        { error: error.message.replace('OVERLAP:', '') },
        { status: 409 }
      );
    }
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกคำขอจอง' },
      { status: 500 }
    );
  }
}
