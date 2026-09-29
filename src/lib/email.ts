import nodemailer from 'nodemailer';
import { prisma } from './prisma';
import { decryptSecret } from './encryption';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailConfig {
  provider: 'DISABLED' | 'SMTP' | 'RESEND' | 'AUTO';
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  resendApiKey?: string;
  resendFrom?: string;
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
            'smtp_host',
            'smtp_port',
            'smtp_secure',
            'smtp_user',
            'smtp_pass',
            'smtp_from',
            'resend_api_key',
            'resend_from',
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

  const rawProvider = (settingsMap['email_provider'] || process.env.EMAIL_PROVIDER || 'AUTO').toUpperCase();
  const provider = (['DISABLED', 'SMTP', 'RESEND', 'AUTO'].includes(rawProvider)
    ? rawProvider
    : 'AUTO') as EmailConfig['provider'];

  const smtpHost = settingsMap['smtp_host'] || process.env.SMTP_HOST || '';
  const smtpPort = parseInt(settingsMap['smtp_port'] || process.env.SMTP_PORT || '587', 10);
  const smtpSecure =
    settingsMap['smtp_secure'] === 'true' ||
    process.env.SMTP_SECURE === 'true' ||
    smtpPort === 465;
  const smtpUser = settingsMap['smtp_user'] || process.env.SMTP_USER || '';
  const smtpPass = decryptSecret(settingsMap['smtp_pass'] || '') || process.env.SMTP_PASS || '';
  const smtpFrom =
    settingsMap['smtp_from'] ||
    process.env.SMTP_FROM ||
    `"สภานักศึกษา มจพ." <${smtpUser || 'council@kmutnb.ac.th'}>`;

  const resendApiKey = decryptSecret(settingsMap['resend_api_key'] || '') || process.env.RESEND_API_KEY || '';
  const resendFrom =
    settingsMap['resend_from'] ||
    process.env.RESEND_FROM ||
    'สภานักศึกษา มจพ. <onboarding@resend.dev>';

  const adminEmail =
    settingsMap['admin_notification_email'] ||
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    settingsMap['contact_email'] ||
    'council@kmutnb.ac.th';

  return {
    provider,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    smtpFrom,
    resendApiKey,
    resendFrom,
    adminEmail,
  };
}

/**
 * Send email via SMTP (Nodemailer)
 */
async function sendViaSmtp(options: EmailOptions, config: EmailConfig): Promise<boolean> {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    throw new Error('SMTP credentials are not fully configured');
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });

  await transporter.sendMail({
    from: config.smtpFrom,
    to: options.to,
    subject: options.subject,
    text: options.text || options.html.replace(/<[^>]+>/g, ''),
    html: options.html,
  });

  return true;
}

/**
 * Send email via Resend API (Direct HTTP request)
 */
async function sendViaResend(options: EmailOptions, config: EmailConfig): Promise<boolean> {
  if (!config.resendApiKey) {
    throw new Error('Resend API Key is not configured');
  }

  const toList = Array.isArray(options.to) ? options.to : [options.to];
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.resendFrom,
      to: toList,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]+>/g, ''),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errorBody}`);
  }

  return true;
}

/**
 * Core dispatch function with graceful fallback between SMTP and Resend.
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; provider?: string; error?: string }> {
  try {
    const config = await getEmailConfig();

    if (config.provider === 'DISABLED') {
      return { success: true, provider: 'DISABLED' };
    }

    const hasSmtp = Boolean(config.smtpHost && config.smtpUser && config.smtpPass);
    const hasResend = Boolean(config.resendApiKey);

    if (!hasSmtp && !hasResend) {
      // Cleanly skip when no email provider is configured
      return { success: true, provider: 'UNCONFIGURED' };
    }

    // Determine initial attempt order
    const trySmtpFirst =
      config.provider === 'SMTP' ||
      (config.provider === 'AUTO' && hasSmtp);

    if (trySmtpFirst) {
      try {
        await sendViaSmtp(options, config);
        return { success: true, provider: 'SMTP' };
      } catch (smtpErr) {
        console.warn('SMTP delivery failed, attempting fallback to Resend if available:', smtpErr);
        if (hasResend) {
          await sendViaResend(options, config);
          return { success: true, provider: 'RESEND' };
        }
        throw smtpErr;
      }
    } else {
      try {
        await sendViaResend(options, config);
        return { success: true, provider: 'RESEND' };
      } catch (resendErr) {
        console.warn('Resend delivery failed, attempting fallback to SMTP if available:', resendErr);
        if (hasSmtp) {
          await sendViaSmtp(options, config);
          return { success: true, provider: 'SMTP' };
        }
        throw resendErr;
      }
    }
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
  const baseUrl = process.env.NEXTAUTH_URL || process.env.BASE_URL || 'http://localhost:3000';

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

  return sendEmail({
    to: config.adminEmail || 'council@kmutnb.ac.th',
    subject: `[คำขอจองห้องประชุมใหม่] ${booking.bookingCode} - ${booking.fullName} (${booking.date})`,
    html,
  });
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
  const baseUrl = process.env.NEXTAUTH_URL || process.env.BASE_URL || 'http://localhost:3000';
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

  return sendEmail({
    to: booking.email,
    subject: `[สภานักศึกษา มจพ.] ได้รับคำขอจองห้องประชุมแล้ว - ${booking.bookingCode}`,
    html,
  });
}

/**
 * 3. Notify user when booking status changes (Approved, Rejected, Cancelled).
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
  const baseUrl = process.env.NEXTAUTH_URL || process.env.BASE_URL || 'http://localhost:3000';
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

  return sendEmail({
    to: booking.email,
    subject: `[อัปเดตสถานะ] คำขอจองห้องประชุม ${booking.bookingCode} - ${booking.status}`,
    html,
  });
}
