import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('SECURITY ERROR: JWT_SECRET environment variable must be set in production.');
}

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-fallback-secret-key-kmutnb-reservation-only'
);

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({
    id: user.id,
    email: user.email,
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
