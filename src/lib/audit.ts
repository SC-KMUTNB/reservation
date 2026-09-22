import { prisma } from './prisma';

interface LogAuditParams {
  action: string;
  details: string;
  actorName: string;
  actorEmail?: string;
  actorRole?: string;
  ipAddress?: string;
  bookingId?: string;
  userId?: string;
}

export async function recordAuditLog(params: LogAuditParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        action: params.action,
        details: params.details,
        actorName: params.actorName,
        actorEmail: params.actorEmail,
        actorRole: params.actorRole,
        ipAddress: params.ipAddress,
        bookingId: params.bookingId,
        userId: params.userId,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    return null;
  }
}
