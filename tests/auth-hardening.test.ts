process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reservation_db?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-auth-hardening';

import { describe, test, it, expect, spyOn } from 'bun:test';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { GET as googleCallbackGet } from '../src/routes/api/auth/google/callback/+server';
import { PATCH as userPatchHandler } from '../src/routes/api/users/[id]/+server';
import { GET as usersGetHandler, POST as usersPostHandler } from '../src/routes/api/users/+server';
import { isAllowedDiscordUrl } from '../src/lib/encryption';
import * as authModule from '../src/lib/auth';
import { prisma } from '../src/lib/prisma';

const STATE_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'test-jwt-secret-for-auth-hardening'
);

function createMockEvent(url: string, method: string = 'GET', bodyObj?: any, cookiesObj: Record<string, string> = {}) {
  const cookieStore = { ...cookiesObj };
  const deletedCookies: string[] = [];
  const setCookies: Record<string, string> = {};

  const request = new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined,
  });

  return {
    event: {
      request,
      url: new URL(url),
      cookies: {
        get: (name: string) => cookieStore[name],
        set: (name: string, value: string) => {
          setCookies[name] = value;
          cookieStore[name] = value;
        },
        delete: (name: string) => {
          deletedCookies.push(name);
          delete cookieStore[name];
        },
      },
      locals: {},
    } as any,
    cookieStore,
    deletedCookies,
    setCookies,
  };
}

