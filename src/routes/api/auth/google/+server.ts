import { redirect, type RequestEvent } from '@sveltejs/kit';
import { getSessionFromRequest } from '$lib/auth';
import { SignJWT } from 'jose';
import { getAppBaseUrl } from '$lib/app-url';

const STATE_SECRET = new TextEncoder().encode(
	process.env.JWT_SECRET || 'dev-fallback-secret-key-kmutnb-reservation-only'
);

export async function GET(event: RequestEvent) {
	const searchParams = event.url.searchParams;
	const action = searchParams.get('action') || 'login';

	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

	const origin = await getAppBaseUrl(event.url.origin);
	const redirectUri = `${origin}/api/auth/google/callback`;

	if (!clientId || !clientSecret) {
		const errorRedirect =
			action === 'link'
				? '/admin/profile?error=GOOGLE_NOT_CONFIGURED'
				: '/admin/login?error=GOOGLE_NOT_CONFIGURED';
		throw redirect(303, errorRedirect);
	}

	let userId: string | null = null;
	if (action === 'link') {
		const session = await getSessionFromRequest(event);
		if (!session) {
			throw redirect(303, '/admin/login?error=AUTH_REQUIRED');
		}
		userId = session.id;
	}

	const stateToken = await new SignJWT({
		action,
		userId,
		nonce: Math.random().toString(36).substring(2)
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('10m')
		.sign(STATE_SECRET);

	event.cookies.set('oauth_state', stateToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 600,
		path: '/'
	});

	const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
	googleAuthUrl.searchParams.set('client_id', clientId);
	googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
	googleAuthUrl.searchParams.set('response_type', 'code');
	googleAuthUrl.searchParams.set('scope', 'openid email profile');
	googleAuthUrl.searchParams.set('state', stateToken);
	googleAuthUrl.searchParams.set('prompt', 'select_account');
	googleAuthUrl.searchParams.set('hd', 'email.kmutnb.ac.th');

	throw redirect(303, googleAuthUrl.toString());
}
