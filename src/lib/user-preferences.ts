export interface UserDashboardPreferences {
  defaultView: 'TABLE' | 'TIMELINE' | 'MONTH' | 'CALENDAR';
  defaultStatusFilter: 'ALL' | 'PENDING' | 'APPROVED' | 'TODAY';
  tableDensity: 'normal' | 'compact';
  density?: 'normal' | 'compact';
  visibleWidgets: string[];
  visibleColumns: {
    department: boolean;
    studentId: boolean;
    reason: boolean;
    approvedBy: boolean;
  };
}

export const DEFAULT_USER_PREFERENCES: UserDashboardPreferences = {
  defaultView: 'TABLE',
  defaultStatusFilter: 'ALL',
  tableDensity: 'normal',
  density: 'normal',
  visibleWidgets: ['PENDING', 'TODAY', 'URGENT', 'WEEKLY'],
  visibleColumns: {
    department: true,
    studentId: true,
    reason: true,
    approvedBy: true,
  },
};

export function mergeUserPreferences(raw?: any): UserDashboardPreferences {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_USER_PREFERENCES,
      visibleWidgets: [...DEFAULT_USER_PREFERENCES.visibleWidgets],
      visibleColumns: { ...DEFAULT_USER_PREFERENCES.visibleColumns },
    };
  }

  const density =
    raw.density === 'compact' || raw.tableDensity === 'compact'
      ? 'compact'
      : raw.density === 'normal' || raw.tableDensity === 'normal'
      ? 'normal'
      : DEFAULT_USER_PREFERENCES.tableDensity;

  const validViews = ['TABLE', 'TIMELINE', 'MONTH', 'CALENDAR'];
  const defaultView =
    typeof raw.defaultView === 'string' && validViews.includes(raw.defaultView)
      ? (raw.defaultView as UserDashboardPreferences['defaultView'])
      : DEFAULT_USER_PREFERENCES.defaultView;

  const validStatusFilters = ['ALL', 'PENDING', 'APPROVED', 'TODAY'];
  const defaultStatusFilter =
    typeof raw.defaultStatusFilter === 'string' && validStatusFilters.includes(raw.defaultStatusFilter)
      ? (raw.defaultStatusFilter as UserDashboardPreferences['defaultStatusFilter'])
      : DEFAULT_USER_PREFERENCES.defaultStatusFilter;

  const visibleWidgets = Array.isArray(raw.visibleWidgets)
    ? raw.visibleWidgets.map(String)
    : [...DEFAULT_USER_PREFERENCES.visibleWidgets];

  const visibleColumns = {
    department:
      typeof raw.visibleColumns?.department === 'boolean'
        ? raw.visibleColumns.department
        : DEFAULT_USER_PREFERENCES.visibleColumns.department,
    studentId:
      typeof raw.visibleColumns?.studentId === 'boolean'
        ? raw.visibleColumns.studentId
        : DEFAULT_USER_PREFERENCES.visibleColumns.studentId,
    reason:
      typeof raw.visibleColumns?.reason === 'boolean'
        ? raw.visibleColumns.reason
        : DEFAULT_USER_PREFERENCES.visibleColumns.reason,
    approvedBy:
      typeof raw.visibleColumns?.approvedBy === 'boolean'
        ? raw.visibleColumns.approvedBy
        : DEFAULT_USER_PREFERENCES.visibleColumns.approvedBy,
  };

  return {
    defaultView,
    defaultStatusFilter,
    tableDensity: density,
    density,
    visibleWidgets,
    visibleColumns,
  };
}

/**
 * Ensures the preferences column exists in the PostgreSQL User table.
 * Non-destructive and idempotent: runs ALTER TABLE ADD COLUMN IF NOT EXISTS.
 * Causes zero data loss on existing database rows.
 */
let columnEnsured = false;
export async function ensurePreferencesColumn(prismaClient: any): Promise<boolean> {
  if (columnEnsured) return true;
  try {
    if (typeof prismaClient?.$executeRawUnsafe === 'function') {
      await prismaClient.$executeRawUnsafe(
        'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferences" JSONB;'
      );
      columnEnsured = true;
      return true;
    }
  } catch {
    // Ignore error if DDL is restricted or in mock environment
  }
  return false;
}

/**
 * Safely fetches a user session record with preferences, automatically
 * handling cases where the database column has not been migrated yet.
 */
export async function safeGetUserWithPreferences(prismaClient: any, userId: string) {
  try {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        googleId: true,
        googleEmail: true,
        preferences: true,
      },
    });
    return user;
  } catch (err: any) {
    if (err?.code === 'P2022' || err?.message?.includes('preferences')) {
      // Auto-migrate non-destructively
      const migrated = await ensurePreferencesColumn(prismaClient);
      if (migrated) {
        try {
          return await prismaClient.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              email: true,
              username: true,
              fullName: true,
              role: true,
              isActive: true,
              googleId: true,
              googleEmail: true,
              preferences: true,
            },
          });
        } catch {
          // If still fails, fall through to fallback
        }
      }

      // Safe fallback selecting only columns known to exist
      const fallbackUser = await prismaClient.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          role: true,
          isActive: true,
          googleId: true,
          googleEmail: true,
        },
      });

      if (fallbackUser) {
        return {
          ...fallbackUser,
          preferences: null,
        };
      }
      return null;
    }
    throw err;
  }
}

