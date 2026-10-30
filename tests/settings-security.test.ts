process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reservation_db?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-settings-security';
process.env.ENCRYPTION_SECRET =
  process.env.ENCRYPTION_SECRET || 'test-fallback-encryption-secret-key-kmutnb-32chars';

import { describe, test, it, expect, spyOn, beforeEach } from 'bun:test';
import {
  maskSecret,
  isAllowedDiscordUrl,
  SENSITIVE_SETTING_KEYS,
  PUBLIC_SETTING_KEYS,
  encryptSecret,
} from '$lib/encryption';
import { GET as getSettings, PUT as putSettings } from '../src/routes/api/settings/+server';
import { GET as getCronBackup } from '../src/routes/api/cron/backup/+server';
import * as authModule from '$lib/auth';
import * as auditModule from '$lib/audit';
import * as backupModule from '$lib/backup';
import { prisma } from '$lib/prisma';

function createMockEvent(url: string, method = 'GET', bodyObj?: any, headers: Record<string, string> = {}) {
  const reqHeaders: Record<string, string> = { ...headers };
  if (bodyObj !== undefined) {
    reqHeaders['Content-Type'] = 'application/json';
  }
  const request = new Request(url, {
    method,
    headers: reqHeaders,
    body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined,
  });
  return {
    request,
    url: new URL(url),
    cookies: {
      get: () => undefined,
      set: () => {},
      delete: () => {},
    },
    locals: {},
  } as any;
}

