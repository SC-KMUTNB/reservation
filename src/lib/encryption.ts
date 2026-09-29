import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const PREFIX = 'enc:v1:';

function getEncryptionKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    process.env.JWT_SECRET ||
    'kmutnb-council-reservation-secret-encryption-key-2026';
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
export function decryptSecret(cipherString: string): string {
  if (!cipherString || !cipherString.startsWith(PREFIX)) {
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
 * List of setting keys that must be encrypted at rest in the database.
 */
export const SENSITIVE_SETTING_KEYS = [
  'smtp_pass',
  'google_private_key',
];
