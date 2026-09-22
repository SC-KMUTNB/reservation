'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Shield,
  Filter,
  Clock,
  User,
  Activity,
  CheckCircle,
  XCircle,
  Settings,
  LogIn
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  action: string;
  details: string;
  actorName: string;
  actorEmail?: string;
  actorRole?: string;
  ipAddress?: string;
  createdAt: string;
  booking?: {
    bookingCode: string;
    fullName: string;
    date: string;
  };
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs(actionFilter);
  }, [actionFilter]);

  const fetchLogs = async (action: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/logs?action=${action}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('APPROVED')) {
      return (
        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> อนุมัติการจอง
        </span>
      );
    }
    if (action.includes('REJECTED')) {
      return (
        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
          <XCircle className="w-3 h-3" /> ปฏิเสธการจอง
        </span>
      );
    }
    if (action.includes('CREATED')) {
      return (
        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
          <Activity className="w-3 h-3" /> สร้างคำขอ
        </span>
      );
    }
    if (action.includes('LOGIN')) {
      return (
        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
          <LogIn className="w-3 h-3" /> เข้าสู่ระบบ
        </span>
      );
    }
    if (action.includes('SETTINGS')) {
      return (
        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
          <Settings className="w-3 h-3" /> อัปเดตการตั้งค่า
        </span>
      );
    }
    return (
      <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">บันทึกประวัติการตรวจสอบ (Audit Trail)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            บันทึกลำดับเหตุการณ์ทุกคำสั่งในระบบ เพื่อความโปร่งใสและตรวจสอบย้อนหลังได้
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500">กรองกิจกรรม:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
          >
            <option value="ALL">กิจกรรมทั้งหมด</option>
            <option value="BOOKING_APPROVED">เฉพาะการอนุมัติการจอง</option>
            <option value="BOOKING_REJECTED">เฉพาะการปฏิเสธการจอง</option>
            <option value="BOOKING_CREATED">เฉพาะการยื่นคำขอจองใหม่</option>
            <option value="ADMIN_LOGIN">เฉพาะการเข้าสู่ระบบแอดมิน</option>
            <option value="SETTINGS_UPDATED">เฉพาะการแก้ไขตั้งค่าระบบ</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="p-3.5 font-semibold">วันเวลา (Timestamp)</th>
                <th className="p-3.5 font-semibold">กิจกรรม (Action)</th>
                <th className="p-3.5 font-semibold">ผู้ดำเนินการ (Actor)</th>
                <th className="p-3.5 font-semibold">IP Address</th>
                <th className="p-3.5 font-semibold">รายละเอียดเหตุการณ์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    กำลังโหลดบันทึกการตรวจสอบ...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    ยังไม่มีบันทึกกิจกรรมตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 text-slate-500 whitespace-nowrap">
                      <div className="font-semibold text-slate-700">
                        {log.createdAt.slice(0, 10)}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {log.createdAt.slice(11, 19)} น.
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{log.actorName}</div>
                      <div className="text-[10px] text-slate-400">
                        {log.actorRole || 'STUDENT'} {log.actorEmail ? `(${log.actorEmail})` : ''}
                      </div>
                    </td>

                    <td className="p-3.5 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {log.ipAddress || '-'}
                    </td>

                    <td className="p-3.5 text-slate-600 max-w-md">
                      <div>{log.details}</div>
                      {log.booking && (
                        <div className="text-[10px] font-mono text-orange-600 mt-0.5">
                          รหัสจอง: {log.booking.bookingCode} ({log.booking.fullName})
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
