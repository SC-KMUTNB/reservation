import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
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
    const { fullName, role, isActive, password } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'ไม่พบบัญชีผู้ใช้ดังกล่าว' }, { status: 404 });
    }

    const updateData: any = {};
    if (fullName !== undefined) updateData.fullName = fullName.trim();
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

    return NextResponse.json({ success: true, user: updated });
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
