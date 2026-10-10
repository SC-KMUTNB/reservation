import nodemailer from 'nodemailer';
import { prisma } from './prisma';
import { decryptSecret } from './encryption';
import { recordAuditLog } from './audit';
import { getAppBaseUrl } from './app-url';

export type EmailRecipient = string | { name: string; address: string };

export interface EmailOptions {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
}

export type EmailRecipientTarget = 'BOTH' | 'ADMIN_ONLY' | 'BOOKING_PERSON';

export interface EmailConfig {
  provider: 'DISABLED' | 'SMTP' | 'AUTO';
  recipientTarget: EmailRecipientTarget;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  adminEmail?: string;
}

/**
 * Retrieve active email configuration from DB (SiteSetting) with decryption,
 * falling back to process.env variables.
 */
export async function getEmailConfig(): Promise<EmailConfig> {
  let settingsMap: Record<string, string> = {};
  try {
    const records = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: [
            'email_provider',
            'email_recipient_target',
            'smtp_host',
            'smtp_port',
            'smtp_secure',
            'smtp_user',
            'smtp_pass',
            'smtp_from',
            'admin_notification_email',
            'contact_email',
          ],
        },
      },
    });
    for (const r of records) {
      settingsMap[r.key] = r.value;
    }
  } catch (err) {
    console.warn('Could not read email settings from DB, using env fallback:', err);
  }

  const rawProvider = (settingsMap['email_provider'] || process.env.EMAIL_PROVIDER || 'SMTP').toUpperCase();
  const provider = (['DISABLED', 'SMTP', 'AUTO'].includes(rawProvider)
    ? rawProvider
    : 'SMTP') as EmailConfig['provider'];

  const rawRecipientTarget = (settingsMap['email_recipient_target'] || process.env.EMAIL_RECIPIENT_TARGET || 'BOTH').toUpperCase();
  const recipientTarget: EmailRecipientTarget = (['BOTH', 'ADMIN_ONLY', 'BOOKING_PERSON'].includes(rawRecipientTarget)
    ? rawRecipientTarget
    : 'BOTH') as EmailRecipientTarget;

  const smtpHost = settingsMap['smtp_host'] || process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(settingsMap['smtp_port'] || process.env.SMTP_PORT || '465', 10);
  const smtpSecure =
    settingsMap['smtp_secure'] === 'true' ||
    process.env.SMTP_SECURE === 'true' ||
    smtpPort === 465;
  const smtpUser = settingsMap['smtp_user'] || process.env.SMTP_USER || 'sc.kmutnb65@gmail.com';
  const smtpPass = decryptSecret(settingsMap['smtp_pass'] || '') || process.env.SMTP_PASS || '';
  const smtpFrom =
    settingsMap['smtp_from'] ||
    process.env.SMTP_FROM ||
    `"สภานักศึกษา มจพ." <${smtpUser || 'sc.kmutnb65@gmail.com'}>`;

  const adminEmail =
    settingsMap['admin_notification_email'] ||
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    settingsMap['contact_email'] ||
    'sc.kmutnb65@gmail.com';

  return {
    provider,
    recipientTarget,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    smtpFrom,
    adminEmail,
  };
}

export function shouldNotifyAdmin(config: EmailConfig): boolean {
  if (config.provider === 'DISABLED') return false;
  return config.recipientTarget === 'BOTH' || config.recipientTarget === 'ADMIN_ONLY';
}

export function shouldNotifyUser(config: EmailConfig): boolean {
  if (config.provider === 'DISABLED') return false;
  return config.recipientTarget === 'BOTH' || config.recipientTarget === 'BOOKING_PERSON';
}

/**
 * Send email via SMTP (Nodemailer)
 */
async function sendViaSmtp(options: EmailOptions, config: EmailConfig): Promise<boolean> {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    throw new Error('SMTP credentials are not fully configured');
  }

  // Remove whitespace from app passwords if present (e.g. Google App Password "wlnm rdto hupq mxau")
  const cleanPass = config.smtpPass.replace(/\s+/g, '');

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: cleanPass,
    },
  });

  await transporter.sendMail({
    from: config.smtpFrom,
    to: options.to as any,
    subject: options.subject,
    text: options.text || options.html.replace(/<[^>]+>/g, ''),
    html: options.html,
  });

  return true;
}

