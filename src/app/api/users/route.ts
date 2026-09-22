import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { recordAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'เฉพาะ Super Admin เท่านั้นที่สามารถจัดการผู้ใช้ได้' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { approvedBookings: true },
        },
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลรายชื่อผู้ดูแลระบบได้' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'เฉพาะ Super Admin เท่านั้นที่สามารถเพิ่มแอดมินใหม่ได้' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, fullName, role } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน (อีเมล, รหัสผ่าน, ชื่อ-นามสกุล)' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json({ error: 'อีเมลนี้ถูกใช้งานในระบบแล้ว' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        fullName: fullName.trim(),
        passwordHash,
        role: role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN',
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    await recordAuditLog({
      action: 'ADMIN_CREATED',
      details: `${session.fullName} ได้สร้างบัญชีแอดมินใหม่: ${newUser.fullName} (${newUser.email}, บทบาท: ${newUser.role})`,
      actorName: session.fullName,
      actorEmail: session.email,
      actorRole: session.role,
      ipAddress: ip,
      userId: session.id,
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างบัญชีแอดมิน' }, { status: 500 });
  }
}
