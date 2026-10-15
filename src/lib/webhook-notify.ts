import { prisma } from './prisma';
import { decryptSecret } from './encryption';
import { getAppBaseUrl } from './app-url';

export interface WebhookConfig {
  enabled: boolean;
  discordUrl?: string;
  lineToken?: string;
  lineTargetId?: string;
}

export async function getWebhookConfig(): Promise<WebhookConfig> {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: [
            'webhook_enabled',
            'webhook_discord_url',
            'webhook_line_token',
            'webhook_line_target_id',
          ],
        },
      },
    });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    const enabled = map['webhook_enabled'] === 'true';
    const discordUrl = decryptSecret(map['webhook_discord_url'] || '');
    const lineToken = decryptSecret(map['webhook_line_token'] || '');
    const lineTargetId = decryptSecret(map['webhook_line_target_id'] || '');

    return {
      enabled,
      discordUrl: discordUrl || undefined,
      lineToken: lineToken || undefined,
      lineTargetId: lineTargetId || undefined,
    };
  } catch (error) {
    console.error('Failed to load webhook config:', error);
    return { enabled: false };
  }
}

export interface WebhookBookingData {
  bookingCode: string;
  fullName: string;
  studentId?: string;
  department: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
  status?: string;
  rejectionReason?: string | null;
}

export async function dispatchWebhookEvent(
  eventType: 'BOOKING_CREATED' | 'BOOKING_CANCELLED' | 'TEST',
  booking: WebhookBookingData
): Promise<{ success: boolean; discord?: boolean; line?: boolean; error?: string }> {
  try {
    const config = await getWebhookConfig();
    if (!config.enabled && eventType !== 'TEST') {
      return { success: true };
    }

    const baseUrl = await getAppBaseUrl();
    const adminDashboardUrl = `${baseUrl}/admin/dashboard`;

    let title = '';
    let color = 0xea580c; // Orange
    let description = '';

    if (eventType === 'BOOKING_CREATED') {
      title = `📌 มีคำขอจองห้องประชุมใหม่ (${booking.bookingCode})`;
      color = 0x2563eb; // Blue
      description = `ผู้ขอใช้งาน: **${booking.fullName}** (${booking.studentId || '-'})\nคณะ/หน่วยงาน: ${booking.department}\nวันที่: **${booking.date}** เวลา **${booking.startTime} - ${booking.endTime} น.**\nวัตถุประสงค์: ${booking.reason || '-'}`;
    } else if (eventType === 'BOOKING_CANCELLED') {
      title = `⚠️ ผู้จองขอยกเลิกการจองห้องประชุม (${booking.bookingCode})`;
      color = 0xdc2626; // Red
      description = `ผู้ขอใช้งาน: **${booking.fullName}**\nวันที่: **${booking.date}** เวลา **${booking.startTime} - ${booking.endTime} น.**\nเหตุผลที่ยกเลิก: ${booking.rejectionReason || 'ไม่ระบุเหตุผล'}`;
    } else {
      title = `🧪 ทดสอบการเชื่อมต่อ Webhook ระบบจองห้องประชุม`;
      color = 0x16a34a; // Green
      description = `การทดสอบส่งข้อความแจ้งเตือนสำเร็จ ระบบสามารถส่งข้อมูลไปยังช่องทางนี้ได้ตามปกติ`;
    }

    let discordSuccess = false;
    let lineSuccess = false;

    // 1. Dispatch Discord Webhook
    if (config.discordUrl) {
      try {
        const discordRes = await fetch(config.discordUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [
              {
                title,
                description,
                color,
                fields: [
                  {
                    name: 'ระบบจัดการแอดมิน',
                    value: `[เข้าสู่ระบบพิจารณาคำขอ](${adminDashboardUrl})`,
                    inline: false,
                  },
                ],
                footer: {
                  text: 'ระบบจองห้องประชุม สภานักศึกษา มจพ.',
                },
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        });
        discordSuccess = discordRes.ok;
      } catch (err) {
        console.error('Discord webhook dispatch failed:', err);
      }
    }

    // 2. Dispatch LINE Messaging API
    if (config.lineToken && config.lineTargetId) {
      try {
        const lineText = `${title}\n\n${description.replace(/\*\*/g, '')}\n\nเข้าดูในระบบแอดมิน: ${adminDashboardUrl}`;
        const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.lineToken}`,
          },
          body: JSON.stringify({
            to: config.lineTargetId,
            messages: [
              {
                type: 'text',
                text: lineText,
              },
            ],
          }),
        });
        lineSuccess = lineRes.ok;
      } catch (err) {
        console.error('LINE webhook dispatch failed:', err);
      }
    }

    return {
      success: true,
      discord: discordSuccess,
      line: lineSuccess,
    };
  } catch (error: any) {
    console.error('Webhook dispatch error:', error);
    return { success: false, error: error.message };
  }
}
