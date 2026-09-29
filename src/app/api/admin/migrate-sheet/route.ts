import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { migrateSheetHistory, MigrationMode } from '@/lib/sheet-migration';
import { recordAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'เฉพาะ Super Admin เท่านั้นที่สามารถนำเข้าประวัติการจองจากไฟล์ชีตได้' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawMode = String(body.mode || 'overwrite').toLowerCase();
    const mode: MigrationMode = rawMode === 'add' ? 'add' : 'overwrite';

    const result = await migrateSheetHistory({ mode });

    const modeText = mode === 'overwrite' ? 'เขียนทับข้อมูลเดิม (Overwrite)' : 'เพิ่มเฉพาะรายการใหม่ (Add into)';

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    await recordAuditLog({
      action: 'SHEET_HISTORY_MIGRATED',
      details: `${session.fullName} สั่งนำเข้าข้อมูลประวัติจาก Excel [โหมด: ${modeText}]: นำเข้าใหม่ ${result.imported} รายการ, อัปเดต ${result.updated} รายการ, ข้าม ${result.skipped} รายการ`,
      actorName: session.fullName,
      actorEmail: session.email,
      actorRole: session.role,
      ipAddress: ip,
      userId: session.id,
    });

    return NextResponse.json({
      success: true,
      message: `นำเข้าข้อมูลประวัติการจองสำเร็จ [โหมด: ${modeText}]`,
      result,
    });
  } catch (error: any) {
    console.error('Error migrating sheet history:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูลประวัติ' },
      { status: 500 }
    );
  }
}
