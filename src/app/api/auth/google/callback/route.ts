import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSessionToken } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { jwtVerify } from 'jose';

const STATE_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-fallback-secret-key-kmutnb-reservation-only'
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateToken = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.nextUrl.origin ||
    'http://localhost:3000';

  const redirectUri = `${origin}/api/auth/google/callback`;

  if (errorParam) {
    return NextResponse.redirect(new URL(`/admin/login?error=GOOGLE_CANCELLED`, request.url));
  }

  if (!code || !stateToken) {
    return NextResponse.redirect(new URL('/admin/login?error=INVALID_OAUTH_REQUEST', request.url));
  }

  // Verify signed state
  let statePayload: any = null;
  try {
    const { payload } = await jwtVerify(stateToken, STATE_SECRET);
    statePayload = payload;
  } catch (e) {
    console.error('Invalid OAuth state:', e);
    return NextResponse.redirect(new URL('/admin/login?error=INVALID_OAUTH_STATE', request.url));
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
    return NextResponse.redirect(new URL(errorTarget, request.url));
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Failed to exchange Google token:', tokenData);
      const errorTarget =
        action === 'link'
          ? '/admin/profile?error=TOKEN_EXCHANGE_FAILED'
          : '/admin/login?error=TOKEN_EXCHANGE_FAILED';
      return NextResponse.redirect(new URL(errorTarget, request.url));
    }

    // 2. Fetch Google profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.sub || !profile.email) {
      console.error('Failed to fetch Google profile:', profile);
      const errorTarget =
        action === 'link'
          ? '/admin/profile?error=PROFILE_FETCH_FAILED'
          : '/admin/login?error=PROFILE_FETCH_FAILED';
      return NextResponse.redirect(new URL(errorTarget, request.url));
    }

    const googleId = profile.sub;
    const googleEmail = profile.email.toLowerCase().trim();

    // 3. Domain validation: Must end with @email.kmutnb.ac.th
    if (!googleEmail.endsWith('@email.kmutnb.ac.th')) {
      const errorTarget =
        action === 'link'
          ? `/admin/profile?error=INVALID_DOMAIN&attemptedEmail=${encodeURIComponent(googleEmail)}`
          : `/admin/login?error=INVALID_DOMAIN&attemptedEmail=${encodeURIComponent(googleEmail)}`;
      return NextResponse.redirect(new URL(errorTarget, request.url));
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

    // 4. Action: LINK Google account to existing logged-in admin
    if (action === 'link' && targetUserId) {
      // Check if googleId is already bound to another admin account
      const existingWithGoogle = await prisma.user.findFirst({
        where: {
          googleId,
          id: { not: targetUserId },
        },
      });

      if (existingWithGoogle) {
        return NextResponse.redirect(
          new URL('/admin/profile?error=ALREADY_LINKED_TO_OTHER', request.url)
        );
      }

      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          googleId,
          googleEmail,
        },
      });

      await recordAuditLog({
        action: 'GOOGLE_ACCOUNT_LINKED',
        details: `${updatedUser.fullName} ได้ผูกบัญชี Google (${googleEmail}) เข้ากับบัญชีผู้ดูแลระบบ`,
        actorName: updatedUser.fullName,
        actorEmail: updatedUser.email,
        actorRole: updatedUser.role,
        ipAddress: ip,
        userId: updatedUser.id,
      });

      const response = NextResponse.redirect(new URL('/admin/profile?success=LINKED', request.url));
      response.cookies.delete('oauth_state');
      return response;
    }

    // 5. Action: LOGIN via Google
    const user = await prisma.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL(
          `/admin/login?error=NOT_LINKED&attemptedEmail=${encodeURIComponent(googleEmail)}`,
          request.url
        )
      );
    }

    if (!user.isActive) {
      return NextResponse.redirect(
        new URL('/admin/login?error=ACCOUNT_SUSPENDED', request.url)
      );
    }

    // Generate session token
    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });

    await recordAuditLog({
      action: 'ADMIN_LOGIN_GOOGLE',
      details: `${user.fullName} (${user.email}) เข้าสู่ระบบผ่าน Google OAuth (${googleEmail}) สำเร็จ`,
      actorName: user.fullName,
      actorEmail: user.email,
      actorRole: user.role,
      ipAddress: ip,
      userId: user.id,
    });

    const response = NextResponse.redirect(new URL('/admin/dashboard', request.url));
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    response.cookies.delete('oauth_state');

    return response;
  } catch (error) {
    console.error('Error handling Google OAuth callback:', error);
    const errorTarget =
      action === 'link'
        ? '/admin/profile?error=SERVER_ERROR'
        : '/admin/login?error=SERVER_ERROR';
    return NextResponse.redirect(new URL(errorTarget, request.url));
  }
}
