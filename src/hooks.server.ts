import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { jwtVerify } from 'jose';

const JWT_SECRET_STRING =
	process.env.JWT_SECRET ||
	(process.env.NODE_ENV === 'test'
		? 'test-fallback-secret-key-kmutnb-reservation-32chars!'
		: '');
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET_STRING);

async function verifyAdminToken(token?: string | null) {
	if (!token) return null;
	try {
		const { payload } = await jwtVerify(token, SECRET_KEY);
		return payload as unknown as App.Locals['user'];
	} catch {
		return null;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname, searchParams } = event.url;

	// Populate event.locals.user if admin_token exists
	const token = event.cookies.get('admin_token');
	const user = await verifyAdminToken(token);
	if (user) {
		event.locals.user = user;
	}

	// Skip API routes, static assets, etc.
	if (
		pathname.startsWith('/api') ||
		pathname.startsWith('/_app') ||
		pathname.startsWith('/favicon') ||
		pathname.includes('.')
	) {
		return resolve(event);
	}

	// --- Admin Route Protection ---
	const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/m/admin');
	if (isAdminPath) {
		const isMobileAdmin = pathname.startsWith('/m/admin');
		const loginPath = isMobileAdmin ? '/m/admin/login' : '/admin/login';
		const dashboardPath = isMobileAdmin ? '/m/admin/dashboard' : '/admin/dashboard';
		const isLoginPage = pathname === '/admin/login' || pathname === '/m/admin/login';
		const isSetupPage =
			pathname === '/admin/setup-password' || pathname === '/m/admin/setup-password';

		const isAuthenticated = !!user;

		if (isLoginPage) {
			if (isAuthenticated) {
				throw redirect(303, dashboardPath);
			}
		} else if (!isSetupPage) {
			if (!isAuthenticated) {
				const fullPath = pathname + event.url.search;
				event.cookies.delete('admin_token', { path: '/' });
				throw redirect(303, `${loginPath}?callbackUrl=${encodeURIComponent(fullPath)}`);
			}
		}
	}

	// Handle explicit view preference override from query parameter ?view=desktop or ?view=mobile
	const explicitView = searchParams.get('view');
	let viewPref = event.cookies.get('view_preference');

	if (explicitView === 'desktop' || explicitView === 'mobile') {
		viewPref = explicitView;
	}

	// Detect device from User-Agent
	const ua = event.request.headers.get('user-agent') || '';
	const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
	const shouldBeMobile = viewPref ? viewPref === 'mobile' : isMobileUA;
	const isCurrentPathMobile = pathname === '/m' || pathname.startsWith('/m/');

	// Mobile view needed but on desktop path
	if (shouldBeMobile && !isCurrentPathMobile) {
		const targetPath = pathname === '/' ? '/m' : `/m${pathname}`;
		const targetUrl = new URL(event.url);
		targetUrl.pathname = targetPath;
		if (explicitView) {
			targetUrl.searchParams.delete('view');
			event.cookies.set('view_preference', explicitView, {
				path: '/',
				maxAge: 60 * 60 * 24 * 365
			});
		}
		throw redirect(307, targetUrl.toString());
	}

	// Desktop view needed but on mobile path
	if (!shouldBeMobile && isCurrentPathMobile) {
		const targetPath = pathname.replace(/^\/m(?=\/|$)/, '') || '/';
		const targetUrl = new URL(event.url);
		targetUrl.pathname = targetPath;
		if (explicitView) {
			targetUrl.searchParams.delete('view');
			event.cookies.set('view_preference', explicitView, {
				path: '/',
				maxAge: 60 * 60 * 24 * 365
			});
		}
		throw redirect(307, targetUrl.toString());
	}

	if (explicitView) {
		const targetUrl = new URL(event.url);
		targetUrl.searchParams.delete('view');
		event.cookies.set('view_preference', explicitView, {
			path: '/',
			maxAge: 60 * 60 * 24 * 365
		});
		throw redirect(307, targetUrl.toString());
	}

	return resolve(event);
};
