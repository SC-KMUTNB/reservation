import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import {
  encryptSecret,
  isEncrypted,
  maskSecret,
  SENSITIVE_SETTING_KEYS,
} from '@/lib/encryption';
import { getFacilityConfig, saveFacilityConfig } from '@/lib/facility-config';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    const isSuperAdmin = session?.role === 'SUPER_ADMIN';

    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          not: 'facility_config_json',
        },
      },
    });
    const settingsMap: Record<string, string> = {};

    for (const s of settings) {
      if (s.key === 'facility_config_json') {
        continue;
      }
      if (SENSITIVE_SETTING_KEYS.includes(s.key)) {
        if (isSuperAdmin) {
          // If a value exists, return masked placeholder so client knows it is configured
          settingsMap[s.key] = s.value ? maskSecret(s.value) : '';
        }
        // If not super admin, omit completely
      } else {
        settingsMap[s.key] = s.value;
      }
    }

    const facilityConfig = await getFacilityConfig();

    return NextResponse.json({ settings: settingsMap, isSuperAdmin, facilityConfig });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลการตั้งค่าได้' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'เฉพาะ Super Admin เท่านั้นที่สามารถแก้ไขการตั้งค่าระบบได้' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { settings, facilityConfig } = body;

    let savedFacilityConfig = null;
    if (facilityConfig && typeof facilityConfig === 'object') {
      savedFacilityConfig = await saveFacilityConfig(facilityConfig);
    }

    if (settings && typeof settings === 'object') {
      for (const [key, rawValue] of Object.entries(settings)) {
        // Prevent raw settings object from ever overwriting the dynamic facility configuration
        if (key === 'facility_config_json') {
          continue;
        }

        const stringValue = String(rawValue ?? '').trim();

        if (SENSITIVE_SETTING_KEYS.includes(key)) {
          // If masked (starts with ••••), admin did not change the existing secret -> do not overwrite
          if (stringValue.startsWith('••')) {
            continue;
          }

          let valueToSave = '';
          if (stringValue) {
            valueToSave = encryptSecret(stringValue);
          }

          await prisma.siteSetting.upsert({
            where: { key },
            update: { value: valueToSave },
            create: {
              key,
              value: valueToSave,
            },
          });
        } else {
          await prisma.siteSetting.upsert({
            where: { key },
            update: { value: stringValue },
            create: {
              key,
              value: stringValue,
            },
          });
        }
      }
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    await recordAuditLog({
      action: 'SETTINGS_UPDATED',
      details: `${session.fullName} (Super Admin) ได้อัปเดตการตั้งค่าระบบ การเชื่อมต่ออีเมล และ Google Sheets`,
      actorName: session.fullName,
      actorEmail: session.email,
      actorRole: session.role,
      ipAddress: ip,
      userId: session.id,
    });

    return NextResponse.json({
      success: true,
      message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว',
      facilityConfig: savedFacilityConfig,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'ไม่สามารถบันทึกการตั้งค่าได้' }, { status: 500 });
  }
}
