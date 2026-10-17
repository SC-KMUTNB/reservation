import { json, type RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	event.cookies.delete('admin_token', { path: '/' });
	return json({ success: true, message: 'ออกจากระบบสำเร็จ' });
}
