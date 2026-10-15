import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { recordAuditLog } from '@/lib/audit';
import { notifyUserBookingStatusUpdate } from '@/lib/email';
import { syncBookingToGoogleSheet } from '@/lib/google-sheets';
import { isBackdated } from '@/lib/date-utils';
import { dispatchWebhookEvent } from '@/lib/webhook-notify';

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limitResult = checkRateLimit(`track:${ip}`, 30, 5 * 60 * 1000);
    if (!limitResult.allowed) {
      return rateLimitResponse(limitResult);
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim();

    if (!query) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสนักศึกษาหรือรหัสการจอง' }, { status: 400 });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { studentId: { equals: query, mode: 'insensitive' } },
          { bookingCode: { equals: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        bookingCode: true,
        date: true,
        startTime: true,
        endTime: true,
        fullName: true,
        studentId: true,
        department: true,
        reason: true,
        status: true,
        rejectionReason: true,
        approvedAt: true,
        checkedInAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error tracking booking:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการค้นหาข้อมูล' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const { bookingCode, studentId, phoneLast4, cancelReason } = body;

    if (!bookingCode || !studentId || !phoneLast4) {
      return NextResponse.json(
        { error: 'กรุณาระบุรหัสการจอง รหัสนักศึกษา และเบอร์โทรศัพท์ 4 ตัวท้ายให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findFirst({
      where: {
        bookingCode: { equals: String(bookingCode).trim(), mode: 'insensitive' },
        studentId: { equals: String(studentId).trim(), mode: 'insensitive' },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลการจองที่ตรงกับรหัสการจองและรหัสนักศึกษานี้' },
        { status: 404 }
      );
    }

    const cleanPhone = (booking.phone || '').replace(/[-\s]/g, '');
    if (!cleanPhone.endsWith(String(phoneLast4).trim())) {
      return NextResponse.json(
        { error: 'เบอร์โทรศัพท์ 4 ตัวท้ายไม่ตรงกับข้อมูลในระบบ' },
        { status: 400 }
      );
    }

    if (booking.status !== 'PENDING' && booking.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `ไม่สามารถยกเลิกได้เนื่องจากสถานะปัจจุบันคือ ${booking.status}` },
        { status: 400 }
      );
    }

    if (booking.status === 'APPROVED') {
      const timezoneSetting = await prisma.siteSetting.findUnique({
        where: { key: 'timezone' },
      });
      const backdated = isBackdated(booking.date, booking.startTime, timezoneSetting?.value);
      if (backdated.isBackdated) {
        return NextResponse.json(
          { error: 'ไม่สามารถยกเลิกการจองที่ผ่านเวลาเริ่มต้นไปแล้วได้' },
          { status: 400 }
        );
      }
    }

    const formattedReason = `[ผู้จองยกเลิกเอง]: ${(cancelReason || '').trim() || 'ไม่ระบุเหตุผล'}`;

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        rejectionReason: formattedReason,
      },
    });

    await recordAuditLog({
      action: 'BOOKING_CANCELLED_BY_STUDENT',
      details: `ผู้จองยกเลิกการจองด้วยตนเอง (รหัส ${booking.bookingCode}) เหตุผล: ${(cancelReason || '').trim() || 'ไม่ระบุเหตุผล'}`,
      actorName: booking.fullName,
      actorEmail: booking.email,
      actorRole: 'STUDENT',
      ipAddress: ip,
      bookingId: booking.id,
    });

    after(async () => {
      try {
        await notifyUserBookingStatusUpdate({
          bookingCode: updated.bookingCode,
          fullName: updated.fullName,
          email: updated.email,
          date: updated.date,
          startTime: updated.startTime,
          endTime: updated.endTime,
          status: 'CANCELLED',
          rejectionReason: formattedReason,
        });
      } catch (err: any) {
        console.error('Cancellation status email failed:', err);
        await recordAuditLog({
          action: 'EMAIL_DELIVERY_FAILED',
          details: `ส่งอีเมลแจ้งยกเลิกคำขอ ${updated.bookingCode} ล้มเหลว: ${err?.message}`,
          actorName: 'ระบบแจ้งเตือนอัตโนมัติ',
          actorRole: 'SYSTEM',
          bookingId: updated.id,
        });
      }

      try {
        await syncBookingToGoogleSheet(
          {
            bookingCode: updated.bookingCode,
            date: updated.date,
            startTime: updated.startTime,
            endTime: updated.endTime,
            fullName: updated.fullName,
            studentId: updated.studentId,
            email: updated.email,
            phone: updated.phone,
            department: updated.department,
            reason: updated.reason,
            status: updated.status,
            rejectionReason: updated.rejectionReason,
            createdAt: updated.createdAt,
          },
          'UPDATE'
        );
      } catch (err: any) {
        console.error('Cancellation Google Sheet sync failed:', err);
        await recordAuditLog({
          action: 'SHEET_SYNC_FAILED',
          details: `ซิงก์ข้อมูลยกเลิกคำขอ ${updated.bookingCode} ไปยัง Google Sheet ล้มเหลว: ${err?.message}`,
          actorName: 'ระบบซิงก์อัตโนมัติ',
          actorRole: 'SYSTEM',
          bookingId: updated.id,
        });
      }

      try {
        await dispatchWebhookEvent('BOOKING_CANCELLED', {
          bookingCode: updated.bookingCode,
          fullName: updated.fullName,
          studentId: updated.studentId,
          department: updated.department,
          date: updated.date,
          startTime: updated.startTime,
          endTime: updated.endTime,
          rejectionReason: updated.rejectionReason,
        });
      } catch (err: any) {
        console.error('Cancellation webhook dispatch failed:', err);
      }
    });

    return NextResponse.json({
      success: true,
      message: 'ยกเลิกการจองเรียบร้อยแล้ว',
      booking: updated,
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการยกเลิกคำขอจอง' },
      { status: 500 }
    );
  }
}
