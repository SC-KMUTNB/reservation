import { json, type RequestEvent } from '@sveltejs/kit';
import { getSessionFromRequest } from '$lib/auth';
import { restoreDatabase, type RestoreMode } from '$lib/restore';
import { recordAuditLog } from '$lib/audit';
import { get } from '@vercel/blob';

export async function POST(event: RequestEvent) {
	try {
		const session = await getSessionFromRequest(event);
		if (!session || session.role !== 'SUPER_ADMIN') {
			return json(
				{ error: 'เฉพาะ Super Admin เท่านั้นที่สามารถกู้คืนฐานข้อมูล (Restore) ได้' },
				{ status: 403 }
			);
		}

		let backupPayload: any = null;
		let mode: RestoreMode = 'merge';
		let confirmText = '';
		let sourceLabel = '';

		const contentType = event.request.headers.get('content-type') || '';

		if (contentType.includes('multipart/form-data')) {
			// Uploaded file from device
			const formData = await event.request.formData();
			const file = formData.get('file') as File | null;
			const rawMode = String(formData.get('mode') || 'merge').toLowerCase();
			mode = rawMode === 'replace' ? 'replace' : 'merge';
			confirmText = String(formData.get('confirmText') || '');

			if (!file || typeof file.text !== 'function') {
				return json({ error: 'ไม่พบไฟล์สำรองข้อมูล JSON ที่อัปโหลด' }, { status: 400 });
			}

			sourceLabel = `ไฟล์อัปโหลด: ${file.name}`;
			const text = await file.text();
			try {
				backupPayload = JSON.parse(text);
			} catch {
				return json({ error: 'รูปแบบไฟล์ไม่ถูกต้อง ไม่ใช่ JSON ที่สมบูรณ์' }, { status: 400 });
			}
		} else {
			// Restore from Vercel Blob URL or direct JSON payload
			const body = await event.request.json().catch(() => ({}));
			const rawMode = String(body.mode || 'merge').toLowerCase();
			mode = rawMode === 'replace' ? 'replace' : 'merge';
			confirmText = String(body.confirmText || '');

			const { blobUrl, pathname, data } = body;

			if (data) {
				backupPayload = data;
				sourceLabel = 'ข้อมูล JSON ส่งตรงจากเซิร์ฟเวอร์';
			} else if (blobUrl || pathname) {
				const token = process.env.BLOB_READ_WRITE_TOKEN;
				if (!token) {
					return json({ error: 'ไม่ได้กำหนดค่า BLOB_READ_WRITE_TOKEN' }, { status: 500 });
				}

				const target = blobUrl || pathname;
				sourceLabel = `Vercel Blob: ${pathname || blobUrl}`;

				let result;
				try {
					result = await get(target, { access: 'private', token });
				} catch (e: any) {
					if (e?.message?.includes('access')) {
						result = await get(target, { access: 'public', token });
					} else {
						throw e;
					}
				}

				if (!result || !result.stream) {
					return json({ error: 'ไม่สามารถดึงไฟล์สำรองข้อมูลจาก Vercel Blob ได้' }, { status: 404 });
				}

				const chunks: Uint8Array[] = [];
				for await (const chunk of result.stream as any) {
					chunks.push(chunk);
				}
				const buffer = Buffer.concat(chunks);
				backupPayload = JSON.parse(buffer.toString('utf-8'));
			} else {
				return json({ error: 'กรุณาระบุ blobUrl หรืออัปโหลดไฟล์สำรองข้อมูล' }, { status: 400 });
			}
		}

		// Security guard for replace mode
		if (mode === 'replace' && confirmText.trim().toUpperCase() !== 'RESTORE') {
			return json(
				{ error: 'โหมดล้างข้อมูลเดิม (Clean Replace) จำเป็นต้องพิมพ์คำว่า "RESTORE" เพื่อยืนยันความปลอดภัย' },
				{ status: 400 }
			);
		}

		// Execute restore
		const result = await restoreDatabase(backupPayload, mode);

		const ip =
			event.request.headers.get('x-forwarded-for') ||
			event.request.headers.get('x-real-ip') ||
			'127.0.0.1';

		const modeText = mode === 'replace' ? 'ล้างและแทนที่ข้อมูลทั้งหมด (Clean Replace)' : 'รวมข้อมูลเดิม (Merge & Upsert)';

		await recordAuditLog({
			action: 'DATABASE_RESTORED',
			details: `${session.fullName} กู้คืนฐานข้อมูล [${sourceLabel}] ในโหมด "${modeText}": กู้คืนการจอง ${result.restoredBookings} รายการ, ตั้งค่า ${result.restoredSettings} รายการ, บันทึกการตรวจสอบ ${result.restoredAuditLogs} รายการ`,
			actorName: session.fullName,
			actorEmail: session.email,
			actorRole: session.role,
			ipAddress: ip,
			userId: session.id
		});

		return json({
			success: true,
			message: `กู้คืนฐานข้อมูลสำเร็จ [โหมด: ${modeText}]`,
			result
		});
	} catch (error: any) {
		console.error('Error executing database restore:', error);
		return json(
			{ error: error.message || 'เกิดข้อผิดพลาดในการกู้คืนฐานข้อมูล' },
			{ status: 500 }
		);
	}
}
