import { json, type RequestEvent } from '@sveltejs/kit';
import { getSessionFromRequest } from '$lib/auth';
import { dispatchWebhookEvent } from '$lib/webhook-notify';

export async function POST(event: RequestEvent) {
	try {
		const session = await getSessionFromRequest(event);
		if (!session) {
			return json(
				{ error: 'ไม่ได้รับอนุญาต (กรุณาเข้าสู่ระบบแอดมิน)' },
				{ status: 401 }
			);
		}

		const testBooking = {
			bookingCode: 'KMUTNB-TEST-WEBHOOK',
			fullName: session.fullName,
			studentId: 'TEST-ADMIN',
			department: 'คณะทำงานผู้ดูแลระบบ สภานักศึกษา',
			date: new Date().toISOString().split('T')[0],
			startTime: '09:00',
			endTime: '10:00',
			reason: 'ทดสอบการยิง Webhook จากหน้าตั้งค่าระบบ'
		};

		const result = await dispatchWebhookEvent('TEST', testBooking);

		return json({
			success: result.success,
			message: 'ส่งการแจ้งเตือน Webhook ทดสอบเรียบร้อยแล้ว',
			details: result
		});
	} catch (error: any) {
		console.error('Error testing webhook:', error);
		return json(
			{ error: error?.message || 'เกิดข้อผิดพลาดในการทดสอบ Webhook' },
			{ status: 500 }
		);
	}
}
