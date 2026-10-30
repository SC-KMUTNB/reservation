import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const PREFIX = 'enc:v1:';

const isTest = process.env.NODE_ENV === 'test';

if (!isTest) {
  const encSecret = process.env.ENCRYPTION_SECRET;
  if (!encSecret || encSecret.length < 32) {
    throw new Error(
      'SECURITY ERROR: ENCRYPTION_SECRET environment variable is missing or shorter than 32 characters. Please refer to .env.example to set a secure secret.'
    );
  }
}

function getEncryptionKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    (isTest ? 'test-fallback-encryption-secret-key-kmutnb-32chars' : '');
  // Use SHA-256 to ensure a solid 32-byte key
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encryptSecret(plainText: string): string {
  if (!plainText || plainText.startsWith(PREFIX)) {
    return plainText;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a ciphertext string if it starts with the enc:v1: prefix.
 * If not encrypted or fails, handles gracefully.
 */
export function decryptSecret(cipherString?: string | null): string {
  if (!cipherString) {
    return '';
  }
  if (!cipherString.startsWith(PREFIX)) {
    return cipherString;
  }

  try {
    const raw = cipherString.slice(PREFIX.length);
    const [ivHex, tagHex, encryptedHex] = raw.split(':');

    if (!ivHex || !tagHex || !encryptedHex) {
      return cipherString;
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt secret:', error);
    return '';
  }
}

/**
 * Checks if a string is in the encrypted format.
 */
export function isEncrypted(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/**
 * Mask a secret string for safe display in the Admin UI.
 */
export function maskSecret(value?: string | null): string {
  if (!value) return '';
  return '••••••••••••••••';
}

/**
 * Validate that a Discord webhook URL points strictly to official Discord webhook endpoints.
 * Blocks SSRF and non-Discord targets.
 */
export function isAllowedDiscordUrl(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return (
      (u.hostname === 'discord.com' || u.hostname === 'discordapp.com') &&
      u.pathname.startsWith('/api/webhooks/')
    );
  } catch {
    return false;
  }
}

/**
 * List of setting keys that must be encrypted at rest in the database.
 */
export const SENSITIVE_SETTING_KEYS = [
  'smtp_pass',
  'google_private_key',
  'webhook_discord_url',
  'webhook_line_token',
  'webhook_line_target_id',
];

/**
 * List of setting keys that are safe to expose publicly to unauthenticated users.
 */
export const PUBLIC_SETTING_KEYS = [
  'site_title',
  'site_subtitle',
  'timezone',
  'hero_title',
  'hero_description',
  'rules_content',
  'contact_email',
  'contact_phone',
  'complaint_url',
  'social_facebook',
  'social_facebook_title',
  'social_instagram',
  'social_instagram_title',
  'social_tiktok',
  'social_tiktok_title',
  'app_base_url',
];

export interface EncryptedBackupEnvelope {
  encrypted: true;
  version: string;
  algorithm: string;
  iv: string;
  tag: string;
  data: string;
}

/**
 * Encrypt arbitrary JSON object using AES-256-GCM.
 */
export function encryptBackupPayload<T = any>(payload: T): EncryptedBackupEnvelope {
  const encSecret = process.env.ENCRYPTION_SECRET;
  if (!isTest && (!encSecret || encSecret.length < 32)) {
    throw new Error(
      'SECURITY ERROR: ENCRYPTION_SECRET is missing or shorter than 32 characters. Cannot encrypt backup.'
    );
  }

  const plainText = JSON.stringify(payload);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encrypted: true,
    version: '1.0',
    algorithm: ALGORITHM,
    iv: iv.toString('hex'),
    tag: authTag,
    data: encrypted,
  };
}

/**
 * Decrypt backup envelope or return plain object if unencrypted legacy format.
 */
export function decryptBackupPayload<T = any>(input: any): T {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid backup data format');
  }

  // If already unencrypted object (legacy backup), return as is
  if (!input.encrypted) {
    return input as T;
  }

  const encSecret = process.env.ENCRYPTION_SECRET;
  if (!isTest && (!encSecret || encSecret.length < 32)) {
    throw new Error(
      'SECURITY ERROR: ENCRYPTION_SECRET is missing or shorter than 32 characters. Cannot decrypt backup.'
    );
  }

  const { iv, tag, data } = input;
  if (!iv || !tag || !data) {
    throw new Error('Encrypted backup envelope is missing required cryptographic parameters');
  }

  try {
    const ivBuf = Buffer.from(iv, 'hex');
    const authTagBuf = Buffer.from(tag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), ivBuf);
    decipher.setAuthTag(authTagBuf);

    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted) as T;
  } catch (error: any) {
    throw new Error('ถอดรหัสไฟล์สำรองข้อมูลล้มเหลว (Failed to decrypt backup): ตรวจสอบว่า ENCRYPTION_SECRET ตรงกับชุดที่ใช้สร้างไฟล์');
  }
}