/**
 * Core dispatch function using Google / standard SMTP
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; provider?: string; error?: string }> {
  try {
    const config = await getEmailConfig();

    if (config.provider === 'DISABLED') {
      return { success: true, provider: 'DISABLED' };
    }

    const hasSmtp = Boolean(config.smtpHost && config.smtpUser && config.smtpPass);
    if (!hasSmtp) {
      return { success: true, provider: 'UNCONFIGURED' };
    }

    await sendViaSmtp(options, config);
    return { success: true, provider: 'SMTP' };
  } catch (error: any) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message || 'Unknown email error' };
  }
}

// ----------------- Notification Templates ----------------- //

function emailWrapper(title: string, contentHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 32px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">สภานักศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ</h1>
              <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">ระบบบริหารจัดการและจองห้องประชุมสภานักศึกษา</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 30px;">
              ${contentHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                อีเมลนี้เป็นข้อความอัตโนมัติจากระบบ กรุณาอย่าตอบกลับ<br>
                สภานักศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (มจพ.)
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * 1. Notify Admin when a new booking is submitted.
 */
export async function notifyAdminNewBooking(booking: {
  bookingCode: string;
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  department: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}) {
  const config = await getEmailConfig();
  if (!shouldNotifyAdmin(config)) {
    return { success: true, provider: 'SKIPPED_RECIPIENT_TARGET' };
  }

  const baseUrl = await getAppBaseUrl();

  const html = emailWrapper(
    'แจ้งเตือนคำขอจองห้องประชุมใหม่',
    `
    <div style="margin-bottom: 24px;">
      <span style="background-color: #ffedd5; color: #c2410c; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
        คำขอใหม่รอการอนุมัติ (PENDING)
      </span>
      <h2 style="margin: 12px 0 6px; font-size: 18px; color: #0f172a;">มีรายการจองห้องประชุมใหม่ส่งเข้ามาในระบบ</h2>
      <p style="margin: 0; font-size: 14px; color: #64748b;">รหัสการจอง: <strong style="font-family: monospace; color: #ea580c;">${booking.bookingCode}</strong></p>
    </div>

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px; font-size: 13px; line-height: 1.8;">
      <tr>
        <td style="color: #64748b; width: 35%;">ผู้ขอใช้ห้อง:</td>
        <td style="color: #0f172a; font-weight: 600;">${booking.fullName} (${booking.studentId})</td>
      </tr>
      <tr>
        <td style="color: #64748b;">หน่วยงาน/คณะ:</td>
        <td style="color: #0f172a;">${booking.department}</td>
      </tr>
      <tr>
        <td style="color: #64748b;">อีเมล / โทรศัพท์:</td>
        <td style="color: #0f172a;">${booking.email} / ${booking.phone}</td>
      </tr>
      <tr>
        <td style="color: #64748b;">วันที่ขอใช้งาน:</td>
        <td style="color: #0f172a; font-weight: 600;">${booking.date}</td>
      </tr>
      <tr>
        <td style="color: #64748b;">ช่วงเวลา:</td>
        <td style="color: #0f172a; font-weight: 600;">${booking.startTime} - ${booking.endTime} น.</td>
      </tr>
      <tr>
        <td style="color: #64748b; vertical-align: top;">วัตถุประสงค์:</td>
        <td style="color: #0f172a;">${booking.reason}</td>
      </tr>
    </table>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${baseUrl}/admin/dashboard" style="background-color: #ea580c; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-size: 13px; font-weight: 700; display: inline-block;">
        เข้าสู่ระบบแอดมินเพื่อพิจารณาคำขอ &rarr;
      </a>
    </div>
    `
  );

  const res = await sendEmail({
    to: {
      name: 'ผู้ดูแลระบบ สภานักศึกษา',
      address: config.adminEmail || 'sc.kmutnb65@gmail.com',
    },
    subject: `[คำขอจองห้องประชุมใหม่] ${booking.bookingCode} - ${booking.fullName} (${booking.date})`,
    html,
  });

  if (!res.success) {
    console.error(`Admin notification email failed (${config.adminEmail}):`, res.error);
    await recordAuditLog({
      action: 'EMAIL_DELIVERY_FAILED',
      details: `ส่งอีเมลแจ้งเตือนแอดมินล้มเหลว (${config.adminEmail}) รหัส ${booking.bookingCode}: ${res.error}`,
      actorName: 'ระบบแจ้งเตือนอัตโนมัติ',
      actorRole: 'SYSTEM',
    });
  } else if (res.provider && res.provider !== 'DISABLED' && res.provider !== 'UNCONFIGURED') {
    await recordAuditLog({
      action: 'EMAIL_DELIVERED',
      details: `ส่งอีเมลแจ้งเตือนคำขอใหม่ ${booking.bookingCode} ไปยังแอดมิน (${config.adminEmail}) สำเร็จ ผ่าน ${res.provider}`,
      actorName: 'ระบบแจ้งเตือนอัตโนมัติ',
      actorRole: 'SYSTEM',
    });
  }

  return res;
}

