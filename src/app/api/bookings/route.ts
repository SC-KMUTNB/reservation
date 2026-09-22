import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

function hasTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && end1 > start2;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month'); // YYYY-MM
    const date = searchParams.get('date');   // YYYY-MM-DD
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
    const body = await request.json();
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
    } = body;

    if (
      !date ||
      !startTime ||
      !endTime ||
      !fullName ||
      !studentId ||
      !email ||
      !phone ||
      !department ||
      !reason
    ) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง' },
        { status: 400 }
      );
    }

    if (startTime >= endTime) {
      return NextResponse.json(
        { error: 'เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด' },
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

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

    await recordAuditLog({
      action: 'BOOKING_CREATED',
      details: `สร้างคำขอจองห้องประชุมวันที่ ${date} เวลา ${startTime} - ${endTime} น. โดย ${fullName} (${studentId})`,
      actorName: fullName.trim(),
      actorEmail: email.trim(),
      actorRole: 'STUDENT',
      ipAddress: ip,
      bookingId: result.id,
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
