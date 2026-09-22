import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const settings = await prisma.siteSetting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }
    return NextResponse.json({ settings: settingsMap, raw: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลการตั้งค่าได้' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'เฉพาะ Super Admin เท่านั้นที่สามารถแก้ไขการตั้งค่าระบบได้' }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    for (const [key, value] of Object.entries(settings)) {
      await prisma.siteSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: {
          key,
          value: String(value),
        },
      });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    await recordAuditLog({
      action: 'SETTINGS_UPDATED',
      details: `${session.fullName} ได้อัปเดตการตั้งค่าระบบและช่องทางโซเชียลมีเดีย`,
      actorName: session.fullName,
      actorEmail: session.email,
      actorRole: session.role,
      ipAddress: ip,
      userId: session.id,
    });

    return NextResponse.json({ success: true, message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'ไม่สามารถบันทึกการตั้งค่าได้' }, { status: 500 });
  }
}
