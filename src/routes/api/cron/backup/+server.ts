import { json, type RequestEvent } from '@sveltejs/kit';
import { createDatabaseBackup, pruneOldBackups } from '$lib/backup';
import { recordAuditLog } from '$lib/audit';

export async function GET(event: RequestEvent) {
	try {
		// Verify Vercel Cron Secret header
		const authHeader = event.request.headers.get('authorization');
		const cronSecret = process.env.CRON_SECRET;

		if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
			return json({ error: 'Unauthorized: invalid cron authorization' }, { status: 401 });
		}

		// 1. Create database backup to Vercel Blob
		const { backup, metadata } = await createDatabaseBackup('CRON');

		// 2. Prune old backups, retain last 30
		const prunedCount = await pruneOldBackups(30);

		// 3. Record system audit log
		const ip =
			event.request.headers.get('x-forwarded-for') ||
			event.request.headers.get('x-real-ip') ||
			'cron-internal';

		await recordAuditLog({
			action: 'CRON_BACKUP_CREATED',
			details: `สำรองข้อมูลอัตโนมัติสำเร็จ [Vercel Cron]: ไฟล์ ${backup.pathname} (ขนาด: ${(backup.size / 1024).toFixed(1)} KB), บันทึกการจอง: ${metadata.counts.bookings}, ผู้ใช้: ${metadata.counts.users}, ลบไฟล์เก่า: ${prunedCount} รายการ`,
			actorName: 'Vercel Cron System',
			actorEmail: 'system@cron',
			actorRole: 'SUPER_ADMIN',
			ipAddress: ip
		});

		return json({
			success: true,
			message: 'Automated database backup completed successfully',
			backup: {
				url: backup.url,
				pathname: backup.pathname,
				size: backup.size,
				uploadedAt: backup.uploadedAt
			},
			metadata,
			prunedCount
		});
	} catch (error: any) {
		console.error('Error executing automated database backup:', error);
		return json(
			{
				success: false,
				error: error.message || 'Internal server error during cron backup'
			},
			{ status: 500 }
		);
	}
}
