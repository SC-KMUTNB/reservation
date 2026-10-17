import { json, type RequestEvent } from '@sveltejs/kit';
import { getSessionFromRequest } from '$lib/auth';
import { prisma } from '$lib/prisma';
import {
	DEFAULT_USER_PREFERENCES,
	mergeUserPreferences,
	safeGetUserWithPreferences
} from '$lib/user-preferences';

export async function GET(event: RequestEvent) {
	const session = await getSessionFromRequest(event);
	if (!session) {
		return json({ authenticated: false }, { status: 401 });
	}

	const user = await safeGetUserWithPreferences(prisma, session.id);

	if (!user || !user.isActive) {
		return json({ authenticated: false }, { status: 401 });
	}

	return json({
		authenticated: true,
		user: {
			id: user.id,
			email: user.email,
			username: user.username,
			fullName: user.fullName,
			role: user.role,
			isGoogleLinked: !!user.googleId,
			googleEmail: user.googleEmail,
			preferences: user.preferences
				? mergeUserPreferences(user.preferences)
				: DEFAULT_USER_PREFERENCES
		}
	});
}
