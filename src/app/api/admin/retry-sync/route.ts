import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { notifyUserBookingReceived, notifyUserBookingStatusUpdate } from '@/lib/email';
import { syncBookingToGoogleSheet } from '@/lib/google-sheets';
import { getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต (กรุณาเข้าสู่ระบบแอดมิน)' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, bookingCode, syncType = 'ALL' } = body;

    if (!bookingId && !bookingCode) {
      return NextResponse.json(
        { error: 'กรุณาระบุ bookingId หรือ bookingCode' },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          bookingId ? { id: bookingId } : {},
          bookingCode ? { bookingCode } : {},
        ],
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'ไม่พบรายการจองดังกล่าว' }, { status: 404 });
    }

    const results: Record<string, any> = {};

    // 1. Retry Email
    if (syncType === 'EMAIL' || syncType === 'ALL') {
      try {
        if (booking.status === 'PENDING') {
          results.email = await notifyUserBookingReceived(booking);
        } else {
          results.email = await notifyUserBookingStatusUpdate({
            bookingCode: booking.bookingCode,
            fullName: booking.fullName,
            email: booking.email,
            date: booking.date,
            startTime: booking.startTime,
            endTime: booking.endTime,
            status: booking.status as any,
            rejectionReason: booking.rejectionReason,
          });
        }
      } catch (err: any) {
        results.emailError = err?.message || 'ส่งอีเมลซ้ำล้มเหลว';
      }
    }

    // 2. Retry Google Sheets
    if (syncType === 'SHEET' || syncType === 'ALL') {
      try {
        results.sheet = await syncBookingToGoogleSheet(
          {
            bookingCode: booking.bookingCode,
            date: booking.date,
            startTime: booking.startTime,
            endTime: booking.endTime,
            fullName: booking.fullName,
            studentId: booking.studentId,
            email: booking.email,
            phone: booking.phone,
            department: booking.department,
            reason: booking.reason,
            status: booking.status,
            rejectionReason: booking.rejectionReason,
            createdAt: booking.createdAt,
          },
          'UPDATE'
        );
      } catch (err: any) {
        results.sheetError = err?.message || 'ซิงก์ Google Sheet ซ้ำล้มเหลว';
      }
    }

    const ip = getClientIp(request);
    await recordAuditLog({
      action: 'SYNC_RETRY_TRIGGERED',
      details: `${session.fullName} กดส่งซ้ำ (${syncType}) สำหรับรายการ ${booking.bookingCode}`,
      actorName: session.fullName,
      actorEmail: session.email,
      actorRole: session.role,
      ipAddress: ip,
      bookingId: booking.id,
      userId: session.id,
    });

    return NextResponse.json({
      success: true,
      message: 'ดำเนินการส่งข้อมูล/ซิงก์ซ้ำเรียบร้อยแล้ว',
      results,
    });
  } catch (error) {
    console.error('Error retrying sync:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสั่งซิงก์ซ้ำ' }, { status: 500 });
  }
}
