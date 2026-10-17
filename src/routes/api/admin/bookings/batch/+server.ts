import { json, type RequestEvent } from '@sveltejs/kit';
import { prisma } from '$lib/prisma';
import { getSessionFromRequest } from '$lib/auth';
import { recordAuditLog } from '$lib/audit';
import { notifyUserBookingStatusUpdate } from '$lib/email';
import { syncBookingToGoogleSheet } from '$lib/google-sheets';
import { validateBatchApproval, type CandidateBooking } from '$lib/batch-validation';

export async function POST(event: RequestEvent) {
	try {
		const session = await getSessionFromRequest(event);
		if (!session) {
			return json(
				{ error: 'ไม่ได้รับอนุญาต (กรุณาเข้าสู่ระบบแอดมิน)' },
				{ status: 401 }
			);
		}

		const body = await event.request.json().catch(() => ({}));
		const { action, bookingIds, rejectionReason } = body || {};

		if (action !== 'APPROVE' && action !== 'REJECT') {
			return json(
				{ error: 'คำสั่งไม่ถูกต้อง (รองรับเฉพาะ APPROVE หรือ REJECT)' },
				{ status: 400 }
			);
		}

		if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
			return json(
				{ error: 'กรุณาระบุรายการจองอย่างน้อย 1 รายการ' },
				{ status: 400 }
			);
		}

		const ip =
			event.request.headers.get('x-forwarded-for') ||
			event.request.headers.get('x-real-ip') ||
			'127.0.0.1';

		const targetBookings = await prisma.booking.findMany({
			where: {
				id: { in: bookingIds }
			}
		});

		if (action === 'REJECT') {
			const targetIds = targetBookings.map((b) => b.id);
			const effectiveReason = rejectionReason?.trim() || 'ไม่ระบุเหตุผล';

			if (targetIds.length > 0) {
				await prisma.$transaction(
					targetIds.map((id) =>
						prisma.booking.update({
							where: { id },
							data: {
								status: 'REJECTED',
								rejectionReason: effectiveReason,
								approvedById: session.id,
								approvedAt: new Date()
							}
						})
					)
				);
			}

			for (const b of targetBookings) {
				await recordAuditLog({
					action: 'BOOKING_REJECTED',
					details: `${session.fullName} ได้ดำเนินการ: ปฏิเสธการจองห้อง (กลุ่ม) สำหรับ ${b.fullName} วันที่ ${b.date} เวลา ${b.startTime}-${b.endTime} (${effectiveReason})`,
					actorName: session.fullName,
					actorEmail: session.email,
					actorRole: session.role,
					ipAddress: ip,
					bookingId: b.id,
					userId: session.id
				}).catch((err) => console.error('Batch reject audit log failed:', err));
			}

			Promise.allSettled(
				targetBookings.map(async (b) => {
					return Promise.allSettled([
						notifyUserBookingStatusUpdate({
							bookingCode: b.bookingCode,
							fullName: b.fullName,
							email: b.email,
							date: b.date,
							startTime: b.startTime,
							endTime: b.endTime,
							status: 'REJECTED',
							rejectionReason: effectiveReason
						}).catch((err) => console.error('Batch reject user email failed:', err)),

						syncBookingToGoogleSheet(
							{
								bookingCode: b.bookingCode,
								date: b.date,
								startTime: b.startTime,
								endTime: b.endTime,
								fullName: b.fullName,
								studentId: b.studentId,
								email: b.email,
								phone: b.phone,
								department: b.department,
								reason: b.reason,
								status: 'REJECTED',
								rejectionReason: effectiveReason,
								approvedBy: session.fullName,
								createdAt: b.createdAt
							},
							'UPDATE'
						).catch((err) => console.error('Batch reject google sheet sync failed:', err))
					]);
				})
			);

			return json({
				success: true,
				approvedCount: 0,
				conflictCount: 0,
				conflicts: [],
				rejectedCount: targetBookings.length,
				successCount: targetBookings.length
			});
		}

		// action === 'APPROVE'
		const targetMap = new Map(targetBookings.map((b) => [b.id, b]));
		const orderedCandidates: CandidateBooking[] = bookingIds
			.map((id) => targetMap.get(id))
			.filter((b): b is NonNullable<typeof b> => Boolean(b))
			.map((b) => ({
				id: b.id,
				bookingCode: b.bookingCode,
				date: b.date,
				startTime: b.startTime,
				endTime: b.endTime,
				fullName: b.fullName
			}));

		const dates = Array.from(new Set(orderedCandidates.map((c) => c.date)));
		const existingApprovedList = await prisma.booking.findMany({
			where: {
				date: { in: dates },
				status: 'APPROVED',
				id: { notIn: orderedCandidates.map((c) => c.id) }
			},
			select: {
				id: true,
				bookingCode: true,
				date: true,
				startTime: true,
				endTime: true,
				fullName: true
			}
		});

		const { approved, conflicts } = validateBatchApproval(
			orderedCandidates,
			existingApprovedList
		);

		const approvedIds = approved.map((a) => a.id);
		if (approvedIds.length > 0) {
			await prisma.$transaction(
				approvedIds.map((id) =>
					prisma.booking.update({
						where: { id },
						data: {
							status: 'APPROVED',
							rejectionReason: null,
							approvedById: session.id,
							approvedAt: new Date()
						}
					})
				)
			);
		}

		for (const a of approved) {
			const b = targetMap.get(a.id);
			if (!b) continue;

			await recordAuditLog({
				action: 'BOOKING_APPROVED',
				details: `${session.fullName} ได้ดำเนินการ: อนุมัติการจองห้อง (กลุ่ม) สำหรับ ${b.fullName} วันที่ ${b.date} เวลา ${b.startTime}-${b.endTime}`,
				actorName: session.fullName,
				actorEmail: session.email,
				actorRole: session.role,
				ipAddress: ip,
				bookingId: b.id,
				userId: session.id
			}).catch((err) => console.error('Batch approve audit log failed:', err));
		}

		Promise.allSettled(
			approved.map(async (a) => {
				const b = targetMap.get(a.id);
				if (!b) return;

				return Promise.allSettled([
					notifyUserBookingStatusUpdate({
						bookingCode: b.bookingCode,
						fullName: b.fullName,
						email: b.email,
						date: b.date,
						startTime: b.startTime,
						endTime: b.endTime,
						status: 'APPROVED',
						rejectionReason: null
					}).catch((err) => console.error('Batch approve user email failed:', err)),

					syncBookingToGoogleSheet(
						{
							bookingCode: b.bookingCode,
							date: b.date,
							startTime: b.startTime,
							endTime: b.endTime,
							fullName: b.fullName,
							studentId: b.studentId,
							email: b.email,
							phone: b.phone,
							department: b.department,
							reason: b.reason,
							status: 'APPROVED',
							rejectionReason: null,
							approvedBy: session.fullName,
							createdAt: b.createdAt
						},
						'UPDATE'
					).catch((err) => console.error('Batch approve google sheet sync failed:', err))
				]);
			})
		);

		return json({
			success: true,
			approvedCount: approved.length,
			conflictCount: conflicts.length,
			conflicts,
			rejectedCount: 0,
			successCount: approved.length
		});
	} catch (error) {
		console.error('Batch booking action error:', error);
		return json(
			{ error: 'ไม่สามารถดำเนินการจัดการคำขอแบบกลุ่มได้' },
			{ status: 500 }
		);
	}
}
