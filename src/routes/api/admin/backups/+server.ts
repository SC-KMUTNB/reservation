import { json, type RequestEvent } from '@sveltejs/kit';
import { getSessionFromRequest } from '$lib/auth';
import { createDatabaseBackup, listBackups, deleteBackup, pruneOldBackups } from '$lib/backup';
import { recordAuditLog } from '$lib/audit';

/**
 * GET: List backups from Vercel Blob
 */
export async function GET(event: RequestEvent) {
	try {
		const session = await getSessionFromRequest(event);
		if (!session) {
			return json({ error: 'ไม่ได้รับอนุญาต (กรุณาเข้าสู่ระบบแอดมิน)' }, { status: 401 });
		}

		const isConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
		if (!isConfigured) {
			return json({
				configured: false,
				backups: [],
				message: 'ยังไม่ได้กำหนดค่า BLOB_READ_WRITE_TOKEN ใน Environment Variables'
			});
		}

		const backups = await listBackups();

		return json({
			configured: true,
			backups
		});
	} catch (error: any) {
		console.error('Error fetching backups:', error);
		return json({ error: error.message || 'เกิดข้อผิดพลาดในการดึงรายการสำรองข้อมูล' }, { status: 500 });
	}
}

/**
 * POST: Trigger manual backup to Vercel Blob
 */
export async function POST(event: RequestEvent) {
	try {
		const session = await getSessionFromRequest(event);
		if (!session || session.role !== 'SUPER_ADMIN') {
			return json({ error: 'เฉพาะ Super Admin เท่านั้นที่สามารถสร้างไฟล์สำรองข้อมูลได้' }, { status: 403 });
		}

		if (!process.env.BLOB_READ_WRITE_TOKEN) {
			return json(
				{ error: 'ยังไม่ได้ตั้งค่า BLOB_READ_WRITE_TOKEN กรุณาเปิดใช้งาน Vercel Blob ใน Dashboard' },
				{ status: 400 }
			);
		}

		const { backup, metadata } = await createDatabaseBackup('MANUAL');
		const prunedCount = await pruneOldBackups(30);

		const ip =
			event.request.headers.get('x-forwarded-for') ||
			event.request.headers.get('x-real-ip') ||
			'127.0.0.1';

		await recordAuditLog({
			action: 'MANUAL_BACKUP_CREATED',
			details: `${session.fullName} สร้างไฟล์สำรองข้อมูลฐานข้อมูล [Vercel Blob]: ${backup.pathname} (ขนาด: ${(backup.size / 1024).toFixed(1)} KB), ข้อมูลการจอง: ${metadata.counts.bookings} รายการ, ลบไฟล์เก่า: ${prunedCount} รายการ`,
			actorName: session.fullName,
			actorEmail: session.email,
			actorRole: session.role,
			ipAddress: ip,
			userId: session.id
		});

		return json({
			success: true,
			message: 'สร้างไฟล์สำรองข้อมูลฐานข้อมูลลง Vercel Blob สำเร็จ',
			backup,
			metadata,
			prunedCount
		});
	} catch (error: any) {
		console.error('Error creating manual backup:', error);
		return json({ error: error.message || 'เกิดข้อผิดพลาดในการสร้างไฟล์สำรองข้อมูล' }, { status: 500 });
	}
}

/**
 * DELETE: Delete a specific backup by url
 */
export async function DELETE(event: RequestEvent) {
	try {
		const session = await getSessionFromRequest(event);
		if (!session || session.role !== 'SUPER_ADMIN') {
			return json({ error: 'เฉพาะ Super Admin เท่านั้นที่สามารถลบไฟล์สำรองข้อมูลได้' }, { status: 403 });
		}

		const body = await event.request.json().catch(() => ({}));
		const { url } = body;

		if (!url || typeof url !== 'string') {
			return json({ error: 'ไม่พบ URL ของไฟล์ที่ต้องการลบ' }, { status: 400 });
		}

		await deleteBackup(url);

		const ip =
			event.request.headers.get('x-forwarded-for') ||
			event.request.headers.get('x-real-ip') ||
			'127.0.0.1';

		await recordAuditLog({
			action: 'BACKUP_DELETED',
			details: `${session.fullName} ลบไฟล์สำรองข้อมูลฐานข้อมูล: ${url}`,
			actorName: session.fullName,
			actorEmail: session.email,
			actorRole: session.role,
			ipAddress: ip,
			userId: session.id
		});

		return json({
			success: true,
			message: 'ลบไฟล์สำรองข้อมูลสำเร็จ'
		});
	} catch (error: any) {
		console.error('Error deleting backup:', error);
		return json({ error: error.message || 'เกิดข้อผิดพลาดในการลบไฟล์สำรองข้อมูล' }, { status: 500 });
	}
}
