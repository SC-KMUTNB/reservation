import { json, type RequestEvent } from '@sveltejs/kit';
import { prisma } from '$lib/prisma';
import { checkRateLimit, getSafeClientIp, rateLimitResponse } from '$lib/rate-limit';
import { recordAuditLog } from '$lib/audit';
import { notifyUserBookingStatusUpdate } from '$lib/email';
import { syncBookingToGoogleSheet } from '$lib/google-sheets';
import { isBackdated } from '$lib/date-utils';
import { dispatchWebhookEvent } from '$lib/webhook-notify';

export async function GET(event: RequestEvent) {
	try {
		const ip = getSafeClientIp(event);
		const limitResult = checkRateLimit(`track:${ip}`, 30, 5 * 60 * 1000);
		if (!limitResult.allowed) {
			return rateLimitResponse(limitResult);
		}

		const query = event.url.searchParams.get('q')?.trim();

		if (!query) {
			return json(
				{ error: 'กรุณาระบุรหัสนักศึกษาหรือรหัสการจอง' },
				{ status: 400 }
			);
		}

		const bookings = await prisma.booking.findMany({
			where: {
				OR: [
					{ studentId: { equals: query, mode: 'insensitive' } },
					{ bookingCode: { equals: query, mode: 'insensitive' } }
				]
			},
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				bookingCode: true,
				date: true,
				startTime: true,
				endTime: true,
				fullName: true,
				studentId: true,
				department: true,
				reason: true,
				status: true,
				rejectionReason: true,
				approvedAt: true,
				checkedInAt: true,
				createdAt: true
			}
		});

		return json({ bookings });
	} catch (error) {
		console.error('Error tracking booking:', error);
		return json({ error: 'เกิดข้อผิดพลาดในการค้นหาข้อมูล' }, { status: 500 });
	}
}

export async function PATCH(event: RequestEvent) {
	try {
		const ip = getSafeClientIp(event);
		const limitResult = checkRateLimit(`cancel-ip:${ip}`, 10, 15 * 60 * 1000);
		if (!limitResult.allowed) return rateLimitResponse(limitResult);

		const body = await event.request.json();
		const { bookingCode, studentId, phoneLast4, cancelReason } = body;

		if (!bookingCode || !studentId || !phoneLast4) {
			return json(
				{
					error:
						'กรุณาระบุรหัสการจอง รหัสนักศึกษา และเบอร์โทรศัพท์ 4 ตัวท้ายให้ครบถ้วน'
				},
				{ status: 400 }
			);
		}

		const codeLimit = checkRateLimit(`cancel-code:${String(bookingCode).trim().toUpperCase()}`, 5, 15 * 60 * 1000);
		if (!codeLimit.allowed) return rateLimitResponse(codeLimit);

		const booking = await prisma.booking.findFirst({
			where: {
				bookingCode: { equals: String(bookingCode).trim(), mode: 'insensitive' },
				studentId: { equals: String(studentId).trim(), mode: 'insensitive' }
			}
		});

		if (!booking) {
			return json(
				{ error: 'ไม่พบข้อมูลการจองที่ตรงกับรหัสการจองและรหัสนักศึกษานี้' },
				{ status: 404 }
			);
		}

		const cleanPhone = (booking.phone || '').replace(/[-\s]/g, '');
		if (!cleanPhone.endsWith(String(phoneLast4).trim())) {
			return json(
				{ error: 'เบอร์โทรศัพท์ 4 ตัวท้ายไม่ตรงกับข้อมูลในระบบ' },
				{ status: 400 }
			);
		}

		if (booking.status !== 'PENDING' && booking.status !== 'APPROVED') {
			return json(
				{ error: `ไม่สามารถยกเลิกได้เนื่องจากสถานะปัจจุบันคือ ${booking.status}` },
				{ status: 400 }
			);
		}

		if (booking.status === 'APPROVED') {
			const timezoneSetting = await prisma.siteSetting.findUnique({
				where: { key: 'timezone' }
			});
			const backdated = isBackdated(
				booking.date,
				booking.startTime,
				timezoneSetting?.value
			);
			if (backdated.isBackdated) {
				return json(
					{ error: 'ไม่สามารถยกเลิกการจองที่ผ่านเวลาเริ่มต้นไปแล้วได้' },
					{ status: 400 }
				);
			}
		}

		const formattedReason = `[ผู้จองยกเลิกเอง]: ${(cancelReason || '').trim() || 'ไม่ระบุเหตุผล'}`;

		const updated = await prisma.booking.update({
			where: { id: booking.id },
			data: {
				status: 'CANCELLED',
				rejectionReason: formattedReason
			}
		});

		await recordAuditLog({
			action: 'BOOKING_CANCELLED_BY_STUDENT',
			details: `ผู้จองยกเลิกการจองด้วยตนเอง (รหัส ${booking.bookingCode}) เหตุผล: ${(cancelReason || '').trim() || 'ไม่ระบุเหตุผล'}`,
			actorName: booking.fullName,
			actorEmail: booking.email,
			actorRole: 'STUDENT',
			ipAddress: ip,
			bookingId: booking.id
		});

		Promise.allSettled([
			notifyUserBookingStatusUpdate({
				bookingCode: updated.bookingCode,
				fullName: updated.fullName,
				email: updated.email,
				date: updated.date,
				startTime: updated.startTime,
				endTime: updated.endTime,
				status: 'CANCELLED',
				rejectionReason: formattedReason
			}).catch(async (err: any) => {
				console.error('Cancellation status email failed:', err);
			}),
			syncBookingToGoogleSheet(
				{
					bookingCode: updated.bookingCode,
					date: updated.date,
					startTime: updated.startTime,
					endTime: updated.endTime,
					fullName: updated.fullName,
					studentId: updated.studentId,
					email: updated.email,
					phone: updated.phone,
					department: updated.department,
					reason: updated.reason,
					status: updated.status,
					rejectionReason: updated.rejectionReason,
					createdAt: updated.createdAt
				},
				'UPDATE'
			).catch(async (err: any) => {
				console.error('Cancellation Google Sheet sync failed:', err);
			}),
			dispatchWebhookEvent('BOOKING_CANCELLED', {
				bookingCode: updated.bookingCode,
				fullName: updated.fullName,
				studentId: updated.studentId,
				department: updated.department,
				date: updated.date,
				startTime: updated.startTime,
				endTime: updated.endTime,
				rejectionReason: updated.rejectionReason
			}).catch((err: any) =>
				console.error('Cancellation webhook dispatch failed:', err)
			)
		]);

		return json({
			success: true,
			message: 'ยกเลิกการจองเรียบร้อยแล้ว',
			booking: updated
		});
	} catch (error) {
		console.error('Error cancelling booking:', error);
		return json(
			{ error: 'เกิดข้อผิดพลาดในการยกเลิกคำขอจอง' },
			{ status: 500 }
		);
	}
}
