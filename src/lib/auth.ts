import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const isTest = process.env.NODE_ENV === 'test';

if (!isTest) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SECURITY ERROR: JWT_SECRET environment variable is missing or shorter than 32 characters. Please refer to .env.example to set a secure secret.'
    );
  }
}

export const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || (isTest ? 'test-fallback-secret-key-kmutnb-reservation-32chars!' : '')
);

export interface SessionUser {
  id: string;
  email: string;
  username?: string | null;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({
    id: user.id,
    email: user.email,
    username: user.username || null,
    fullName: user.fullName,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

export async function getSessionFromRequest(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}
