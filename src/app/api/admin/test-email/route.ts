import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { sendEmail, getEmailConfig } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'เฉพาะ Super Admin เท่านั้นที่สามารถทดสอบส่งอีเมลได้' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const targetEmail = body.toEmail || session.email;

    if (!targetEmail || !targetEmail.includes('@')) {
      return NextResponse.json({ error: 'กรุณาระบุที่อยู่อีเมลผู้รับที่ถูกต้อง' }, { status: 400 });
    }

    const config = await getEmailConfig();
    if (config.provider === 'DISABLED') {
      return NextResponse.json(
        { error: 'ระบบอีเมลถูกตั้งค่าเป็น DISABLED (ปิดการใช้งาน)' },
        { status: 400 }
      );
    }

    const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    const result = await sendEmail({
      to: targetEmail,
      subject: '[ทดสอบระบบ] ทดสอบการส่งอีเมลระบบจองห้องประชุมสภานักศึกษา มจพ.',
      html: `
        <div style="font-family: sans-serif; padding: 24px; background-color: #f8fafc; border-radius: 12px;">
          <h2 style="color: #ea580c; margin-top: 0;">ทดสอบการเชื่อมต่อระบบอีเมลสำเร็จ!</h2>
          <p>อีเมลนี้ถูกส่งจากการทดสอบในหน้าแอดมิน (Super Admin Settings) เพื่อยืนยันว่าการตั้งค่าอีเมลของคุณทำงานได้ถูกต้องสมบูรณ์</p>
          <ul style="color: #334155; line-height: 1.8;">
            <li><strong>ผู้ทดสอบ:</strong> ${session.fullName} (${session.email})</li>
            <li><strong>เวลาที่ทดสอบ:</strong> ${now}</li>
            <li><strong>ผู้ให้บริการที่ตั้งค่า:</strong> ${config.provider || 'Auto'}</li>
          </ul>
          <p style="color: #64748b; font-size: 13px; margin-top: 20px;">สภานักศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (มจพ.)</p>
        </div>
      `,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: `การส่งอีเมลล้มเหลว: ${result.error || 'โปรดตรวจสอบการตั้งค่า'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `ส่งอีเมลทดสอบไปยัง ${targetEmail} สำเร็จเรียบร้อยแล้ว (ผ่าน ${result.provider})`,
      provider: result.provider,
    });
  } catch (error: any) {
    console.error('Error in test-email:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการทดสอบส่งอีเมล' },
      { status: 500 }
    );
  }
}
