import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
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
        createdAt: true,
      },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error tracking booking:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการค้นหาข้อมูล' }, { status: 500 });
  }
}
