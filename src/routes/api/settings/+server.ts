import { json, type RequestEvent } from '@sveltejs/kit';
import { prisma } from '$lib/prisma';
import { getSessionFromRequest } from '$lib/auth';
import { recordAuditLog } from '$lib/audit';
import {
	encryptSecret,
	maskSecret,
	SENSITIVE_SETTING_KEYS,
	PUBLIC_SETTING_KEYS,
	isAllowedDiscordUrl
} from '$lib/encryption';
import { getFacilityConfig, saveFacilityConfig } from '$lib/facility-config';

export async function GET(event: RequestEvent) {
	try {
		const session = await getSessionFromRequest(event);
		const isSuperAdmin = session?.role === 'SUPER_ADMIN';

		const facilityConfig = await getFacilityConfig();

		if (!session) {
			const settings = await prisma.siteSetting.findMany({
				where: {
					key: {
						in: PUBLIC_SETTING_KEYS
					}
				}
			});

			const publicSettingsMap: Record<string, string> = {};
			for (const s of settings) {
				publicSettingsMap[s.key] = s.value;
			}

			return json({
				settings: publicSettingsMap,
				isSuperAdmin: false,
				facilityConfig
			});
		}

		const settings = await prisma.siteSetting.findMany({
			where: {
				key: {
					not: 'facility_config_json'
				}
			}
		});
		const settingsMap: Record<string, string> = {};

		for (const s of settings) {
			if (s.key === 'facility_config_json') {
				continue;
			}
			if (SENSITIVE_SETTING_KEYS.includes(s.key)) {
				if (isSuperAdmin) {
					settingsMap[s.key] = s.value ? maskSecret(s.value) : '';
				}
			} else if (isSuperAdmin) {
				settingsMap[s.key] = s.value;
			} else {
				if (PUBLIC_SETTING_KEYS.includes(s.key)) {
					settingsMap[s.key] = s.value;
				}
			}
		}

		return json({ settings: settingsMap, isSuperAdmin, facilityConfig });
	} catch (error) {
		console.error('Error fetching settings:', error);
		return json({ error: 'ไม่สามารถดึงข้อมูลการตั้งค่าได้' }, { status: 500 });
	}
}

export async function PUT(event: RequestEvent) {
	try {
		const session = await getSessionFromRequest(event);
		if (!session || session.role !== 'SUPER_ADMIN') {
			return json(
				{ error: 'เฉพาะ Super Admin เท่านั้นที่สามารถแก้ไขการตั้งค่าระบบได้' },
				{ status: 403 }
			);
		}

		const body = await event.request.json();
		const { settings, facilityConfig } = body;

		if (settings && typeof settings === 'object' && 'webhook_discord_url' in settings) {
			const rawDiscord = String(settings.webhook_discord_url ?? '').trim();
			if (rawDiscord && !rawDiscord.startsWith('••') && !isAllowedDiscordUrl(rawDiscord)) {
				return json(
					{
						error:
							'URL ของ Discord Webhook ไม่ถูกต้อง ต้องขึ้นต้นด้วย https://discord.com/api/webhooks/ หรือ https://discordapp.com/api/webhooks/'
					},
					{ status: 400 }
				);
			}
		}

		let savedFacilityConfig = null;
		if (facilityConfig && typeof facilityConfig === 'object') {
			savedFacilityConfig = await saveFacilityConfig(facilityConfig);
		}

		if (settings && typeof settings === 'object') {
			for (const [key, rawValue] of Object.entries(settings)) {
				if (key === 'facility_config_json') {
					continue;
				}

				const stringValue = String(rawValue ?? '').trim();

				if (SENSITIVE_SETTING_KEYS.includes(key)) {
					if (stringValue.startsWith('••')) {
						continue;
					}

					let valueToSave = '';
					if (stringValue) {
						valueToSave = encryptSecret(stringValue);
					}

					await prisma.siteSetting.upsert({
						where: { key },
						update: { value: valueToSave },
						create: {
							key,
							value: valueToSave
						}
					});
				} else {
					await prisma.siteSetting.upsert({
						where: { key },
						update: { value: stringValue },
						create: {
							key,
							value: stringValue
						}
					});
				}
			}
		}

		const ip =
			event.request.headers.get('x-forwarded-for') ||
			event.request.headers.get('x-real-ip') ||
			'127.0.0.1';

		await recordAuditLog({
			action: 'SETTINGS_UPDATED',
			details: `${session.fullName} (Super Admin) ได้อัปเดตการตั้งค่าระบบ การเชื่อมต่ออีเมล และ Google Sheets`,
			actorName: session.fullName,
			actorEmail: session.email,
			actorRole: session.role,
			ipAddress: ip,
			userId: session.id
		});

		return json({
			success: true,
			message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว',
			facilityConfig: savedFacilityConfig
		});
	} catch (error) {
		console.error('Error updating settings:', error);
		return json({ error: 'ไม่สามารถบันทึกการตั้งค่าได้' }, { status: 500 });
	}
}
