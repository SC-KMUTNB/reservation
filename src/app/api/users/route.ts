import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { recordAuditLog } from '@/lib/audit';

import crypto from 'crypto';
import { sendAdminInviteEmail } from '@/lib/email';

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
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        inviteToken: true,
        inviteExpiresAt: true,
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
    const { email, password, fullName, role, sendInvite } = body;

    if (!email || !fullName) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน (อีเมล และ ชื่อ-นามสกุล)' },
        { status: 400 }
      );
    }

    const isInvite = Boolean(sendInvite);

    if (!isInvite) {
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' },
          { status: 400 }
        );
      }
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json({ error: 'อีเมลนี้ถูกใช้งานในระบบแล้ว' }, { status: 409 });
    }

    let passwordHash: string;
    let inviteToken: string | null = null;
    let inviteExpiresAt: Date | null = null;

    if (isInvite) {
      // Secure random initial password
      const tempPass = crypto.randomBytes(32).toString('hex');
      passwordHash = await bcrypt.hash(tempPass, 10);
      inviteToken = crypto.randomBytes(32).toString('hex');
      // 48 hours validity
      inviteExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    } else {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        fullName: fullName.trim(),
        passwordHash,
        role: role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN',
        isActive: true,
        inviteToken,
        inviteExpiresAt,
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        inviteToken: true,
        inviteExpiresAt: true,
        createdAt: true,
      },
    });

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

    if (isInvite && inviteToken) {
      // Send invite email asynchronously / safely
      try {
        await sendAdminInviteEmail({
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          inviteToken,
          inviterName: session.fullName,
        });
      } catch (emailErr) {
        console.error('Failed to send invite email:', emailErr);
      }

      await recordAuditLog({
        action: 'ADMIN_INVITED',
        details: `${session.fullName} ได้ส่งคำเชิญสร้างบัญชีแอดมินใหม่ไปยัง: ${newUser.fullName} (${newUser.email}, บทบาท: ${newUser.role}) มีอายุ 48 ชม.`,
        actorName: session.fullName,
        actorEmail: session.email,
        actorRole: session.role,
        ipAddress: ip,
        userId: session.id,
      });

      return NextResponse.json({
        success: true,
        invited: true,
        message: `สร้างบัญชีและส่งอีเมลคำเชิญไปยัง ${newUser.email} เรียบร้อยแล้ว`,
        user: newUser,
      });
    }

    await recordAuditLog({
      action: 'ADMIN_CREATED',
      details: `${session.fullName} ได้สร้างบัญชีแอดมินใหม่ (แบบกำหนดรหัสผ่านทันที): ${newUser.fullName} (${newUser.email}, บทบาท: ${newUser.role})`,
      actorName: session.fullName,
      actorEmail: session.email,
      actorRole: session.role,
      ipAddress: ip,
      userId: session.id,
    });

    return NextResponse.json({
      success: true,
      invited: false,
      message: `สร้างบัญชีผู้ใช้ ${newUser.fullName} เรียบร้อยแล้ว`,
      user: newUser,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างบัญชีแอดมิน' }, { status: 500 });
  }
}
