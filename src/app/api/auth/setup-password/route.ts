import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSessionToken } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,20}$/;

// GET /api/auth/setup-password?token=...
// Check if invite token is valid and not expired
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'ไม่พบโทเค็นคำเชิญในลิงก์' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        username: true,
        inviteExpiresAt: true,
      },
    });

    if (!user || !user.inviteExpiresAt) {
      return NextResponse.json(
        { valid: false, error: 'ลิงก์คำเชิญนี้ไม่ถูกต้องหรือถูกใช้งานไปแล้ว' },
        { status: 400 }
      );
    }

    // Check expiration (48 hours)
    if (new Date() > user.inviteExpiresAt) {
      return NextResponse.json(
        {
          valid: false,
          expired: true,
          error:
            'ลิงก์คำเชิญนี้หมดอายุแล้ว (เกิน 48 ชั่วโมง) กรุณาติดต่อ Super Admin เพื่อขอรับคำเชิญใหม่',
        },
        { status: 410 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        suggestedUsername: user.username || user.email.split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, ''),
      },
    });
  } catch (error) {
    console.error('Error verifying invite token:', error);
    return NextResponse.json(
      { valid: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบลิงก์คำเชิญ' },
      { status: 500 }
    );
  }
}

// POST /api/auth/setup-password
// Set password, optionally claim username, and auto-login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, username } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'ไม่พบโทเค็นคำเชิญ' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
    });

    if (!user || !user.inviteExpiresAt) {
      return NextResponse.json(
        { error: 'ลิงก์คำเชิญนี้ไม่ถูกต้องหรือถูกใช้งานไปแล้ว' },
        { status: 400 }
      );
    }

    if (new Date() > user.inviteExpiresAt) {
      return NextResponse.json(
        {
          error:
            'ลิงก์คำเชิญนี้หมดอายุแล้ว กรุณาติดต่อ Super Admin เพื่อขอรับคำเชิญใหม่',
        },
        { status: 410 }
      );
    }

    // Validate optional username
    let cleanUsername: string | null = null;
    if (typeof username === 'string' && username.trim().length > 0) {
      const trimmed = username.trim().toLowerCase();
      if (!USERNAME_REGEX.test(trimmed)) {
        return NextResponse.json(
          {
            error:
              'รูปแบบชื่อผู้ใช้ไม่ถูกต้อง: ต้องมีความยาว 3-20 ตัวอักษร (a-z, 0-9, _, ., -) เท่านั้น',
          },
          { status: 400 }
        );
      }

      const duplicate = await prisma.user.findFirst({
        where: {
          username: trimmed,
          NOT: { id: user.id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น' },
          { status: 409 }
        );
      }
      cleanUsername = trimmed;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Update user and invalidate token immediately (single-use)
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        username: cleanUsername || user.username || null,
        inviteToken: null,
        inviteExpiresAt: null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
      },
    });

    // Auto-login: issue session token
    const sessionToken = await createSessionToken({
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      fullName: updatedUser.fullName,
      role: updatedUser.role,
    });

    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    await recordAuditLog({
      action: 'ADMIN_SETUP_PASSWORD',
      details: `${updatedUser.fullName} (${updatedUser.email}) ได้ตั้งรหัสผ่านผ่านลิงก์คำเชิญสำเร็จ และเปิดใช้งานบัญชีเรียบร้อย`,
      actorName: updatedUser.fullName,
      actorEmail: updatedUser.email,
      actorRole: updatedUser.role,
      ipAddress: ip,
      userId: updatedUser.id,
    });

    const response = NextResponse.json({
      success: true,
      message: 'ตั้งรหัสผ่านและเปิดใช้งานบัญชีเรียบร้อยแล้ว',
      user: updatedUser,
    });

    response.cookies.set('admin_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Error setting up password:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการตั้งรหัสผ่าน' },
      { status: 500 }
    );
  }
}
