import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import ExcelJS from 'exceljs';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต (กรุณาเข้าสู่ระบบแอดมิน)' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    const bookingWhere: any = {};
    if (startDate && endDate) {
      bookingWhere.date = { gte: startDate, lte: endDate };
    } else if (startDate) {
      bookingWhere.date = { gte: startDate };
    } else if (endDate) {
      bookingWhere.date = { lte: endDate };
    }

    if (status && status !== 'ALL') {
      bookingWhere.status = status;
    }

    const bookings = await prisma.booking.findMany({
      where: bookingWhere,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        approvedBy: {
          select: { fullName: true, email: true },
        },
      },
    });

    const auditWhere: any = {};
    if (startDate && endDate) {
      auditWhere.createdAt = {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: auditWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          select: { bookingCode: true, date: true, startTime: true, endTime: true },
        },
      },
      take: 1000,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'สภานักศึกษา มจพ.';
    workbook.created = new Date();

    const sheet1 = workbook.addWorksheet('รายงานการจองห้องประชุม', {
      views: [{ showGridLines: true }],
    });

    sheet1.columns = [
      { header: 'ลำดับ', key: 'index', width: 8 },
      { header: 'รหัสการจอง', key: 'bookingCode', width: 22 },
      { header: 'วันที่จอง', key: 'date', width: 14 },
      { header: 'ช่วงเวลา', key: 'timeSlot', width: 16 },
      { header: 'ชื่อ-นามสกุล ผู้จอง', key: 'fullName', width: 24 },
      { header: 'รหัสนักศึกษา', key: 'studentId', width: 16 },
      { header: 'หน่วยงาน/คณะ/ชมรม', key: 'department', width: 25 },
      { header: 'เบอร์ติดต่อ', key: 'phone', width: 16 },
      { header: 'อีเมล', key: 'email', width: 28 },
      { header: 'วัตถุประสงค์การใช้งาน', key: 'reason', width: 35 },
      { header: 'สถานะ', key: 'status', width: 16 },
      { header: 'เหตุผลการปฏิเสธ (ถ้ามี)', key: 'rejectionReason', width: 30 },
      { header: 'ผู้อนุมัติ/จัดการ', key: 'approvedBy', width: 24 },
      { header: 'วันเวลาที่อนุมัติ', key: 'approvedAt', width: 20 },
    ];

    const headerRow1 = sheet1.getRow(1);
    headerRow1.height = 28;
    headerRow1.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE65100' },
      };
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11,
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const statusTranslations: Record<string, string> = {
      APPROVED: 'อนุมัติแล้ว',
      PENDING: 'รอการอนุมัติ',
      REJECTED: 'ถูกปฏิเสธ',
      CANCELLED: 'ยกเลิกแล้ว',
    };

    bookings.forEach((b, idx) => {
      const row = sheet1.addRow({
        index: idx + 1,
        bookingCode: b.bookingCode,
        date: b.date,
        timeSlot: `${b.startTime} - ${b.endTime}`,
        fullName: b.fullName,
        studentId: b.studentId,
        department: b.department,
        phone: b.phone,
        email: b.email,
        reason: b.reason,
        status: statusTranslations[b.status] || b.status,
        rejectionReason: b.rejectionReason || '-',
        approvedBy: b.approvedBy ? b.approvedBy.fullName : '-',
        approvedAt: b.approvedAt ? b.approvedAt.toISOString().replace('T', ' ').slice(0, 19) : '-',
      });

      row.height = 22;
      row.alignment = { vertical: 'middle' };
      row.getCell('index').alignment = { horizontal: 'center' };
      row.getCell('bookingCode').alignment = { horizontal: 'center' };
      row.getCell('date').alignment = { horizontal: 'center' };
      row.getCell('timeSlot').alignment = { horizontal: 'center' };
      row.getCell('studentId').alignment = { horizontal: 'center' };
      row.getCell('status').alignment = { horizontal: 'center' };

      const statusCell = row.getCell('status');
      if (b.status === 'APPROVED') {
        statusCell.font = { color: { argb: 'FF15803D' }, bold: true };
      } else if (b.status === 'PENDING') {
        statusCell.font = { color: { argb: 'FFB45309' }, bold: true };
      } else if (b.status === 'REJECTED') {
        statusCell.font = { color: { argb: 'FFB91C1C' }, bold: true };
      }
    });

    const sheet2 = workbook.addWorksheet('บันทึกการตรวจสอบ (Audit Logs)', {
      views: [{ showGridLines: true }],
    });

    sheet2.columns = [
      { header: 'ลำดับ', key: 'index', width: 8 },
      { header: 'วันเวลาที่เกิดเหตุการณ์ (UTC)', key: 'createdAt', width: 22 },
      { header: 'ประเภทกิจกรรม (Action)', key: 'action', width: 24 },
      { header: 'ผู้กระทำ (Actor)', key: 'actorName', width: 24 },
      { header: 'อีเมลผู้กระทำ', key: 'actorEmail', width: 26 },
      { header: 'บทบาทผู้กระทำ', key: 'actorRole', width: 16 },
      { header: 'รหัสการจองที่เกี่ยวข้อง', key: 'targetBooking', width: 24 },
      { header: 'IP Address', key: 'ipAddress', width: 18 },
      { header: 'รายละเอียดเหตุการณ์', key: 'details', width: 45 },
    ];

    const headerRow2 = sheet2.getRow(1);
    headerRow2.height = 28;
    headerRow2.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11,
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    auditLogs.forEach((l, idx) => {
      const row = sheet2.addRow({
        index: idx + 1,
        createdAt: l.createdAt.toISOString().replace('T', ' ').slice(0, 19),
        action: l.action,
        actorName: l.actorName,
        actorEmail: l.actorEmail || '-',
        actorRole: l.actorRole || '-',
        targetBooking: l.booking ? l.booking.bookingCode : '-',
        ipAddress: l.ipAddress || '-',
        details: l.details,
      });

      row.height = 22;
      row.alignment = { vertical: 'middle' };
      row.getCell('index').alignment = { horizontal: 'center' };
      row.getCell('createdAt').alignment = { horizontal: 'center' };
      row.getCell('action').alignment = { horizontal: 'center' };
      row.getCell('actorRole').alignment = { horizontal: 'center' };
      row.getCell('targetBooking').alignment = { horizontal: 'center' };
      row.getCell('ipAddress').alignment = { horizontal: 'center' };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `KMUTNB_Council_Reservation_Report_${timestamp}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error generating Excel report:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างไฟล์ Excel' }, { status: 500 });
  }
}
