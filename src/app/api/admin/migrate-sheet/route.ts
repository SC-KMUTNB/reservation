import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { migrateSheetHistory, MigrationMode } from '@/lib/sheet-migration';
import { recordAuditLog } from '@/lib/audit';
import { BookingStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'เฉพาะ Super Admin เท่านั้นที่สามารถนำเข้าประวัติการจองจากไฟล์ชีตได้' },
        { status: 403 }
      );
    }

    let mode: MigrationMode = 'overwrite';
    let defaultStatus: BookingStatus = BookingStatus.PENDING;
    let buffer: Buffer | undefined;
    let fileName = 'sheetexample (ไฟล์เริ่มต้นในระบบ)';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const rawMode = String(formData.get('mode') || 'overwrite').toLowerCase();
      mode = rawMode === 'add' ? 'add' : 'overwrite';

      const rawDefaultStatus = String(formData.get('defaultStatus') || '').toUpperCase();
      if (['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(rawDefaultStatus)) {
        defaultStatus = rawDefaultStatus as BookingStatus;
      }

      if (file && typeof file.arrayBuffer === 'function' && file.size > 0) {
        fileName = file.name || 'uploaded.xlsx';
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }
    } else {
      const body = await request.json().catch(() => ({}));
      const rawMode = String(body.mode || 'overwrite').toLowerCase();
      mode = rawMode === 'add' ? 'add' : 'overwrite';

      const rawDefaultStatus = String(body.defaultStatus || '').toUpperCase();
      if (['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(rawDefaultStatus)) {
        defaultStatus = rawDefaultStatus as BookingStatus;
      }
    }

    const result = await migrateSheetHistory({
      buffer,
      fileName,
      mode,
      defaultStatus,
    });

    const modeText = mode === 'overwrite' ? 'เขียนทับข้อมูลเดิม (Overwrite)' : 'เพิ่มเฉพาะรายการใหม่ (Add into)';

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    await recordAuditLog({
      action: 'SHEET_HISTORY_MIGRATED',
      details: `${session.fullName} นำเข้าข้อมูลประวัติจาก [${result.source}] โหมด: ${modeText}: นำเข้าใหม่ ${result.imported} รายการ, อัปเดต ${result.updated} รายการ, ข้าม ${result.skipped} รายการ (อนุมัติ: ${result.statusBreakdown.APPROVED}, รออนุมัติ: ${result.statusBreakdown.PENDING}, ปฏิเสธ: ${result.statusBreakdown.REJECTED})`,
      actorName: session.fullName,
      actorEmail: session.email,
      actorRole: session.role,
      ipAddress: ip,
      userId: session.id,
    });

    return NextResponse.json({
      success: true,
      message: `นำเข้าข้อมูลประวัติการจองสำเร็จ [แหล่งที่มา: ${result.source}]`,
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
