import { describe, it, expect } from 'vitest';
import {
  encryptSecret,
  decryptSecret,
  encryptBackupPayload,
  decryptBackupPayload,
  isEncrypted,
} from '../src/lib/encryption';
import { validateBackupPayload } from '../src/lib/restore';
import type { BackupData } from '../src/lib/backup';

describe('Backup and Secret Encryption (AES-256-GCM)', () => {
  it('should encrypt and decrypt secrets correctly', () => {
    const rawSecret = 'super-secret-password-12345';
    const encrypted = encryptSecret(rawSecret);

    expect(isEncrypted(encrypted)).toBe(true);
    expect(encrypted).not.toBe(rawSecret);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawSecret);
  });

  it('should safely handle plain text strings in decryptSecret', () => {
    expect(decryptSecret('already-plain')).toBe('already-plain');
    expect(decryptSecret('')).toBe('');
    expect(decryptSecret(null)).toBe('');
  });

  it('should encrypt backup payload into an envelope and decrypt back to original object', () => {
    const sampleBackup: BackupData = {
      metadata: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        totalBookings: 1,
        totalSettings: 1,
        totalAuditLogs: 0,
      },
      bookings: [
        {
          id: 'b1',
          bookingNumber: 'BK-001',
          room: 'Conference A',
          date: '2026-10-20',
          startTime: '09:00',
          endTime: '10:00',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          status: 'APPROVED',
          approverId: null,
          title: 'Meeting',
          purpose: 'Testing',
          department: 'IT',
          phone: '0812345678',
          organization: null,
          userSub: null,
          userProvider: null,
          attendees: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          adminNote: null,
          rejectReason: null,
        },
      ],
      settings: [
        {
          id: 's1',
          key: 'site_title',
          value: 'Reservation System',
          description: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      auditLogs: [],
    };

    const envelope = encryptBackupPayload(sampleBackup);

    expect(envelope.encrypted).toBe(true);
    expect(envelope.algorithm).toBe('aes-256-gcm');
    expect(typeof envelope.iv).toBe('string');
    expect(typeof envelope.tag).toBe('string');
    expect(typeof envelope.data).toBe('string');

    // Decrypt
    const restored = decryptBackupPayload<BackupData>(envelope);
    expect(validateBackupPayload(restored)).toBe(true);
    expect(restored.metadata.totalBookings).toBe(1);
    expect(restored.bookings[0].bookingNumber).toBe('BK-001');
    expect(restored.settings[0].key).toBe('site_title');
  });

  it('should seamlessly accept unencrypted legacy backup objects', () => {
    const legacyBackup: BackupData = {
      metadata: {
        version: '1.0',
        createdAt: '2026-10-18T00:00:00.000Z',
        totalBookings: 0,
        totalSettings: 0,
        totalAuditLogs: 0,
      },
      bookings: [],
      settings: [],
      auditLogs: [],
    };

    const result = decryptBackupPayload<BackupData>(legacyBackup);
    expect(result).toEqual(legacyBackup);
    expect(validateBackupPayload(result)).toBe(true);
  });

  it('should throw an error on corrupted ciphertext or invalid envelope', () => {
    const corruptedEnvelope = {
      encrypted: true,
      version: '1.0',
      algorithm: 'aes-256-gcm',
      iv: 'deadbeef0000000000000000',
      tag: 'deadbeef000000000000000000000000',
      data: 'badhexdata',
    };

    expect(() => decryptBackupPayload(corruptedEnvelope)).toThrow();
  });
});
