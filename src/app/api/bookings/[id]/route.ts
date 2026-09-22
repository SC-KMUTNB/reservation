import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

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
    const { status, rejectionReason } = body;

    if (!['APPROVED', 'REJECTED', 'PENDING', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 });
    }

    const currentBooking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!currentBooking) {
      return NextResponse.json({ error: 'ไม่พบรายการจองดังกล่าว' }, { status: 404 });
    }

    if (status === 'APPROVED') {
      const conflictingApproved = await prisma.booking.findMany({
        where: {
          date: currentBooking.date,
          status: 'APPROVED',
          id: { not: id },
        },
      });

      for (const b of conflictingApproved) {
        if (hasTimeOverlap(currentBooking.startTime, currentBooking.endTime, b.startTime, b.endTime)) {
          return NextResponse.json(
            {
              error: `ไม่สามารถอนุมัติได้เนื่องจากช่วงเวลาชนกับรายการของ ${b.fullName} (${b.startTime} - ${b.endTime} น.) ที่อนุมัติไปแล้ว`,
            },
            { status: 409 }
          );
        }
      }
    }

    const updated = await prisma.booking.update({
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

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
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

    return NextResponse.json({ success: true, booking: updated });
  } catch (error) {
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

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
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
