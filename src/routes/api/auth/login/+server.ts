import { json, type RequestEvent } from '@sveltejs/kit';
import { prisma } from '$lib/prisma';
import bcrypt from 'bcryptjs';
import { createSessionToken } from '$lib/auth';
import { recordAuditLog } from '$lib/audit';
import { checkRateLimit, getSafeClientIp, rateLimitResponse } from '$lib/rate-limit';

export async function POST(event: RequestEvent) {
	try {
		const ip = getSafeClientIp(event);
		const ipLimitResult = checkRateLimit(`login:${ip}`, 20, 15 * 60 * 1000);
		if (!ipLimitResult.allowed) {
			await recordAuditLog({
				action: 'LOGIN_RATE_LIMITED',
				details: `จำกัดอัตราการเข้าสู่ระบบ: พยายามเข้าสู่ระบบเกิน 20 ครั้งใน 15 นาทีจาก IP ${ip}`,
				actorName: 'ระบบรักษาความปลอดภัย',
				actorRole: 'SYSTEM',
				ipAddress: ip
			});
			return rateLimitResponse(ipLimitResult);
		}

		const body = await event.request.json();
		const { email, username, identifier, password } = body;
		const loginTarget = (identifier || username || email || '').trim();

		if (!loginTarget || !password) {
			return json(
				{ error: 'กรุณากรอกชื่อผู้ใช้หรืออีเมล และรหัสผ่านให้ครบถ้วน' },
				{ status: 400 }
			);
		}

		const cleanTarget = loginTarget.toLowerCase();
		const targetLimitResult = checkRateLimit(`login:target:${cleanTarget}`, 5, 15 * 60 * 1000);
		if (!targetLimitResult.allowed) {
			await recordAuditLog({
				action: 'LOGIN_RATE_LIMITED',
				details: `จำกัดอัตราการเข้าสู่ระบบ: พยายามเข้าสู่ระบบบัญชี ${cleanTarget} เกิน 5 ครั้งใน 15 นาทีจาก IP ${ip}`,
				actorName: 'ระบบรักษาความปลอดภัย',
				actorRole: 'SYSTEM',
				ipAddress: ip
			});
			return rateLimitResponse(targetLimitResult);
		}

		const user = await prisma.user.findFirst({
			where: {
				OR: [{ email: cleanTarget }, { username: cleanTarget }]
			},
			select: {
				id: true,
				email: true,
				username: true,
				fullName: true,
				passwordHash: true,
				role: true,
				isActive: true
			}
		});

		if (!user || !user.isActive) {
			await recordAuditLog({
				action: 'LOGIN_FAILED',
				details: `เข้าสู่ระบบไม่สำเร็จ: ไม่พบบัญชีหรือบัญชีถูกระงับ (${cleanTarget})`,
				actorName: cleanTarget,
				actorEmail: cleanTarget.includes('@') ? cleanTarget : undefined,
				actorRole: 'UNKNOWN',
				ipAddress: ip
			});
			return json(
				{ error: 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับ' },
				{ status: 401 }
			);
		}

		const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
		if (!isPasswordValid) {
			await recordAuditLog({
				action: 'LOGIN_FAILED',
				details: `เข้าสู่ระบบไม่สำเร็จ: รหัสผ่านไม่ถูกต้องสำหรับบัญชี ${user.fullName} (${user.email})`,
				actorName: user.fullName,
				actorEmail: user.email,
				actorRole: user.role,
				ipAddress: ip,
				userId: user.id
			});
			return json(
				{ error: 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง' },
				{ status: 401 }
			);
		}

		const token = await createSessionToken({
			id: user.id,
			email: user.email,
			username: user.username,
			fullName: user.fullName,
			role: user.role
		});

		await recordAuditLog({
			action: 'ADMIN_LOGIN',
			details: `แอดมินเข้าสู่ระบบสำเร็จ (${user.fullName} / ${user.username ? `@${user.username}` : user.email})`,
			actorName: user.fullName,
			actorEmail: user.email,
			actorRole: user.role,
			ipAddress: ip,
			userId: user.id
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
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				fullName: user.fullName,
				role: user.role
			}
		});
	} catch (error) {
		console.error('Login error:', error);
		return json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 });
	}
}