describe('Auth Hardening Validation', () => {
  test('OAuth state matches cookie', () => {
    const cookieState = 'state-abc-123';
    const queryState = 'state-abc-123';
    const mismatchedState = 'state-xyz-999';

    expect(cookieState === queryState).toBe(true);
    expect(cookieState === mismatchedState).toBe(false);
  });

  describe('Google OAuth Callback State Verification', () => {
    test('rejects callback when oauth_state cookie is missing', async () => {
      const stateToken = await new SignJWT({ action: 'login', nonce: '123' })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('10m')
        .sign(STATE_SECRET);

      const { event } = createMockEvent(
        `http://localhost:3000/api/auth/google/callback?code=mock-code&state=${stateToken}`,
        'GET',
        undefined,
        {} // no oauth_state cookie
      );

      try {
        await googleCallbackGet(event);
        expect.unreachable('Should have thrown redirect');
      } catch (redirectErr: any) {
        expect(redirectErr.status).toBe(303);
        expect(redirectErr.location).toBe('/admin/login?error=INVALID_OAUTH_STATE');
      }
    });

    test('rejects callback when oauth_state cookie does not match query state', async () => {
      const stateToken = await new SignJWT({ action: 'login', nonce: '123' })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('10m')
        .sign(STATE_SECRET);

      const { event } = createMockEvent(
        `http://localhost:3000/api/auth/google/callback?code=mock-code&state=${stateToken}`,
        'GET',
        undefined,
        { oauth_state: 'different-stolen-state-token' }
      );

      try {
        await googleCallbackGet(event);
        expect.unreachable('Should have thrown redirect');
      } catch (redirectErr: any) {
        expect(redirectErr.status).toBe(303);
        expect(redirectErr.location).toBe('/admin/login?error=INVALID_OAUTH_STATE');
      }
    });
  });

  describe('Self Password Change Current Password Verification', () => {
    const originalPasswordHash = bcrypt.hashSync('OldPassword123!', 10);

    test('rejects password shorter than 6 characters', async () => {
      spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
        id: 'admin-user-1',
        email: 'admin1@kmutnb.ac.th',
        fullName: 'Admin One',
        role: 'ADMIN',
      });

      (prisma as any).user = {
        findUnique: async () => ({
          id: 'admin-user-1',
          email: 'admin1@kmutnb.ac.th',
          fullName: 'Admin One',
          role: 'ADMIN',
          passwordHash: originalPasswordHash,
        }),
      };

      const { event } = createMockEvent(
        'http://localhost:3000/api/users/admin-user-1',
        'PATCH',
        { password: '12345', currentPassword: 'OldPassword123!' }
      );
      event.params = { id: 'admin-user-1' };

      const res = await userPatchHandler(event);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBe('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
    });

    test('rejects self-password change when currentPassword is missing', async () => {
      spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
        id: 'admin-user-1',
        email: 'admin1@kmutnb.ac.th',
        fullName: 'Admin One',
        role: 'ADMIN',
      });

      (prisma as any).user = {
        findUnique: async () => ({
          id: 'admin-user-1',
          email: 'admin1@kmutnb.ac.th',
          fullName: 'Admin One',
          role: 'ADMIN',
          passwordHash: originalPasswordHash,
        }),
      };

      const { event } = createMockEvent(
        'http://localhost:3000/api/users/admin-user-1',
        'PATCH',
        { password: 'NewSecurePassword123!' }
      );
      event.params = { id: 'admin-user-1' };

      const res = await userPatchHandler(event);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBe('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    });

    test('rejects self-password change when currentPassword is wrong', async () => {
      spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
        id: 'admin-user-1',
        email: 'admin1@kmutnb.ac.th',
        fullName: 'Admin One',
        role: 'ADMIN',
      });

      (prisma as any).user = {
        findUnique: async () => ({
          id: 'admin-user-1',
          email: 'admin1@kmutnb.ac.th',
          fullName: 'Admin One',
          role: 'ADMIN',
          passwordHash: originalPasswordHash,
        }),
      };

      const { event } = createMockEvent(
        'http://localhost:3000/api/users/admin-user-1',
        'PATCH',
        {
          password: 'NewSecurePassword123!',
          currentPassword: 'WrongPassword999!',
        }
      );
      event.params = { id: 'admin-user-1' };

      const res = await userPatchHandler(event);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toBe('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    });

    test('allows self-password change when currentPassword matches', async () => {
      spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
        id: 'admin-user-1',
        email: 'admin1@kmutnb.ac.th',
        fullName: 'Admin One',
        role: 'ADMIN',
      });

      let updatedData: any = null;
      (prisma as any).user = {
        findUnique: async () => ({
          id: 'admin-user-1',
          email: 'admin1@kmutnb.ac.th',
          fullName: 'Admin One',
          role: 'ADMIN',
          passwordHash: originalPasswordHash,
        }),
        update: async (args: any) => {
          updatedData = args.data;
          return {
            id: 'admin-user-1',
            email: 'admin1@kmutnb.ac.th',
            username: 'admin1',
            fullName: 'Admin One',
            role: 'ADMIN',
            isActive: true,
          };
        },
      };

      const { event } = createMockEvent(
        'http://localhost:3000/api/users/admin-user-1',
        'PATCH',
        {
          password: 'NewSecurePassword123!',
          currentPassword: 'OldPassword123!',
        }
      );
      event.params = { id: 'admin-user-1' };

      const res = await userPatchHandler(event);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(updatedData.passwordHash).toBeDefined();
      expect(bcrypt.compareSync('NewSecurePassword123!', updatedData.passwordHash)).toBe(true);
    });

    test('allows SUPER_ADMIN to reset another user password without currentPassword', async () => {
      spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
        id: 'super-admin-root',
        email: 'root@kmutnb.ac.th',
        fullName: 'Root Admin',
        role: 'SUPER_ADMIN',
      });

      let updatedData: any = null;
      (prisma as any).user = {
        findUnique: async () => ({
          id: 'target-admin-2',
          email: 'target@kmutnb.ac.th',
          fullName: 'Target Admin',
          role: 'ADMIN',
          passwordHash: originalPasswordHash,
        }),
        update: async (args: any) => {
          updatedData = args.data;
          return {
            id: 'target-admin-2',
            email: 'target@kmutnb.ac.th',
            username: 'target',
            fullName: 'Target Admin',
            role: 'ADMIN',
            isActive: true,
          };
        },
      };

      const { event } = createMockEvent(
        'http://localhost:3000/api/users/target-admin-2',
        'PATCH',
        {
          password: 'NewResetPassword456!',
        }
      );
      event.params = { id: 'target-admin-2' };

      const res = await userPatchHandler(event);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(bcrypt.compareSync('NewResetPassword456!', updatedData.passwordHash)).toBe(true);
    });
  });

  describe('User API Invite Token Redaction', () => {
    test('GET /api/users redacts plaintext inviteToken and returns hasPendingInvite boolean', async () => {
      spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
        id: 'super-admin-root',
        email: 'root@kmutnb.ac.th',
        fullName: 'Root Admin',
        role: 'SUPER_ADMIN',
      });

      (prisma as any).user = {
        findMany: async () => [
          {
            id: 'u1',
            email: 'pending@kmutnb.ac.th',
            username: null,
            fullName: 'Pending User',
            role: 'ADMIN',
            isActive: true,
            inviteToken: 'super-secret-invite-token-abc',
            inviteExpiresAt: new Date(Date.now() + 100000),
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { approvedBookings: 0 },
          },
          {
            id: 'u2',
            email: 'active@kmutnb.ac.th',
            username: 'active',
            fullName: 'Active User',
            role: 'ADMIN',
            isActive: true,
            inviteToken: null,
            inviteExpiresAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { approvedBookings: 5 },
          },
        ],
      };

      const { event } = createMockEvent('http://localhost:3000/api/users', 'GET');
      const res = await usersGetHandler(event);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.users).toHaveLength(2);

      // Verify u1 (has invite)
      expect(data.users[0].inviteToken).toBeUndefined();
      expect(data.users[0].hasPendingInvite).toBe(true);

      // Verify u2 (no invite)
      expect(data.users[1].inviteToken).toBeUndefined();
      expect(data.users[1].hasPendingInvite).toBe(false);
    });

    test('POST /api/users redacts inviteToken and returns hasPendingInvite boolean', async () => {
      spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
        id: 'super-admin-root',
        email: 'root@kmutnb.ac.th',
        fullName: 'Root Admin',
        role: 'SUPER_ADMIN',
      });

      (prisma as any).user = {
        findUnique: async () => null,
        create: async (args: any) => ({
          id: 'u-created',
          email: args.data.email,
          username: null,
          fullName: args.data.fullName,
          role: args.data.role,
          isActive: true,
          inviteToken: args.data.inviteToken,
          inviteExpiresAt: args.data.inviteExpiresAt,
          createdAt: new Date(),
        }),
      };

      const { event } = createMockEvent('http://localhost:3000/api/users', 'POST', {
        email: 'newadmin@kmutnb.ac.th',
        fullName: 'New Admin',
        role: 'ADMIN',
        sendInvite: true,
      });

      const res = await usersPostHandler(event);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.inviteToken).toBeUndefined();
      expect(data.user.hasPendingInvite).toBe(true);
    });
  });

  describe('Discord Webhook HTTPS Enforcement', () => {
    test('strictly enforces HTTPS for discord webhook URLs', () => {
      expect(isAllowedDiscordUrl('https://discord.com/api/webhooks/123/xyz')).toBe(true);
      expect(isAllowedDiscordUrl('https://discordapp.com/api/webhooks/123/xyz')).toBe(true);
      expect(isAllowedDiscordUrl('http://discord.com/api/webhooks/123/xyz')).toBe(false);
      expect(isAllowedDiscordUrl('http://discordapp.com/api/webhooks/123/xyz')).toBe(false);
      expect(isAllowedDiscordUrl('ftp://discord.com/api/webhooks/123/xyz')).toBe(false);
    });
  });
});
