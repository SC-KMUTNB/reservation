import { json, type RequestEvent } from '@sveltejs/kit';
import { getSessionFromRequest, createSessionToken } from '$lib/auth';
import { prisma } from '$lib/prisma';
import { recordAuditLog } from '$lib/audit';

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,20}$/;

export async function GET(event: RequestEvent) {
	const session = await getSessionFromRequest(event);
	if (!session) {
		return json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
	}

	const rawUsername = event.url.searchParams.get('username') || '';
	const username = rawUsername.trim().toLowerCase();

	if (!username) {
		return json({ available: false, error: 'กรุณากรอกชื่อผู้ใช้' });
	}

	if (!USERNAME_REGEX.test(username)) {
		return json({
			available: false,
			error:
				'ความยาว 3-20 ตัวอักษร ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข และ _ . - เท่านั้น'
		});
	}

	const existing = await prisma.user.findFirst({
		where: {
			username,
			NOT: { id: session.id }
		},
		select: { id: true }
	});

	if (existing) {
		return json({
			available: false,
			error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น'
		});
	}

	return json({
		available: true,
		message: 'ชื่อผู้ใช้นี้สามารถใช้งานได้'
	});
}

export async function POST(event: RequestEvent) {
	try {
		const session = await getSessionFromRequest(event);
		if (!session) {
			return json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
		}

		const body = await event.request.json();
		const rawUsername = body.username || '';
		const cleanUsername = rawUsername.trim().toLowerCase();

		if (!cleanUsername) {
			return json(
				{ error: 'กรุณากรอกชื่อผู้ใช้ที่ต้องการตั้ง' },
				{ status: 400 }
			);
		}

		if (!USERNAME_REGEX.test(cleanUsername)) {
			return json(
				{
					error:
						'รูปแบบชื่อผู้ใช้ไม่ถูกต้อง: ต้องมีความยาว 3-20 ตัวอักษร และประกอบด้วยตัวอักษรภาษาอังกฤษ ตัวเลข _ . - เท่านั้น'
				},
				{ status: 400 }
			);
		}

		const existing = await prisma.user.findFirst({
			where: {
				username: cleanUsername,
				NOT: { id: session.id }
			},
			select: { id: true }
		});

		if (existing) {
			return json(
				{ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น' },
				{ status: 409 }
			);
		}

		const currentUser = await prisma.user.findUnique({
			where: { id: session.id },
			select: {
				id: true,
				email: true,
				username: true,
				fullName: true,
				role: true
			}
		});

		if (!currentUser) {
			return json({ error: 'ไม่พบผู้ใช้ในระบบ' }, { status: 404 });
		}

		const oldUsername = currentUser.username;

		const updatedUser = await prisma.user.update({
			where: { id: session.id },
			data: { username: cleanUsername },
			select: {
				id: true,
				email: true,
				username: true,
				fullName: true,
				role: true
			}
		});

		const token = await createSessionToken({
			id: updatedUser.id,
			email: updatedUser.email,
			username: updatedUser.username,
			fullName: updatedUser.fullName,
			role: updatedUser.role
		});

		const ip =
			event.request.headers.get('x-forwarded-for') ||
			event.request.headers.get('x-real-ip') ||
			'127.0.0.1';

		await recordAuditLog({
			action: oldUsername ? 'USERNAME_UPDATED' : 'USERNAME_CLAIMED',
			details: oldUsername
				? `แอดมินเปลี่ยนชื่อผู้ใช้จาก @${oldUsername} เป็น @${cleanUsername} (${updatedUser.fullName})`
				: `แอดมินตั้งชื่อผู้ใช้ครั้งแรก @${cleanUsername} (${updatedUser.fullName})`,
			actorName: updatedUser.fullName,
			actorEmail: updatedUser.email,
			actorRole: updatedUser.role,
			ipAddress: ip,
			userId: updatedUser.id
		});

		event.cookies.set('admin_token', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
			maxAge: 60 * 60 * 24 * 7
		});

		return json({
			success: true,
			message: 'บันทึกชื่อผู้ใช้เรียบร้อยแล้ว',
			user: updatedUser
		});
	} catch (error) {
		console.error('Error claiming username:', error);
		return json(
			{ error: 'เกิดข้อผิดพลาดในการบันทึกชื่อผู้ใช้' },
			{ status: 500 }
		);
	}
}