describe('Settings API Security & Masking', () => {
  test('SENSITIVE_SETTING_KEYS are masked in Admin UI responses', () => {
    const rawSecret = 'super-secret-smtp-password';
    const masked = maskSecret(rawSecret);
    expect(masked).toBe('••••••••••••••••');
    expect(masked.startsWith('••')).toBe(true);
  });

  test('Discord webhook URL validator blocks internal addresses and SSRF', () => {
    const isAllowedDiscordUrlLocal = (url: string) => {
      try {
        const u = new URL(url);
        return (
          (u.hostname === 'discord.com' || u.hostname === 'discordapp.com') &&
          u.pathname.startsWith('/api/webhooks/')
        );
      } catch {
        return false;
      }
    };

    expect(isAllowedDiscordUrlLocal('https://discord.com/api/webhooks/123/abc')).toBe(true);
    expect(isAllowedDiscordUrlLocal('https://discordapp.com/api/webhooks/123/abc')).toBe(true);
    expect(isAllowedDiscordUrlLocal('http://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isAllowedDiscordUrlLocal('https://evil-hacker.com/webhook')).toBe(false);
  });

  test('exported isAllowedDiscordUrl strictly checks discord domains', () => {
    expect(isAllowedDiscordUrl('https://discord.com/api/webhooks/999/xyz')).toBe(true);
    expect(isAllowedDiscordUrl('https://discordapp.com/api/webhooks/888/foo')).toBe(true);
    expect(isAllowedDiscordUrl('http://127.0.0.1:8080/admin')).toBe(false);
    expect(isAllowedDiscordUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isAllowedDiscordUrl('https://attacker.com/steal')).toBe(false);
    expect(isAllowedDiscordUrl('not-even-a-url')).toBe(false);
    expect(isAllowedDiscordUrl('')).toBe(false);
  });

  describe('GET /api/settings access control & data minimization', () => {
    const sampleDbSettings = [
      { key: 'site_title', value: 'ระบบจองห้องประชุม' },
      { key: 'site_subtitle', value: 'สภานักศึกษา มจพ.' },
      { key: 'timezone', value: 'Asia/Bangkok' },
      { key: 'contact_email', value: 'council@kmutnb.ac.th' },
      // Internal operational fields (MUST be hidden from public)
      { key: 'smtp_host', value: 'smtp.sendgrid.net' },
      { key: 'smtp_user', value: 'apikey' },
      { key: 'admin_notification_email', value: 'admin@kmutnb.ac.th' },
      { key: 'google_sheet_id', value: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' },
      { key: 'google_service_account_email', value: 'svc@iam.gserviceaccount.com' },
      // Sensitive encrypted secrets
      { key: 'smtp_pass', value: encryptSecret('my-smtp-password') },
      { key: 'google_private_key', value: encryptSecret('-----BEGIN PRIVATE KEY-----\nMII...') },
      { key: 'webhook_discord_url', value: encryptSecret('https://discord.com/api/webhooks/123/abc') },
    ];

    test('unauthenticated visitor receives ONLY public settings and facilityConfig', async () => {
      spyOn(authModule, 'getSessionFromRequest').mockResolvedValue(null);
      (prisma as any).siteSetting = {
        findUnique: async () => null,
        findMany: async ({ where }: any) => {
          if (where?.key?.in) {
            return sampleDbSettings.filter((s) => where.key.in.includes(s.key));
          }
          return sampleDbSettings;
        },
      };

      const event = createMockEvent('http://localhost:3000/api/settings');
      const response = await getSettings(event);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.isSuperAdmin).toBe(false);
      expect(data.facilityConfig).toBeDefined();

      // Public settings present
      expect(data.settings.site_title).toBe('ระบบจองห้องประชุม');
      expect(data.settings.site_subtitle).toBe('สภานักศึกษา มจพ.');
      expect(data.settings.timezone).toBe('Asia/Bangkok');
      expect(data.settings.contact_email).toBe('council@kmutnb.ac.th');

      // Internal operational fields MUST NOT be present
      expect(data.settings.smtp_host).toBeUndefined();
      expect(data.settings.smtp_user).toBeUndefined();
      expect(data.settings.admin_notification_email).toBeUndefined();
      expect(data.settings.google_sheet_id).toBeUndefined();
      expect(data.settings.google_service_account_email).toBeUndefined();

      // Secrets MUST NOT be present
      expect(data.settings.smtp_pass).toBeUndefined();
      expect(data.settings.google_private_key).toBeUndefined();
      expect(data.settings.webhook_discord_url).toBeUndefined();
    });

    test('regular ADMIN receives only public settings and cannot see operational secrets', async () => {
      spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
        id: 'admin-1',
        email: 'staff@kmutnb.ac.th',
        fullName: 'Staff Admin',
        role: 'ADMIN',
      } as any);

      (prisma as any).siteSetting = {
        findUnique: async () => null,
        findMany: async () => sampleDbSettings,
      };

      const event = createMockEvent('http://localhost:3000/api/settings');
      const response = await getSettings(event);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.isSuperAdmin).toBe(false);
      expect(data.settings.site_title).toBe('ระบบจองห้องประชุม');
      expect(data.settings.smtp_host).toBeUndefined();
      expect(data.settings.smtp_pass).toBeUndefined();
      expect(data.settings.google_private_key).toBeUndefined();
    });

    test('SUPER_ADMIN receives operational fields and MASKED secrets (never plaintext)', async () => {
      spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
        id: 'super-admin-1',
        email: 'super@kmutnb.ac.th',
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN',
      } as any);

      (prisma as any).siteSetting = {
        findUnique: async () => null,
        findMany: async () => sampleDbSettings,
      };

      const event = createMockEvent('http://localhost:3000/api/settings');
      const response = await getSettings(event);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.isSuperAdmin).toBe(true);

      // Operational settings visible to Super Admin
      expect(data.settings.smtp_host).toBe('smtp.sendgrid.net');
      expect(data.settings.smtp_user).toBe('apikey');
      expect(data.settings.google_sheet_id).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

      // Sensitive secrets are MASKED with •••••••••••••••• (NOT decrypted plaintext)
      expect(data.settings.smtp_pass).toBe('••••••••••••••••');
      expect(data.settings.google_private_key).toBe('••••••••••••••••');
      expect(data.settings.webhook_discord_url).toBe('••••••••••••••••');

      // Confirm raw plaintext was not sent over wire
      expect(data.settings.smtp_pass).not.toBe('my-smtp-password');
      expect(data.settings.google_private_key).not.toContain('BEGIN PRIVATE KEY');
    });
  });

  describe('PUT /api/settings security & SSRF prevention', () => {
    beforeEach(() => {
      spyOn(auditModule, 'recordAuditLog').mockResolvedValue({} as any);
    });

    test('rejects non-SUPER_ADMIN with 403', async () => {
      spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
        id: 'admin-1',
        email: 'staff@kmutnb.ac.th',
        fullName: 'Staff Admin',
        role: 'ADMIN',
      } as any);

      const event = createMockEvent('http://localhost:3000/api/settings', 'PUT', {
        settings: { site_title: 'Hacked' },
      });

      const response = await putSettings(event);
      expect(response.status).toBe(403);
    });

    test('rejects SSRF attempt in webhook_discord_url with 400', async () => {
      spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
        id: 'super-1',
        email: 'super@kmutnb.ac.th',
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN',
      } as any);

      const event = createMockEvent('http://localhost:3000/api/settings', 'PUT', {
        settings: {
          webhook_discord_url: 'http://169.254.169.254/latest/meta-data',
        },
      });

      const response = await putSettings(event);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Discord Webhook');
    });

    test('preserves existing secret when incoming value starts with ••', async () => {
      spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
        id: 'super-1',
        email: 'super@kmutnb.ac.th',
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN',
      } as any);

      const upsertedKeys: string[] = [];
      (prisma as any).siteSetting = {
        upsert: async ({ where }: any) => {
          upsertedKeys.push(where.key);
          return {};
        },
      };

      const event = createMockEvent('http://localhost:3000/api/settings', 'PUT', {
        settings: {
          site_title: 'Updated Title',
          smtp_pass: '••••••••••••••••', // Masked from UI, should NOT overwrite DB
          webhook_discord_url: '••••••••••••••••', // Masked from UI, should NOT overwrite DB
        },
      });

      const response = await putSettings(event);
      expect(response.status).toBe(200);

      // site_title was updated, but masked secrets were skipped
      expect(upsertedKeys).toContain('site_title');
      expect(upsertedKeys).not.toContain('smtp_pass');
      expect(upsertedKeys).not.toContain('webhook_discord_url');
    });

    test('updates and encrypts secret when valid new plaintext is provided', async () => {
      spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
        id: 'super-1',
        email: 'super@kmutnb.ac.th',
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN',
      } as any);

      const savedRecords: Record<string, string> = {};
      (prisma as any).siteSetting = {
        upsert: async ({ where, update }: any) => {
          savedRecords[where.key] = update.value;
          return {};
        },
      };

      const event = createMockEvent('http://localhost:3000/api/settings', 'PUT', {
        settings: {
          webhook_discord_url: 'https://discord.com/api/webhooks/123456/abcdef',
        },
      });

      const response = await putSettings(event);
      expect(response.status).toBe(200);

      expect(savedRecords.webhook_discord_url).toBeDefined();
      expect(savedRecords.webhook_discord_url.startsWith('enc:v1:')).toBe(true);
    });
  });

  describe('GET /api/cron/backup endpoint hardening', () => {
    const originalCronSecret = process.env.CRON_SECRET;

    beforeEach(() => {
      spyOn(backupModule, 'createDatabaseBackup').mockResolvedValue({
        backup: { pathname: 'backups/test.json', size: 1024, url: 'https://blob/test', uploadedAt: new Date() },
        metadata: { counts: { bookings: 5, users: 2 } },
      } as any);
      spyOn(backupModule, 'pruneOldBackups').mockResolvedValue(1);
      spyOn(auditModule, 'recordAuditLog').mockResolvedValue({} as any);
    });

    test('returns 401 when CRON_SECRET is not configured in environment', async () => {
      delete process.env.CRON_SECRET;

      const event = createMockEvent('http://localhost:3000/api/cron/backup', 'GET', undefined, {
        Authorization: 'Bearer any-token',
      });

      const response = await getCronBackup(event);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Unauthorized');
    });

    test('returns 401 when authorization header is missing or incorrect', async () => {
      process.env.CRON_SECRET = 'super-cron-secret-123';

      const eventNoAuth = createMockEvent('http://localhost:3000/api/cron/backup', 'GET');
      const resNoAuth = await getCronBackup(eventNoAuth);
      expect(resNoAuth.status).toBe(401);

      const eventWrongAuth = createMockEvent('http://localhost:3000/api/cron/backup', 'GET', undefined, {
        Authorization: 'Bearer wrong-secret',
      });
      const resWrongAuth = await getCronBackup(eventWrongAuth);
      expect(resWrongAuth.status).toBe(401);
    });

    test('succeeds with 200 when Authorization header matches CRON_SECRET', async () => {
      process.env.CRON_SECRET = 'super-cron-secret-123';

      const eventValid = createMockEvent('http://localhost:3000/api/cron/backup', 'GET', undefined, {
        Authorization: 'Bearer super-cron-secret-123',
      });

      const response = await getCronBackup(eventValid);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('completed successfully');

      // Restore original env
      if (originalCronSecret !== undefined) {
        process.env.CRON_SECRET = originalCronSecret;
      } else {
        delete process.env.CRON_SECRET;
      }
    });
  });
});