/**
 * 2. Send booking confirmation to the user upon submission.
 */
export async function notifyUserBookingReceived(booking: {
  bookingCode: string;
  fullName: string;
  email: string;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  reason: string;
}) {
  const config = await getEmailConfig();
  if (config.provider === 'DISABLED') {
    return { success: true, provider: 'DISABLED' };
  }

  // Build combined recipients list (Booker and Admin)
  const recipients: Array<{ name: string; address: string }> = [];

  if (shouldNotifyUser(config) && booking.email) {
    recipients.push({
      name: booking.fullName || 'ผู้ขอใช้บริการ',
      address: booking.email.trim(),
    });
  }

  if (shouldNotifyAdmin(config) && config.adminEmail) {
    const adminAddr = config.adminEmail.trim();
    const alreadyPresent = recipients.some(
      (r) => r.address.toLowerCase() === adminAddr.toLowerCase()
    );
    if (!alreadyPresent) {
      recipients.push({
        name: 'ผู้ดูแลระบบ สภานักศึกษา',
        address: adminAddr,
      });
    }
  }

  if (recipients.length === 0) {
    return { success: true, provider: 'SKIPPED_RECIPIENT_TARGET' };
  }

  const baseUrl = await getAppBaseUrl();
  const trackUrl = `${baseUrl}/track?q=${encodeURIComponent(booking.bookingCode)}`;

  const html = emailWrapper(
    'ระบบได้รับคำขอจองห้องประชุมของท่านแล้ว',
    `
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 6px; font-size: 18px; color: #0f172a;">เรียน คุณ ${booking.fullName}</h2>
      <p style="margin: 0; font-size: 14px; color: #64748b;">ระบบได้รับคำขอจองห้องประชุมสภานักศึกษาของท่านเรียบร้อยแล้ว ขณะนี้อยู่ระหว่างรอเจ้าหน้าที่ตรวจสอบและอนุมัติ</p>
    </div>

    <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px; margin-bottom: 20px; text-align: center;">
      <div style="font-size: 12px; color: #9a3412; font-weight: 700; text-transform: uppercase;">รหัสการจองของท่าน (Booking Code)</div>
      <div style="font-size: 24px; font-family: monospace; font-weight: 800; color: #ea580c; margin-top: 4px;">${booking.bookingCode}</div>
    </div>

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px; font-size: 13px; line-height: 1.8;">
      <tr>
        <td style="color: #64748b; width: 35%;">วันที่จอง:</td>
        <td style="color: #0f172a; font-weight: 600;">${booking.date}</td>
      </tr>
      <tr>
        <td style="color: #64748b;">เวลา:</td>
        <td style="color: #0f172a; font-weight: 600;">${booking.startTime} - ${booking.endTime} น.</td>
      </tr>
      <tr>
        <td style="color: #64748b;">หน่วยงาน/คณะ:</td>
        <td style="color: #0f172a;">${booking.department}</td>
      </tr>
      <tr>
        <td style="color: #64748b; vertical-align: top;">วัตถุประสงค์:</td>
        <td style="color: #0f172a;">${booking.reason}</td>
      </tr>
      <tr>
        <td style="color: #64748b;">สถานะปัจจุบัน:</td>
        <td><span style="background-color: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">รอการอนุมัติ (PENDING)</span></td>
      </tr>
    </table>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${trackUrl}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-size: 13px; font-weight: 700; display: inline-block;">
        ติดตามสถานะคำขอแบบเรียลไทม์ &rarr;
      </a>
    </div>
    `
  );

  const res = await sendEmail({
    to: recipients,
    subject: `[สภานักศึกษา มจพ.] ได้รับคำขอจองห้องประชุมแล้ว - ${booking.bookingCode}`,
    html,
  });

  const recipientsSummary = recipients.map((r) => `${r.name} <${r.address}>`).join(', ');

  if (!res.success) {
    console.error(`User booking confirmation email failed (${recipientsSummary}):`, res.error);
    await recordAuditLog({
      action: 'EMAIL_DELIVERY_FAILED',
      details: `ส่งอีเมลแจ้งเตือนผู้จองล้มเหลว (${recipientsSummary}) รหัส ${booking.bookingCode}: ${res.error}`,
      actorName: 'ระบบแจ้งเตือนอัตโนมัติ',
      actorRole: 'SYSTEM',
    });
  } else if (res.provider && res.provider !== 'DISABLED' && res.provider !== 'UNCONFIGURED') {
    await recordAuditLog({
      action: 'EMAIL_DELIVERED',
      details: `ส่งอีเมลยืนยันคำขอไปยัง ${recipientsSummary} สำเร็จ รหัส ${booking.bookingCode} ผ่าน ${res.provider}`,
      actorName: 'ระบบแจ้งเตือนอัตโนมัติ',
      actorRole: 'SYSTEM',
    });
  }

  return res;
}

