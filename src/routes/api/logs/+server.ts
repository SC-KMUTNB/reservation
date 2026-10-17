import { json, type RequestEvent } from '@sveltejs/kit';
import { prisma } from '$lib/prisma';
import { getSessionFromRequest } from '$lib/auth';
import { recordAuditLog } from '$lib/audit';

export async function GET(event: RequestEvent) {
	try {
		const session = await getSessionFromRequest(event);
		if (!session) {
			return json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
		}

		const searchParams = event.url.searchParams;
		const action = searchParams.get('action');
		const limit = parseInt(searchParams.get('limit') || '100', 10);

		const where: Record<string, unknown> = {};
		if (action && action !== 'ALL') {
			where.action = action;
		}

		const logs = await prisma.auditLog.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			take: Math.min(limit, 500),
			include: {
				booking: {
					select: {
						bookingCode: true,
						fullName: true,
						date: true
					}
				},
				user: {
					select: {
						fullName: true,
						email: true
					}
				}
			}
		});

		return json({ logs });
	} catch (error) {
		console.error('Error fetching audit logs:', error);
		return json({ error: 'ไม่สามารถดึงข้อมูลบันทึกการตรวจสอบได้' }, { status: 500 });
	}
}

export async function DELETE(event: RequestEvent) {
	try {
		const session = await getSessionFromRequest(event);
		if (!session) {
			return json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 });
		}
		if (session.role !== 'SUPER_ADMIN') {
			return json({ error: 'เฉพาะ Super Admin เท่านั้น' }, { status: 403 });
		}

		const searchParams = event.url.searchParams;
		const mode = searchParams.get('mode');
		const before = searchParams.get('before');

		let deletedCount = 0;

		if (mode === 'all') {
			const result = await prisma.auditLog.deleteMany({});
			deletedCount = result.count;
		} else if (mode === 'before' && before) {
			const beforeDate = new Date(before);
			if (isNaN(beforeDate.getTime())) {
				return json({ error: 'วันที่ไม่ถูกต้อง' }, { status: 400 });
			}
			const result = await prisma.auditLog.deleteMany({
				where: { createdAt: { lt: beforeDate } }
			});
			deletedCount = result.count;
		} else {
			return json(
				{
					error:
						'พารามิเตอร์ไม่ถูกต้อง ต้องระบุ mode=all หรือ mode=before&before=<date>'
				},
				{ status: 400 }
			);
		}

		const ip =
			event.request.headers.get('x-forwarded-for') ||
			event.request.headers.get('x-real-ip') ||
			'unknown';

		await recordAuditLog({
			action: 'AUDIT_LOGS_CLEARED',
			details:
				mode === 'all'
					? `Super Admin ล้างบันทึกการตรวจสอบทั้งหมด จำนวน ${deletedCount} รายการ`
					: `Super Admin ล้างบันทึกการตรวจสอบก่อนวันที่ ${before} จำนวน ${deletedCount} รายการ`,
			actorName: session.fullName,
			actorEmail: session.email,
			actorRole: session.role,
			ipAddress: ip,
			userId: session.id
		});

		return json({ success: true, deletedCount });
	} catch (error) {
		console.error('Error clearing audit logs:', error);
		return json({ error: 'ไม่สามารถล้างบันทึกการตรวจสอบได้' }, { status: 500 });
	}
}
