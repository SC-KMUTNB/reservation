import { put, list, del } from '@vercel/blob';
import { prisma } from './prisma';

export interface BackupMetadata {
  version: string;
  timestamp: string;
  counts: {
    bookings: number;
    users: number;
    settings: number;
    auditLogs: number;
  };
}

export interface BackupData {
  metadata: BackupMetadata;
  bookings: any[];
  users: any[];
  settings: any[];
  auditLogs: any[];
}

export interface BackupRecord {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
  downloadUrl: string;
}

/**
 * Creates full JSON database dump and uploads to Vercel Blob under backups/
 */
export async function createDatabaseBackup(triggerType: 'CRON' | 'MANUAL' = 'MANUAL'): Promise<{
  backup: BackupRecord;
  metadata: BackupMetadata;
}> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured.');
  }

  // 1. Fetch tables
  const [bookings, users, settings, auditLogs] = await Promise.all([
    prisma.booking.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.user.findMany({
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
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.siteSetting.findMany(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5000, // keep latest 5000 audit logs to keep size compact
    }),
  ]);

  const timestamp = new Date().toISOString();
  const dateStr = timestamp.replace(/[:.]/g, '-');

  const metadata: BackupMetadata = {
    version: '1.0',
    timestamp,
    counts: {
      bookings: bookings.length,
      users: users.length,
      settings: settings.length,
      auditLogs: auditLogs.length,
    },
  };

  const backupPayload: BackupData = {
    metadata,
    bookings,
    users,
    settings,
    auditLogs,
  };

  const jsonContent = JSON.stringify(backupPayload, null, 2);
  const fileName = `backups/db-backup-${triggerType.toLowerCase()}-${dateStr}.json`;

  // 2. Upload to Vercel Blob
  const blob = await put(fileName, jsonContent, {
    access: 'public',
    contentType: 'application/json',
    token,
  });

  return {
    backup: {
      url: blob.url,
      pathname: blob.pathname,
      size: Buffer.byteLength(jsonContent, 'utf-8'),
      uploadedAt: new Date(),
      downloadUrl: blob.downloadUrl,
    },
    metadata,
  };
}

/**
 * List all backups from Vercel Blob
 */
export async function listBackups(): Promise<BackupRecord[]> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return [];
  }

  try {
    const response = await list({
      prefix: 'backups/',
      token,
    });

    return response.blobs.map((blob) => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: new Date(blob.uploadedAt),
      downloadUrl: blob.downloadUrl,
    }));
  } catch (error) {
    console.error('Error listing backups from Vercel Blob:', error);
    return [];
  }
}

/**
 * Delete a specific backup file
 */
export async function deleteBackup(url: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured.');
  }

  await del(url, { token });
}

/**
 * Clean up older backups, keeping only the most recent N items (default 30)
 */
export async function pruneOldBackups(keepCount: number = 30): Promise<number> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return 0;

  const backups = await listBackups();
  if (backups.length <= keepCount) {
    return 0;
  }

  // Sort newest first
  backups.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  const toDelete = backups.slice(keepCount);

  if (toDelete.length > 0) {
    await del(
      toDelete.map((b) => b.url),
      { token }
    );
  }

  return toDelete.length;
}
