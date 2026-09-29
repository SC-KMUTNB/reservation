import { JWT } from 'google-auth-library';
import { prisma } from './prisma';
import { decryptSecret } from './encryption';

export interface GoogleSheetConfig {
  syncMode: 'DISABLED' | 'APPS_SCRIPT_WEBHOOK' | 'SERVICE_ACCOUNT' | 'AUTO';
  webhookUrl?: string;
  sheetId?: string;
  serviceAccountEmail?: string;
  privateKey?: string;
  sheetName?: string;
}

export interface BookingSyncPayload {
  bookingCode: string;
  date: string;
  startTime: string;
  endTime: string;
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  department: string;
  reason: string;
  status: string;
  rejectionReason?: string | null;
  approvedBy?: string | null;
  createdAt?: string | Date;
}

export async function getGoogleSheetConfig(): Promise<GoogleSheetConfig> {
  let settingsMap: Record<string, string> = {};
  try {
    const records = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: [
            'google_sheet_sync_mode',
            'google_sheet_webhook_url',
            'google_sheet_id',
            'google_service_account_email',
            'google_private_key',
            'google_sheet_name',
          ],
        },
      },
    });
    for (const r of records) {
      settingsMap[r.key] = r.value;
    }
  } catch (err) {
    console.warn('Could not read Google Sheet settings from DB, using env fallback:', err);
  }

  const rawMode = (settingsMap['google_sheet_sync_mode'] || process.env.GOOGLE_SHEET_SYNC_MODE || 'AUTO').toUpperCase();
  const syncMode = (['DISABLED', 'APPS_SCRIPT_WEBHOOK', 'SERVICE_ACCOUNT', 'AUTO'].includes(rawMode)
    ? rawMode
    : 'AUTO') as GoogleSheetConfig['syncMode'];

  const webhookUrl = settingsMap['google_sheet_webhook_url'] || process.env.GOOGLE_SHEET_WEBHOOK_URL || '';
  const sheetId = settingsMap['google_sheet_id'] || process.env.GOOGLE_SHEET_ID || '';
  const serviceAccountEmail =
    settingsMap['google_service_account_email'] || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  
  let privateKey = decryptSecret(settingsMap['google_private_key'] || '') || process.env.GOOGLE_PRIVATE_KEY || '';
  // Fix escaped newlines if passed through env
  if (privateKey && privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const sheetName = settingsMap['google_sheet_name'] || process.env.GOOGLE_SHEET_NAME || 'ตารางจอง';

  return {
    syncMode,
    webhookUrl,
    sheetId,
    serviceAccountEmail,
    privateKey,
    sheetName,
  };
}

/**
 * Send real-time update via Google Apps Script Webhook
 */
async function syncViaWebhook(payload: BookingSyncPayload, action: 'CREATE' | 'UPDATE', webhookUrl: string) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      ...payload,
      room: 'ห้องประชุมสภานักศึกษา',
      timestamp: payload.createdAt ? new Date(payload.createdAt).toISOString() : new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Apps Script Webhook error (${response.status}): ${errorText}`);
  }

  return true;
}

/**
 * Append row directly to Google Sheets using Google Sheets API v4 with Service Account
 */
async function syncViaServiceAccount(
  payload: BookingSyncPayload,
  action: 'CREATE' | 'UPDATE',
  config: GoogleSheetConfig
) {
  if (!config.sheetId || !config.serviceAccountEmail || !config.privateKey) {
    throw new Error('Google Service Account credentials or Sheet ID are missing');
  }

  const auth = new JWT({
    email: config.serviceAccountEmail,
    key: config.privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const token = await auth.authorize();
  const accessToken = token.access_token;
  if (!accessToken) {
    throw new Error('Failed to obtain Google access token');
  }

  const sheetName = encodeURIComponent(config.sheetName || 'ตารางจอง');
  const timestamp = payload.createdAt ? new Date(payload.createdAt).toISOString() : new Date().toISOString();

  // Row format matching the standard form:
  // [Timestamp, Name, Department, Email, Date, Start, End, Room, Reason, Phone, BookingCode, Status]
  const rowValues = [
    timestamp,
    payload.fullName,
    payload.department,
    payload.email,
    payload.date,
    payload.startTime,
    payload.endTime,
    'ห้องประชุมสภานักศึกษา',
    payload.reason,
    payload.phone,
    payload.bookingCode,
    payload.status,
  ];

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${sheetName}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const appendRes = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: `${config.sheetName}!A:L`,
      majorDimension: 'ROWS',
      values: [rowValues],
    }),
  });

  if (!appendRes.ok) {
    const errBody = await appendRes.text();
    throw new Error(`Google Sheets API append error (${appendRes.status}): ${errBody}`);
  }

  return true;
}

/**
 * Main real-time sync function
 */
export async function syncBookingToGoogleSheet(
  payload: BookingSyncPayload,
  action: 'CREATE' | 'UPDATE' = 'CREATE'
): Promise<{ success: boolean; mode?: string; error?: string }> {
  try {
    const config = await getGoogleSheetConfig();

    if (config.syncMode === 'DISABLED') {
      return { success: true, mode: 'DISABLED' };
    }

    const hasWebhook = Boolean(config.webhookUrl);
    const hasServiceAccount = Boolean(config.sheetId && config.serviceAccountEmail && config.privateKey);

    if (!hasWebhook && !hasServiceAccount) {
      return { success: true, mode: 'UNCONFIGURED' };
    }

    const useWebhook =
      config.syncMode === 'APPS_SCRIPT_WEBHOOK' ||
      (config.syncMode === 'AUTO' && hasWebhook);

    if (useWebhook && hasWebhook) {
      await syncViaWebhook(payload, action, config.webhookUrl!);
      return { success: true, mode: 'APPS_SCRIPT_WEBHOOK' };
    } else if (hasServiceAccount) {
      await syncViaServiceAccount(payload, action, config);
      return { success: true, mode: 'SERVICE_ACCOUNT' };
    }

    return { success: true, mode: 'SKIPPED' };
  } catch (error: any) {
    console.error('Google Sheet real-time sync error:', error);
    return { success: false, error: error.message || 'Unknown Google Sheet sync error' };
  }
}
