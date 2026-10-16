process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reservation_db?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-user-preferences';

import { describe, it, expect, spyOn } from 'bun:test';
import {
  DEFAULT_USER_PREFERENCES,
  mergeUserPreferences,
  type UserDashboardPreferences,
} from '../src/lib/user-preferences';
import { GET, PATCH } from '../src/app/api/users/preferences/route';
import { GET as getAuthMe } from '../src/app/api/auth/me/route';
import { NextRequest } from 'next/server';
import * as authModule from '../src/lib/auth';
import { prisma } from '../src/lib/prisma';

describe('User Preferences Schema & Defaults', () => {
  it('should return complete default preferences when given undefined or empty object', () => {
    const emptyMerge = mergeUserPreferences();
    expect(emptyMerge).toEqual(DEFAULT_USER_PREFERENCES);

    const emptyObjMerge = mergeUserPreferences({});
    expect(emptyObjMerge).toEqual(DEFAULT_USER_PREFERENCES);

    const nullMerge = mergeUserPreferences(null);
    expect(nullMerge).toEqual(DEFAULT_USER_PREFERENCES);
  });

  it('should validate and merge default preferences correctly with custom values', () => {
    const custom = { defaultView: 'CALENDAR', density: 'compact' };
    const merged = mergeUserPreferences(custom);

    expect(merged.defaultView).toBe('CALENDAR');
    expect(merged.density).toBe('compact');
    expect(merged.tableDensity).toBe('compact');
    expect(merged.visibleWidgets).toEqual(DEFAULT_USER_PREFERENCES.visibleWidgets);
    expect(merged.visibleColumns).toEqual(DEFAULT_USER_PREFERENCES.visibleColumns);
  });

  it('should partially override visibleColumns without losing other column flags', () => {
    const custom = {
      visibleColumns: {
        department: false,
      },
    };
    const merged = mergeUserPreferences(custom);

    expect(merged.visibleColumns.department).toBe(false);
    expect(merged.visibleColumns.studentId).toBe(true);
    expect(merged.visibleColumns.reason).toBe(true);
    expect(merged.visibleColumns.approvedBy).toBe(true);
  });

  it('should allow custom visibleWidgets array and custom defaultStatusFilter', () => {
    const custom = {
      defaultStatusFilter: 'PENDING',
      visibleWidgets: ['PENDING', 'URGENT'],
    };
    const merged = mergeUserPreferences(custom);

    expect(merged.defaultStatusFilter).toBe('PENDING');
    expect(merged.visibleWidgets).toEqual(['PENDING', 'URGENT']);
  });

  it('should fallback to defaults when invalid view or density are passed', () => {
    const custom = {
      defaultView: 'INVALID_VIEW',
      density: 'super_compact',
      defaultStatusFilter: 'UNKNOWN',
    };
    const merged = mergeUserPreferences(custom);

    expect(merged.defaultView).toBe(DEFAULT_USER_PREFERENCES.defaultView);
    expect(merged.tableDensity).toBe(DEFAULT_USER_PREFERENCES.tableDensity);
    expect(merged.defaultStatusFilter).toBe(DEFAULT_USER_PREFERENCES.defaultStatusFilter);
  });
});

