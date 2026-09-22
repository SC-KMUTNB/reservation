import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { SignJWT } from 'jose';

const STATE_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-fallback-secret-key-kmutnb-reservation-only'
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'login'; // 'login' | 'link'

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.nextUrl.origin ||
    'http://localhost:3000';

  const redirectUri = `${origin}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    const errorRedirect =
      action === 'link'
        ? '/admin/profile?error=GOOGLE_NOT_CONFIGURED'
        : '/admin/login?error=GOOGLE_NOT_CONFIGURED';
    return NextResponse.redirect(new URL(errorRedirect, request.url));
  }

  let userId: string | null = null;
  if (action === 'link') {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login?error=AUTH_REQUIRED', request.url));
    }
    userId = session.id;
  }

  // Create signed state token
  const stateToken = await new SignJWT({
    action,
    userId,
    nonce: Math.random().toString(36).substring(2),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(STATE_SECRET);

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', stateToken);
  googleAuthUrl.searchParams.set('prompt', 'select_account');
  googleAuthUrl.searchParams.set('hd', 'email.kmutnb.ac.th'); // University Google Workspace domain hint

  const response = NextResponse.redirect(googleAuthUrl.toString());
  response.cookies.set('oauth_state', stateToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
