import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, createSessionToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,20}$/;

// GET /api/auth/claim-username?username=...
// Check username availability
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawUsername = searchParams.get('username') || '';
  const username = rawUsername.trim().toLowerCase();

  if (!username) {
    return NextResponse.json({ available: false, error: 'กรุณากรอกชื่อผู้ใช้' });
  }

  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json({
      available: false,
      error: 'ความยาว 3-20 ตัวอักษร ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข และ _ . - เท่านั้น',
    });
  }

  // Check if taken by another user
  const existing = await prisma.user.findFirst({
    where: {
      username,
      NOT: { id: session.id },
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({
      available: false,
      error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น',
    });
  }

  return NextResponse.json({ available: true, message: 'ชื่อผู้ใช้นี้สามารถใช้งานได้' });
}

// POST /api/auth/claim-username
// Claim or update username
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const body = await request.json();
    const rawUsername = body.username || '';
    const cleanUsername = rawUsername.trim().toLowerCase();

    if (!cleanUsername) {
      return NextResponse.json(
        { error: 'กรุณากรอกชื่อผู้ใช้ที่ต้องการตั้ง' },
        { status: 400 }
      );
    }

    if (!USERNAME_REGEX.test(cleanUsername)) {
      return NextResponse.json(
        {
          error:
            'รูปแบบชื่อผู้ใช้ไม่ถูกต้อง: ต้องมีความยาว 3-20 ตัวอักษร และประกอบด้วยตัวอักษรภาษาอังกฤษ ตัวเลข _ . - เท่านั้น',
        },
        { status: 400 }
      );
    }

    // Check if taken
    const existing = await prisma.user.findFirst({
      where: {
        username: cleanUsername,
        NOT: { id: session.id },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น' },
        { status: 409 }
      );
    }

    // Fetch full user data before update
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, email: true, username: true, fullName: true, role: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้ในระบบ' }, { status: 404 });
    }

    const oldUsername = currentUser.username;

    // Update username
    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: { username: cleanUsername },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
      },
    });

    // Re-issue updated token
    const token = await createSessionToken({
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
      action: oldUsername ? 'USERNAME_UPDATED' : 'USERNAME_CLAIMED',
      details: oldUsername
        ? `แอดมินเปลี่ยนชื่อผู้ใช้จาก @${oldUsername} เป็น @${cleanUsername} (${updatedUser.fullName})`
        : `แอดมินตั้งชื่อผู้ใช้ครั้งแรก @${cleanUsername} (${updatedUser.fullName})`,
      actorName: updatedUser.fullName,
      actorEmail: updatedUser.email,
      actorRole: updatedUser.role,
      ipAddress: ip,
      userId: updatedUser.id,
    });

    const response = NextResponse.json({
      success: true,
      message: 'บันทึกชื่อผู้ใช้เรียบร้อยแล้ว',
      user: updatedUser,
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
    console.error('Error claiming username:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกชื่อผู้ใช้' },
      { status: 500 }
    );
  }
}