/**
 * 3. Notify user and admin when booking status changes (Approved, Rejected, Cancelled).
 * Sends a single email with BOTH Booker and Admin as recipients in the format:
 * [ { name: "...", address: "..." }, { name: "...", address: "..." } ]
 */
export async function notifyUserBookingStatusUpdate(booking: {
  bookingCode: string;
  fullName: string;
  email: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'APPROVED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string | null;
}) {
  const config = await getEmailConfig();
  if (config.provider === 'DISABLED') {
    return { success: true, provider: 'DISABLED' };
  }

  // Build combined recipients list (Booker and Admin in one email)
  const recipients: Array<{ name: string; address: string }> = [];

  if (shouldNotifyUser(config) && booking.email) {
    recipients.push({
      name: booking.fullName || 'ผู้ขอใช้บริการ',
      address: booking.email.trim(),
    });
  }

  if (shouldNotifyAdmin(config) && config.adminEmail) {
    const adminAddr = config.adminEmail.trim();
    const alreadyPresent = recipients.some(
      (r) => r.address.toLowerCase() === adminAddr.toLowerCase()
    );
    if (!alreadyPresent) {
      recipients.push({
        name: 'ผู้ดูแลระบบ สภานักศึกษา',
        address: adminAddr,
      });
    }
  }

  if (recipients.length === 0) {
    return { success: true, provider: 'SKIPPED_RECIPIENT_TARGET' };
  }

  const baseUrl = await getAppBaseUrl();
  const trackUrl = `${baseUrl}/track?q=${encodeURIComponent(booking.bookingCode)}`;

  let badgeColor = '#dcfce7';
  let badgeTextColor = '#15803d';
  let statusText = 'ได้รับการอนุมัติ (APPROVED)';
  let headline = 'คำขอจองห้องประชุมของท่านได้รับการอนุมัติแล้ว';
  let subMessage = 'ยินดีด้วย! คำขอจองห้องประชุมของท่านได้รับการตรวจสอบและอนุมัติเรียบร้อยแล้ว ท่านสามารถเข้าใช้งานห้องประชุมได้ตามวันและเวลาที่ระบุ';

  if (booking.status === 'REJECTED') {
    badgeColor = '#fee2e2';
    badgeTextColor = '#b91c1c';
    statusText = 'ถูกปฏิเสธ (REJECTED)';
    headline = 'คำขอจองห้องประชุมของท่านไม่ผ่านการอนุมัติ';
    subMessage = `ขออภัย คำขอจองห้องประชุมของท่านไม่สามารถอนุมัติได้ เนื่องจาก: <strong>${booking.rejectionReason || 'ช่วงเวลาดังกล่าวไม่พร้อมให้บริการหรือเหตุผลทางระเบียบ'}</strong>`;
  } else if (booking.status === 'CANCELLED') {
    badgeColor = '#f1f5f9';
    badgeTextColor = '#475569';
    statusText = 'ยกเลิกรายการแล้ว (CANCELLED)';
    headline = 'การจองห้องประชุมถูกยกเลิกแล้ว';
    subMessage = 'รายการจองห้องประชุมของท่านได้รับการยกเลิกเรียบร้อยแล้ว';
  }

  const html = emailWrapper(
    headline,
    `
    <div style="margin-bottom: 24px;">
      <span style="background-color: ${badgeColor}; color: ${badgeTextColor}; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
        ${statusText}
      </span>
      <h2 style="margin: 14px 0 8px; font-size: 18px; color: #0f172a;">เรียน คุณ ${booking.fullName}</h2>
      <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6;">${subMessage}</p>
    </div>

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px; font-size: 13px; line-height: 1.8;">
      <tr>
        <td style="color: #64748b; width: 35%;">รหัสการจอง:</td>
        <td style="color: #ea580c; font-weight: 700; font-family: monospace;">${booking.bookingCode}</td>
      </tr>
      <tr>
        <td style="color: #64748b;">วันที่ใช้งาน:</td>
        <td style="color: #0f172a; font-weight: 600;">${booking.date}</td>
      </tr>
      <tr>
        <td style="color: #64748b;">เวลา:</td>
        <td style="color: #0f172a; font-weight: 600;">${booking.startTime} - ${booking.endTime} น.</td>
      </tr>
      ${
        booking.rejectionReason
          ? `
      <tr>
        <td style="color: #b91c1c; font-weight: 600;">เหตุผลที่ปฏิเสธ:</td>
        <td style="color: #b91c1c;">${booking.rejectionReason}</td>
      </tr>`
          : ''
      }
    </table>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${trackUrl}" style="background-color: #ea580c; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-size: 13px; font-weight: 700; display: inline-block;">
        ดูรายละเอียดและหลักฐานการจอง &rarr;
      </a>
    </div>
    `
  );

  const res = await sendEmail({
    to: recipients,
    subject: `[อัปเดตสถานะ] คำขอจองห้องประชุม ${booking.bookingCode} - ${booking.status}`,
    html,
  });

  const recipientsSummary = recipients.map((r) => `${r.name} <${r.address}>`).join(', ');

  if (!res.success) {
    console.error(`Status update email failed (${recipientsSummary}):`, res.error);
    await recordAuditLog({
      action: 'EMAIL_DELIVERY_FAILED',
      details: `ส่งอีเมลอัปเดตสถานะ (${booking.status}) ไปยัง ${recipientsSummary} ล้มเหลว รหัส ${booking.bookingCode}: ${res.error}`,
      actorName: 'ระบบแจ้งเตือนอัตโนมัติ',
      actorRole: 'SYSTEM',
    });
  } else if (res.provider && res.provider !== 'DISABLED' && res.provider !== 'UNCONFIGURED') {
    await recordAuditLog({
      action: 'EMAIL_DELIVERED',
      details: `ส่งอีเมลอัปเดตสถานะ (${booking.status}) ไปยัง ${recipientsSummary} สำเร็จ รหัส ${booking.bookingCode} ผ่าน ${res.provider}`,
      actorName: 'ระบบแจ้งเตือนอัตโนมัติ',
      actorRole: 'SYSTEM',
    });
  }

  return res;
}

