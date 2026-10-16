import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { notifyUserBookingStatusUpdate } from '@/lib/email';
import { syncBookingToGoogleSheet } from '@/lib/google-sheets';
import { getClientIp } from '@/lib/rate-limit';

function hasTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && end1 > start2;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต (กรุณาเข้าสู่ระบบแอดมิน)' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const ip = getClientIp(request);

    // 1. Handle Check-in Action
    if (body.action === 'CHECK_IN' || body.checkIn === true) {
      const currentBooking = await prisma.booking.findUnique({
        where: { id },
      });

      if (!currentBooking) {
        return NextResponse.json({ error: 'ไม่พบรายการจองดังกล่าว' }, { status: 404 });
      }

      if (currentBooking.status !== 'APPROVED') {
        return NextResponse.json(
          { error: 'สามารถเช็กอินได้เฉพาะรายการที่ได้รับการอนุมัติแล้วเท่านั้น' },
          { status: 400 }
        );
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: {
          checkedInAt: new Date(),
          checkedInByName: session.fullName,
        },
      });

      await recordAuditLog({
        action: 'BOOKING_CHECKED_IN',
        details: `${session.fullName} ได้เช็กอินเข้าห้องให้ ${currentBooking.fullName} (รหัส ${currentBooking.bookingCode})`,
        actorName: session.fullName,
        actorEmail: session.email,
        actorRole: session.role,
        ipAddress: ip,
        bookingId: id,
        userId: session.id,
      });

      return NextResponse.json({ success: true, booking: updated });
    }

    // 2. Handle Status Updates (APPROVED, REJECTED, PENDING, CANCELLED)
    const { status, rejectionReason, autoRejectConflicts } = body;

    if (!['APPROVED', 'REJECTED', 'PENDING', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 });
    }

    const currentBooking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!currentBooking) {
      return NextResponse.json({ error: 'ไม่พบรายการจองดังกล่าว' }, { status: 404 });
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      let rejectedConflicts: any[] = [];

      if (status === 'APPROVED') {
        const conflictingApproved = await tx.booking.findMany({
          where: {
            date: currentBooking.date,
            status: 'APPROVED',
            id: { not: id },
          },
        });

        for (const b of conflictingApproved) {
          if (hasTimeOverlap(currentBooking.startTime, currentBooking.endTime, b.startTime, b.endTime)) {
            throw new Error(
              `CONFLICT:ไม่สามารถอนุมัติได้เนื่องจากช่วงเวลาชนกับรายการของ ${b.fullName} (${b.startTime} - ${b.endTime} น.) ที่อนุมัติไปแล้ว`
            );
          }
        }

        if (autoRejectConflicts) {
          const pendingOnDate = await tx.booking.findMany({
            where: {
              date: currentBooking.date,
              status: 'PENDING',
              id: { not: id },
            },
          });

          const conflictingPending = pendingOnDate.filter((b) =>
            hasTimeOverlap(currentBooking.startTime, currentBooking.endTime, b.startTime, b.endTime)
          );

          for (const p of conflictingPending) {
            const rej = await tx.booking.update({
              where: { id: p.id },
              data: {
                status: 'REJECTED',
                rejectionReason: 'ช่วงเวลาดังกล่าวได้รับการอนุมัติให้ผู้ขอใช้งานท่านอื่นแล้ว',
                approvedById: session.id,
                approvedAt: new Date(),
              },
            });
            rejectedConflicts.push(rej);
          }
        }
      }

      const updated = await tx.booking.update({
        where: { id },
        data: {
          status,
          rejectionReason: status === 'REJECTED' ? (rejectionReason || 'ไม่ระบุเหตุผล') : null,
          approvedById: ['APPROVED', 'REJECTED'].includes(status) ? session.id : null,
          approvedAt: ['APPROVED', 'REJECTED'].includes(status) ? new Date() : null,
        },
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

      return { updated, rejectedConflicts };
    });

    const { updated, rejectedConflicts } = transactionResult;

    const statusTextMap: Record<string, string> = {
      APPROVED: 'อนุมัติการจองห้อง',
      REJECTED: `ปฏิเสธการจองห้อง (${rejectionReason || 'ไม่มีระบุ'})`,
      PENDING: 'เปลี่ยนสถานะเป็นรอการอนุมัติ',
      CANCELLED: 'ยกเลิกการจองห้อง',
    };

    await recordAuditLog({
      action: `BOOKING_${status}`,
      details: `${session.fullName} ได้ดำเนินการ: ${statusTextMap[status]} สำหรับ ${currentBooking.fullName} วันที่ ${currentBooking.date} เวลา ${currentBooking.startTime}-${currentBooking.endTime}`,
      actorName: session.fullName,
      actorEmail: session.email,
      actorRole: session.role,
      ipAddress: ip,
      bookingId: id,
      userId: session.id,
    });

    after(async () => {
      // 1. Process target booking side-effects
      if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
        try {
          await notifyUserBookingStatusUpdate({
            bookingCode: updated.bookingCode,
            fullName: updated.fullName,
            email: updated.email,
            date: updated.date,
            startTime: updated.startTime,
            endTime: updated.endTime,
            status: updated.status as any,
            rejectionReason: updated.rejectionReason,
          });
        } catch (err: any) {
          console.error('User status email failed:', err);
          await recordAuditLog({
            action: 'EMAIL_DELIVERY_FAILED',
            details: `ส่งอีเมลแจ้งสถานะ (${status}) ให้ ${updated.bookingCode} ล้มเหลว: ${err?.message}`,
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
              approvedBy: session.fullName,
              createdAt: updated.createdAt,
            },
            'UPDATE'
          );
        } catch (err: any) {
          console.error('Google Sheet update failed:', err);
          await recordAuditLog({
            action: 'SHEET_SYNC_FAILED',
            details: `ซิงก์ข้อมูลอัปเดตสถานะ ${updated.bookingCode} ไปยัง Google Sheet ล้มเหลว: ${err?.message}`,
            actorName: 'ระบบซิงก์อัตโนมัติ',
            actorRole: 'SYSTEM',
            bookingId: updated.id,
          });
        }
      }

      // 2. Process auto-rejected conflicts side-effects
      for (const rej of rejectedConflicts) {
        await recordAuditLog({
          action: 'BOOKING_AUTO_REJECTED_CONFLICT',
          details: `ปฏิเสธคำขออัตโนมัติเนื่องจากเวลาชนกับคำขอ ${updated.bookingCode} ที่ได้รับอนุมัติ (${rej.fullName} / ${rej.bookingCode})`,
          actorName: session.fullName,
          actorEmail: session.email,
          actorRole: session.role,
          ipAddress: ip,
          bookingId: rej.id,
          userId: session.id,
        });

        try {
          await notifyUserBookingStatusUpdate({
            bookingCode: rej.bookingCode,
            fullName: rej.fullName,
            email: rej.email,
            date: rej.date,
            startTime: rej.startTime,
            endTime: rej.endTime,
            status: 'REJECTED',
            rejectionReason: rej.rejectionReason,
          });
        } catch (err: any) {
          console.error('Auto-rejection status email failed:', err);
        }

        try {
          await syncBookingToGoogleSheet(
            {
              bookingCode: rej.bookingCode,
              date: rej.date,
              startTime: rej.startTime,
              endTime: rej.endTime,
              fullName: rej.fullName,
              studentId: rej.studentId,
              email: rej.email,
              phone: rej.phone,
              department: rej.department,
              reason: rej.reason,
              status: rej.status,
              rejectionReason: rej.rejectionReason,
              approvedBy: session.fullName,
              createdAt: rej.createdAt,
            },
            'UPDATE'
          );
        } catch (err: any) {
          console.error('Auto-rejection Google Sheet sync failed:', err);
        }
      }
    });

    return NextResponse.json({
      success: true,
      booking: updated,
      autoRejectedCount: rejectedConflicts.length,
    });
  } catch (error: any) {
    if (error?.message && error.message.startsWith('CONFLICT:')) {
      return NextResponse.json(
        { error: error.message.replace('CONFLICT:', '') },
        { status: 409 }
      );
    }
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'ไม่สามารถอัปเดตสถานะการจองได้' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต (กรุณาเข้าสู่ระบบแอดมิน)' }, { status: 401 });
    }

    const { id } = await params;
    const currentBooking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!currentBooking) {
      return NextResponse.json({ error: 'ไม่พบรายการจองดังกล่าว' }, { status: 404 });
    }

    await prisma.booking.delete({
      where: { id },
    });

    const ip = getClientIp(request);
    await recordAuditLog({
      action: 'BOOKING_DELETED',
      details: `${session.fullName} ลบรายการจองของ ${currentBooking.fullName} (รหัส ${currentBooking.bookingCode})`,
      actorName: session.fullName,
      actorEmail: session.email,
      actorRole: session.role,
      ipAddress: ip,
      userId: session.id,
    });

    return NextResponse.json({ success: true, message: 'ลบรายการจองเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json({ error: 'ไม่สามารถลบรายการจองได้' }, { status: 500 });
  }
}
