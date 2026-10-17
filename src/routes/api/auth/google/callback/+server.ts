import { redirect, type RequestEvent } from '@sveltejs/kit';
import { prisma } from '$lib/prisma';
import { createSessionToken } from '$lib/auth';
import { recordAuditLog } from '$lib/audit';
import { jwtVerify } from 'jose';
import { getAppBaseUrl } from '$lib/app-url';

const STATE_SECRET = new TextEncoder().encode(
	process.env.JWT_SECRET || 'dev-fallback-secret-key-kmutnb-reservation-only'
);

export async function GET(event: RequestEvent) {
	const searchParams = event.url.searchParams;
	const code = searchParams.get('code');
	const stateToken = searchParams.get('state');
	const errorParam = searchParams.get('error');

	const origin = await getAppBaseUrl(event.url.origin);
	const redirectUri = `${origin}/api/auth/google/callback`;

	if (errorParam) {
		throw redirect(303, '/admin/login?error=GOOGLE_CANCELLED');
	}

	if (!code || !stateToken) {
		throw redirect(303, '/admin/login?error=INVALID_OAUTH_REQUEST');
	}

	let statePayload: any = null;
	try {
		const { payload } = await jwtVerify(stateToken, STATE_SECRET);
		statePayload = payload;
	} catch (e) {
		console.error('Invalid OAuth state:', e);
		throw redirect(303, '/admin/login?error=INVALID_OAUTH_STATE');
	}

	const action = statePayload.action || 'login';
	const targetUserId = statePayload.userId;

	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		const errorTarget =
			action === 'link'
				? '/admin/profile?error=GOOGLE_NOT_CONFIGURED'
				: '/admin/login?error=GOOGLE_NOT_CONFIGURED';
		throw redirect(303, errorTarget);
	}

	try {
		const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: redirectUri,
				grant_type: 'authorization_code'
			})
		});

		const tokenData = await tokenRes.json();
		if (!tokenRes.ok || !tokenData.access_token) {
			console.error('Failed to exchange Google token:', tokenData);
			const errorTarget =
				action === 'link'
					? '/admin/profile?error=TOKEN_EXCHANGE_FAILED'
					: '/admin/login?error=TOKEN_EXCHANGE_FAILED';
			throw redirect(303, errorTarget);
		}

		const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
			headers: { Authorization: `Bearer ${tokenData.access_token}` }
		});

		const profile = await profileRes.json();
		if (!profileRes.ok || !profile.sub || !profile.email) {
			console.error('Failed to fetch Google profile:', profile);
			const errorTarget =
				action === 'link'
					? '/admin/profile?error=PROFILE_FETCH_FAILED'
					: '/admin/login?error=PROFILE_FETCH_FAILED';
			throw redirect(303, errorTarget);
		}

		const googleId = profile.sub;
		const googleEmail = profile.email.toLowerCase().trim();

		if (!googleEmail.endsWith('@email.kmutnb.ac.th')) {
			const errorTarget =
				action === 'link'
					? `/admin/profile?error=INVALID_DOMAIN&attemptedEmail=${encodeURIComponent(googleEmail)}`
					: `/admin/login?error=INVALID_DOMAIN&attemptedEmail=${encodeURIComponent(googleEmail)}`;
			throw redirect(303, errorTarget);
		}

		const ip =
			event.request.headers.get('x-forwarded-for') ||
			event.request.headers.get('x-real-ip') ||
			'127.0.0.1';

		if (action === 'link' && targetUserId) {
			const existingWithGoogle = await prisma.user.findFirst({
				where: {
					googleId,
					id: { not: targetUserId }
				}
			});

			if (existingWithGoogle) {
				throw redirect(303, '/admin/profile?error=ALREADY_LINKED_TO_OTHER');
			}

			const updatedUser = await prisma.user.update({
				where: { id: targetUserId },
				data: {
					googleId,
					googleEmail
				}
			});

			await recordAuditLog({
				action: 'GOOGLE_ACCOUNT_LINKED',
				details: `${updatedUser.fullName} ได้ผูกบัญชี Google (${googleEmail}) เข้ากับบัญชีผู้ดูแลระบบ`,
				actorName: updatedUser.fullName,
				actorEmail: updatedUser.email,
				actorRole: updatedUser.role,
				ipAddress: ip,
				userId: updatedUser.id
			});

			event.cookies.delete('oauth_state', { path: '/' });
			throw redirect(303, '/admin/profile?success=LINKED');
		}

		const user = await prisma.user.findUnique({
			where: { googleId },
			select: {
				id: true,
				email: true,
				username: true,
				fullName: true,
				role: true,
				isActive: true
			}
		});

		if (!user) {
			throw redirect(
				303,
				`/admin/login?error=NOT_LINKED&attemptedEmail=${encodeURIComponent(googleEmail)}`
			);
		}

		if (!user.isActive) {
			throw redirect(303, '/admin/login?error=ACCOUNT_SUSPENDED');
		}

		const token = await createSessionToken({
			id: user.id,
			email: user.email,
			fullName: user.fullName,
			role: user.role
		});

		await recordAuditLog({
			action: 'ADMIN_LOGIN_GOOGLE',
			details: `${user.fullName} (${user.email}) เข้าสู่ระบบผ่าน Google OAuth (${googleEmail}) สำเร็จ`,
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
			maxAge: 60 * 60 * 24 * 7,
			path: '/'
		});
		event.cookies.delete('oauth_state', { path: '/' });

		throw redirect(303, '/admin/dashboard');
	} catch (error: any) {
		if (error?.status && error?.location) {
			throw error;
		}
		console.error('Error handling Google OAuth callback:', error);
		const errorTarget =
			action === 'link'
				? '/admin/profile?error=SERVER_ERROR'
				: '/admin/login?error=SERVER_ERROR';
		throw redirect(303, errorTarget);
	}
}