/**
 * 4. Send invitation email to a newly created admin with a secure setup password link.
 */
export async function sendAdminInviteEmail(params: {
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  inviteToken: string;
  inviterName?: string;
}) {
  const { email, fullName, role, inviteToken, inviterName } = params;
  const baseUrl = await getAppBaseUrl();
  const setupUrl = `${baseUrl}/admin/setup-password?token=${encodeURIComponent(inviteToken)}`;

  const roleText =
    role === 'SUPER_ADMIN' ? 'Super Admin (ผู้ดูแลระบบหลัก)' : 'Admin (เจ้าหน้าที่ดูแลระบบ)';

  const html = emailWrapper(
    'คำเชิญเข้าร่วมเป็นผู้ดูแลระบบ สภานักศึกษา มจพ.',
    `
    <div style="margin-bottom: 24px;">
      <span style="background-color: #ffedd5; color: #c2410c; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
        คำเชิญผู้ดูแลระบบใหม่ (ADMIN INVITATION)
      </span>
      <h2 style="margin: 14px 0 8px; font-size: 18px; color: #0f172a;">เรียน คุณ ${fullName}</h2>
      <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6;">
        ${inviterName ? `<strong>${inviterName}</strong> ได้ส่งคำเชิญ` : 'คุณได้รับคำเชิญ'}ให้เข้าร่วมเป็นผู้ดูแลระบบในระบบบริหารจัดการและจองห้องประชุม สภานักศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (มจพ.)
      </p>
    </div>

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px; font-size: 13px; line-height: 1.8;">
      <tr>
        <td style="color: #64748b; width: 35%;">ชื่อ-นามสกุล:</td>
        <td style="color: #0f172a; font-weight: 600;">${fullName}</td>
      </tr>
      <tr>
        <td style="color: #64748b;">อีเมลบัญชี:</td>
        <td style="color: #0f172a; font-weight: 600; font-family: monospace;">${email}</td>
      </tr>
      <tr>
        <td style="color: #64748b;">ระดับสิทธิ์ (Role):</td>
        <td>
          <span style="background-color: ${role === 'SUPER_ADMIN' ? '#ffedd5' : '#eff6ff'}; color: ${role === 'SUPER_ADMIN' ? '#c2410c' : '#1d4ed8'}; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">
            ${roleText}
          </span>
        </td>
      </tr>
      <tr>
        <td style="color: #64748b;">อายุการใช้งานลิงก์:</td>
        <td style="color: #dc2626; font-weight: 600;">48 ชั่วโมง (ใช้งานได้เพียงครั้งเดียว)</td>
      </tr>
    </table>

    <div style="text-align: center; margin: 30px 0 20px;">
      <a href="${setupUrl}" style="background-color: #ea580c; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 14px; font-size: 14px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);">
        สร้างรหัสผ่านและเปิดใช้งานบัญชี &rarr;
      </a>
    </div>

    <p style="margin: 20px 0 0; font-size: 11px; color: #94a3b8; text-align: center; word-break: break-all;">
      หากปุ่มด้านบนไม่ทำงาน สามารถคัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์:<br>
      <a href="${setupUrl}" style="color: #ea580c;">${setupUrl}</a>
    </p>
    `
  );

  const res = await sendEmail({
    to: {
      name: fullName,
      address: email.trim(),
    },
    subject: `[คำเชิญผู้ดูแลระบบ] เข้าร่วมดูแลระบบจองห้องประชุม สภานักศึกษา มจพ.`,
    html,
  });

  if (!res.success) {
    console.error(`Invite email failed (${email}):`, res.error);
    await recordAuditLog({
      action: 'EMAIL_DELIVERY_FAILED',
      details: `ส่งอีเมลคำเชิญแอดมินล้มเหลว (${email}): ${res.error}`,
      actorName: 'ระบบแจ้งเตือนอัตโนมัติ',
      actorRole: 'SYSTEM',
    });
  } else if (res.provider && res.provider !== 'DISABLED' && res.provider !== 'UNCONFIGURED') {
    await recordAuditLog({
      action: 'EMAIL_DELIVERED',
      details: `ส่งอีเมลคำเชิญแอดมินไปยัง ${fullName} (${email}) สำเร็จ ผ่าน ${res.provider}`,
      actorName: inviterName || 'ระบบแจ้งเตือนอัตโนมัติ',
      actorRole: 'SYSTEM',
    });
  }

  return res;
}
