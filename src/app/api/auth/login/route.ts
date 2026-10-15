import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSessionToken } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limitResult = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
    if (!limitResult.allowed) {
      await recordAuditLog({
        action: 'LOGIN_RATE_LIMITED',
        details: `จำกัดอัตราการเข้าสู่ระบบ: พยายามเข้าสู่ระบบเกิน 5 ครั้งใน 15 นาทีจาก IP ${ip}`,
        actorName: 'ระบบรักษาความปลอดภัย',
        actorRole: 'SYSTEM',
        ipAddress: ip,
      });
      return rateLimitResponse(limitResult);
    }

    const body = await request.json();
    const { email, username, identifier, password } = body;
    const loginTarget = (identifier || username || email || '').trim();

    if (!loginTarget || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกชื่อผู้ใช้หรืออีเมล และรหัสผ่านให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const cleanTarget = loginTarget.toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanTarget },
          { username: cleanTarget },
        ],
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับ' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    });


    await recordAuditLog({
      action: 'ADMIN_LOGIN',
      details: `แอดมินเข้าสู่ระบบสำเร็จ (${user.fullName} / ${user.username ? `@${user.username}` : user.email})`,
      actorName: user.fullName,
      actorEmail: user.email,
      actorRole: user.role,
      ipAddress: ip,
      userId: user.id,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
