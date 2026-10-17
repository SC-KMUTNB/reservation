import { json, type RequestEvent } from '@sveltejs/kit';
import { getSessionFromRequest } from '$lib/auth';
import { prisma } from '$lib/prisma';
import { recordAuditLog } from '$lib/audit';

export async function POST(event: RequestEvent) {
	try {
		const session = await getSessionFromRequest(event);
		if (!session) {
			return json({ error: 'ไม่ได้รับอนุญาต (กรุณาเข้าสู่ระบบ)' }, { status: 401 });
		}

		const user = await prisma.user.findUnique({
			where: { id: session.id }
		});

		if (!user) {
			return json({ error: 'ไม่พบผู้ใช้ในระบบ' }, { status: 404 });
		}

		if (!user.googleId) {
			return json({ error: 'บัญชีนี้ยังไม่ได้ผูกกับ Google' }, { status: 400 });
		}

		const previousGoogleEmail = user.googleEmail;

		await prisma.user.update({
			where: { id: session.id },
			data: {
				googleId: null,
				googleEmail: null
			}
		});

		const ip =
			event.request.headers.get('x-forwarded-for') ||
			event.request.headers.get('x-real-ip') ||
			'127.0.0.1';

		await recordAuditLog({
			action: 'GOOGLE_ACCOUNT_UNLINKED',
			details: `${user.fullName} ได้ยกเลิกการผูกบัญชี Google (${previousGoogleEmail || '-'}) ออกจากบัญชีผู้ดูแลระบบ`,
			actorName: user.fullName,
			actorEmail: user.email,
			actorRole: user.role,
			ipAddress: ip,
			userId: user.id
		});

		return json({
			success: true,
			message: 'ยกเลิกการผูกบัญชี Google เรียบร้อยแล้ว'
		});
	} catch (error) {
		console.error('Error unlinking Google account:', error);
		return json({ error: 'เกิดข้อผิดพลาดในการยกเลิกการผูกบัญชี' }, { status: 500 });
	}
}
