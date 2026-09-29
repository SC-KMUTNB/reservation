import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { sendAdminInviteEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'เฉพาะ Super Admin เท่านั้นที่สามารถส่งคำเชิญซ้ำได้' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้ในระบบ' }, { status: 404 });
    }

    // Generate new 48-hour token
    const newInviteToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        inviteToken: newInviteToken,
        inviteExpiresAt: newExpiresAt,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    // Send email
    try {
      await sendAdminInviteEmail({
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        inviteToken: newInviteToken,
        inviterName: session.fullName,
      });
    } catch (emailErr) {
      console.error('Failed to send invite email:', emailErr);
    }

    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    await recordAuditLog({
      action: 'ADMIN_INVITE_RESENT',
      details: `${session.fullName} ได้ส่งคำเชิญซ้ำไปยัง: ${updatedUser.fullName} (${updatedUser.email}) มีอายุ 48 ชม.`,
      actorName: session.fullName,
      actorEmail: session.email,
      actorRole: session.role,
      ipAddress: ip,
      userId: session.id,
    });

    return NextResponse.json({
      success: true,
      message: `ส่งคำเชิญใหม่ไปยัง ${updatedUser.email} เรียบร้อยแล้ว (มีอายุ 48 ชั่วโมง)`,
    });
  } catch (error) {
    console.error('Error resending invite:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งคำเชิญซ้ำ' },
      { status: 500 }
    );
  }
}
