import { json, type RequestEvent } from '@sveltejs/kit';
import { prisma } from '$lib/prisma';
import { getSessionFromRequest } from '$lib/auth';
import {
	DEFAULT_USER_PREFERENCES,
	mergeUserPreferences,
	ensurePreferencesColumn
} from '$lib/user-preferences';

export async function GET(event: RequestEvent) {
	try {
		const session = await getSessionFromRequest(event);
		const userId = session?.id || (session as any)?.user?.id;

		if (!session || !userId) {
			return json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
		}

		let user: any = null;
		try {
			user = await prisma.user.findUnique({
				where: { id: userId },
				select: { preferences: true }
			});
		} catch (err: any) {
			if (err?.code === 'P2022' || err?.message?.includes('preferences')) {
				await ensurePreferencesColumn(prisma);
				try {
					user = await prisma.user.findUnique({
						where: { id: userId },
						select: { preferences: true }
					});
				} catch {
					user = { preferences: null };
				}
			} else {
				throw err;
			}
		}

		if (!user) {
			return json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 });
		}

		const preferences = user.preferences
			? mergeUserPreferences(user.preferences)
			: DEFAULT_USER_PREFERENCES;

		return json({ preferences });
	} catch (error) {
		console.error('Error fetching user preferences:', error);
		return json({ preferences: DEFAULT_USER_PREFERENCES });
	}
}

export async function PATCH(event: RequestEvent) {
	try {
		const session = await getSessionFromRequest(event);
		const userId = session?.id || (session as any)?.user?.id;

		if (!session || !userId) {
			return json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
		}

		let user: any = null;
		try {
			user = await prisma.user.findUnique({
				where: { id: userId },
				select: { preferences: true }
			});
		} catch (err: any) {
			if (err?.code === 'P2022' || err?.message?.includes('preferences')) {
				await ensurePreferencesColumn(prisma);
				try {
					user = await prisma.user.findUnique({
						where: { id: userId },
						select: { preferences: true }
					});
				} catch {
					user = { preferences: null };
				}
			} else {
				throw err;
			}
		}

		if (!user) {
			return json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 });
		}

		let body: any = {};
		try {
			body = await event.request.json();
		} catch {
			return json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
		}

		const incoming =
			body &&
			typeof body === 'object' &&
			body.preferences &&
			typeof body.preferences === 'object'
				? body.preferences
				: body;

		const existing =
			user.preferences && typeof user.preferences === 'object'
				? (user.preferences as any)
				: {};

		const merged = mergeUserPreferences({
			...existing,
			...incoming,
			visibleColumns: {
				...(existing.visibleColumns || {}),
				...(incoming.visibleColumns || {})
			}
		});

		try {
			await prisma.user.update({
				where: { id: userId },
				data: {
					preferences: merged as any
				}
			});
		} catch (err: any) {
			if (err?.code === 'P2022' || err?.message?.includes('preferences')) {
				await ensurePreferencesColumn(prisma);
				try {
					await prisma.user.update({
						where: { id: userId },
						data: {
							preferences: merged as any
						}
					});
				} catch (updateErr) {
					console.warn(
						'Could not persist preferences to database column:',
						updateErr
					);
				}
			} else {
				throw err;
			}
		}

		return json({ success: true, preferences: merged });
	} catch (error) {
		console.error('Error updating user preferences:', error);
		return json({ error: 'ไม่สามารถบันทึกการตั้งค่าได้' }, { status: 500 });
	}
}
