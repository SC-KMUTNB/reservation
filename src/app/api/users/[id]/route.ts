import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest, createSessionToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { recordAuditLog } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต (กรุณาเข้าสู่ระบบ)' }, { status: 401 });
    }

    const { id } = await params;
    const isSelf = session.id === id;
    if (!isSelf && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'เฉพาะ Super Admin เท่านั้นที่สามารถแก้ไขข้อมูลผู้ใช้อื่นได้' }, { status: 403 });
    }

    const body = await request.json();
    const { fullName, username, role, isActive, password } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'ไม่พบบัญชีผู้ใช้ดังกล่าว' }, { status: 404 });
    }

    const updateData: any = {};
    if (fullName !== undefined) updateData.fullName = fullName.trim();

    if (username !== undefined) {
      const cleanUsername = username ? username.trim().toLowerCase() : null;
      if (cleanUsername) {
        if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(cleanUsername)) {
          return NextResponse.json(
            { error: 'ชื่อผู้ใช้ต้องมีความยาว 3-20 ตัวอักษร (a-z, 0-9, _, ., -) เท่านั้น' },
            { status: 400 }
          );
        }
        const duplicate = await prisma.user.findFirst({
          where: { username: cleanUsername, NOT: { id } },
        });
        if (duplicate) {
          return NextResponse.json(
            { error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น' },
            { status: 409 }
          );
        }
      }
      updateData.username = cleanUsername;
    }

    if (session.role === 'SUPER_ADMIN' && role !== undefined) {
      updateData.role = role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';
    }
    if (session.role === 'SUPER_ADMIN' && isActive !== undefined) {
      if (id === session.id && isActive === false) {
        return NextResponse.json({ error: 'คุณไม่สามารถระงับการใช้งานบัญชีของตนเองได้' }, { status: 400 });
      }
      updateData.isActive = Boolean(isActive);
    }
    if (password && password.trim().length >= 6) {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    await recordAuditLog({
      action: 'ADMIN_UPDATED',
      details: `${session.fullName} ได้อัปเดตข้อมูลบัญชี: ${updated.fullName} (${updated.email})`,
      actorName: session.fullName,
      actorEmail: session.email,
      actorRole: session.role,
      ipAddress: ip,
      userId: session.id,
    });

    const response = NextResponse.json({ success: true, user: updated });

    if (isSelf) {
      const token = await createSessionToken({
        id: updated.id,
        email: updated.email,
        username: updated.username,
        fullName: updated.fullName,
        role: updated.role,
      });
      response.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'ไม่สามารถอัปเดตข้อมูลบัญชีได้' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'เฉพาะ Super Admin เท่านั้นที่สามารถลบบัญชีผู้ใช้ได้' }, { status: 403 });
    }

    const { id } = await params;
    if (id === session.id) {
      return NextResponse.json({ error: 'คุณไม่สามารถลบบัญชีที่กำลังเข้าสู่ระบบอยู่ได้' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'ไม่พบบัญชีผู้ใช้ดังกล่าว' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id },
    });

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    await recordAuditLog({
      action: 'ADMIN_DELETED',
      details: `${session.fullName} ลบบัญชีแอดมิน: ${targetUser.fullName} (${targetUser.email})`,
      actorName: session.fullName,
      actorEmail: session.email,
      actorRole: session.role,
      ipAddress: ip,
      userId: session.id,
    });

    return NextResponse.json({ success: true, message: 'ลบบัญชีผู้ใช้เรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'ไม่สามารถลบบัญชีผู้ใช้ได้' }, { status: 500 });
  }
}