describe('User Preferences API Routes', () => {
  it('GET /api/users/preferences returns 401 when unauthenticated', async () => {
    spyOn(authModule, 'getSessionFromRequest').mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/users/preferences');
    const res = await GET(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBe('กรุณาเข้าสู่ระบบ');
  });

  it('PATCH /api/users/preferences returns 401 when unauthenticated', async () => {
    spyOn(authModule, 'getSessionFromRequest').mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/users/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ defaultView: 'MONTH' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBe('กรุณาเข้าสู่ระบบ');
  });

  it('GET /api/users/preferences returns user preferences or defaults for authenticated user', async () => {
    spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
      id: 'mock-user-1',
      email: 'admin@kmutnb.ac.th',
      fullName: 'Mock Admin',
      role: 'ADMIN',
    });

    (prisma as any).user = {
      findUnique: async () => ({
        preferences: {
          defaultView: 'TIMELINE',
          tableDensity: 'compact',
        },
      }),
    };

    const req = new NextRequest('http://localhost:3000/api/users/preferences');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.preferences.defaultView).toBe('TIMELINE');
    expect(data.preferences.tableDensity).toBe('compact');
    expect(data.preferences.visibleWidgets).toEqual(DEFAULT_USER_PREFERENCES.visibleWidgets);
  });

  it('PATCH /api/users/preferences updates preferences and returns merged result', async () => {
    spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
      id: 'mock-user-1',
      email: 'admin@kmutnb.ac.th',
      fullName: 'Mock Admin',
      role: 'ADMIN',
    });

    let updatedData: any = null;
    (prisma as any).user = {
      findUnique: async () => ({
        preferences: {
          defaultView: 'TABLE',
          visibleColumns: {
            department: true,
            studentId: true,
            reason: true,
            approvedBy: true,
          },
        },
      }),
      update: async (args: any) => {
        updatedData = args.data.preferences;
        return { id: args.where.id, preferences: updatedData };
      },
    };

    const req = new NextRequest('http://localhost:3000/api/users/preferences', {
      method: 'PATCH',
      body: JSON.stringify({
        defaultView: 'MONTH',
        visibleColumns: { department: false },
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.preferences.defaultView).toBe('MONTH');
    expect(data.preferences.visibleColumns.department).toBe(false);
    expect(data.preferences.visibleColumns.studentId).toBe(true);
    expect(updatedData.defaultView).toBe('MONTH');
  });

  it('GET /api/auth/me includes preferences in user session response', async () => {
    spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
      id: 'mock-user-1',
      email: 'admin@kmutnb.ac.th',
      fullName: 'Mock Admin',
      role: 'ADMIN',
    });

    (prisma as any).user = {
      findUnique: async () => ({
        id: 'mock-user-1',
        email: 'admin@kmutnb.ac.th',
        username: 'mockadmin',
        fullName: 'Mock Admin',
        role: 'ADMIN',
        isActive: true,
        googleId: null,
        googleEmail: null,
        preferences: {
          defaultView: 'MONTH',
          density: 'compact',
        },
      }),
    };

    const req = new NextRequest('http://localhost:3000/api/auth/me');
    const res = await getAuthMe(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.authenticated).toBe(true);
    expect(data.user.preferences).toBeDefined();
    expect(data.user.preferences.defaultView).toBe('MONTH');
    expect(data.user.preferences.tableDensity).toBe('compact');
    expect(data.user.preferences.visibleWidgets).toEqual(DEFAULT_USER_PREFERENCES.visibleWidgets);
  });

  it('GET /api/auth/me falls back to DEFAULT_USER_PREFERENCES without 500 when User.preferences column is missing (P2022)', async () => {
    spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
      id: 'mock-user-1',
      email: 'admin@kmutnb.ac.th',
      fullName: 'Mock Admin',
      role: 'ADMIN',
    });

    (prisma as any).$executeRawUnsafe = async () => {};

    (prisma as any).user = {
      findUnique: async (args: any) => {
        // If query attempts to select preferences, simulate P2022 error
        if (args?.select?.preferences) {
          const err: any = new Error('The column User.preferences does not exist in the current database.');
          err.code = 'P2022';
          err.meta = { modelName: 'User', column: 'User.preferences' };
          throw err;
        }
        // Fallback query without preferences succeeds
        return {
          id: 'mock-user-1',
          email: 'admin@kmutnb.ac.th',
          username: 'mockadmin',
          fullName: 'Mock Admin',
          role: 'ADMIN',
          isActive: true,
          googleId: null,
          googleEmail: null,
        };
      },
    };

    const req = new NextRequest('http://localhost:3000/api/auth/me');
    const res = await getAuthMe(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.authenticated).toBe(true);
    expect(data.user.preferences).toEqual(DEFAULT_USER_PREFERENCES);
  });

  it('GET /api/users/preferences returns DEFAULT_USER_PREFERENCES without 500 when column is missing (P2022)', async () => {
    spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
      id: 'mock-user-1',
      email: 'admin@kmutnb.ac.th',
      fullName: 'Mock Admin',
      role: 'ADMIN',
    });

    (prisma as any).user = {
      findUnique: async () => {
        const err: any = new Error('The column User.preferences does not exist in the current database.');
        err.code = 'P2022';
        err.meta = { modelName: 'User', column: 'User.preferences' };
        throw err;
      },
    };

    const req = new NextRequest('http://localhost:3000/api/users/preferences');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.preferences).toEqual(DEFAULT_USER_PREFERENCES);
  });
});


