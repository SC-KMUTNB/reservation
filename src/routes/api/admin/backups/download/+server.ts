import { json, type RequestEvent } from '@sveltejs/kit';
import { getSessionFromRequest } from '$lib/auth';
import { get } from '@vercel/blob';

export async function GET(event: RequestEvent) {
	try {
		const session = await getSessionFromRequest(event);
		if (!session || session.role !== 'SUPER_ADMIN') {
			return json({ error: 'เฉพาะ Super Admin เท่านั้นที่สามารถดาวน์โหลดไฟล์สำรองข้อมูลได้' }, { status: 403 });
		}

		const token = process.env.BLOB_READ_WRITE_TOKEN;
		if (!token) {
			return json({ error: 'ยังไม่ได้กำหนดค่า BLOB_READ_WRITE_TOKEN' }, { status: 500 });
		}

		const url = event.url.searchParams.get('url');
		const pathname = event.url.searchParams.get('pathname');

		const target = url || pathname;
		if (!target) {
			return json({ error: 'ไม่พบ URL หรือ pathname ของไฟล์ที่ต้องการดาวน์โหลด' }, { status: 400 });
		}

		// Try private access first, fallback to public
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
			return json({ error: 'ไม่พบไฟล์สำรองข้อมูลที่ระบุ' }, { status: 404 });
		}

		const fileName = (pathname || target).split('/').pop() || 'backup.json';

		return new Response(result.stream as any, {
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename="${fileName}"`,
				'Cache-Control': 'no-store'
			}
		});
	} catch (error: any) {
		console.error('Error downloading backup:', error);
		return json({ error: error.message || 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์สำรองข้อมูล' }, { status: 500 });
	}
}
