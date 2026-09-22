import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const where: any = {};
    if (action && action !== 'ALL') {
      where.action = action;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
      include: {
        booking: {
          select: {
            bookingCode: true,
            fullName: true,
            date: true,
          },
        },
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลบันทึกการตรวจสอบได้' }, { status: 500 });
  }
}
