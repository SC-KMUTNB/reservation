'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  CheckCircle,
  XCircle,
  Activity,
  LogIn,
  Settings,
  Clock,
  Globe,
  Trash2,
  CalendarX2,
  AlertTriangle,
  X,
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

const ACTION_TABS = [
  { id: 'ALL', label: 'ทั้งหมด' },
  { id: 'BOOKING_APPROVED', label: 'อนุมัติการจอง' },
  { id: 'BOOKING_REJECTED', label: 'ปฏิเสธการจอง' },
  { id: 'BOOKING_CREATED', label: 'สร้างคำขอใหม่' },
  { id: 'ADMIN_LOGIN', label: 'เข้าสู่ระบบ' },
  { id: 'SETTINGS', label: 'แก้ไขการตั้งค่า' },
];

type ConfirmMode = 'all' | 'before' | null;

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Clear modal state
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);
  const [beforeDate, setBeforeDate] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);

  useEffect(() => {
    // Check role from /api/auth/me
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.role === 'SUPER_ADMIN') setIsSuperAdmin(true);
      })
      .catch(() => {});
  }, []);

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

  const handleClear = async () => {
    if (!confirmMode) return;
    setIsClearing(true);
    try {
      let url = '/api/logs?mode=all';
      if (confirmMode === 'before') {
        if (!beforeDate) return;
        url = `/api/logs?mode=before&before=${encodeURIComponent(new Date(beforeDate).toISOString())}`;
      }
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setClearResult(`ล้างบันทึกสำเร็จ — ${data.deletedCount} รายการถูกลบ`);
        fetchLogs(actionFilter);
      } else {
        setClearResult(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch {
      setClearResult('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsClearing(false);
      setConfirmMode(null);
      setBeforeDate('');
    }
  };

  const getActionBadge = (action: string) => {
    if (action === 'AUDIT_LOGS_CLEARED') {
      return (
        <span className="bg-rose-50 text-rose-800 border border-rose-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
          <Trash2 className="w-3 h-3 text-rose-600" /> ล้าง Audit Logs
        </span>
      );
    }
    if (action.includes('APPROVED')) {
      return (
        <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
          <CheckCircle className="w-3 h-3 text-emerald-600" /> อนุมัติการจอง
        </span>
      );
    }
    if (action.includes('REJECTED')) {
      return (
        <span className="bg-rose-50 text-rose-800 border border-rose-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
          <XCircle className="w-3 h-3 text-rose-600" /> ปฏิเสธคำขอ
        </span>
      );
    }
    if (action.includes('CREATED')) {
      return (
        <span className="bg-blue-50 text-blue-800 border border-blue-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
          <Activity className="w-3 h-3 text-blue-600" /> สร้างคำขอ
        </span>
      );
    }
    if (action.includes('LOGIN')) {
      return (
        <span className="bg-purple-50 text-purple-800 border border-purple-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
          <LogIn className="w-3 h-3 text-purple-600" /> เข้าสู่ระบบ
        </span>
      );
    }
    if (action.includes('SETTINGS')) {
      return (
        <span className="bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
          <Settings className="w-3 h-3 text-amber-600" /> อัปเดตการตั้งค่า
        </span>
      );
    }
    return (
      <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
        {action}
      </span>
    );
  };

  // Today's date in YYYY-MM-DD for the date picker max
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            บันทึกการตรวจสอบระบบ (Audit Logs)
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-light">
            บันทึกประวัติการกระทำทั้งหมดในระบบโดยอัตโนมัติ เพื่อความโปร่งใสและตรวจสอบย้อนหลังได้
          </p>
        </div>

        {/* Clear buttons — Super Admin only */}
        {isSuperAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setConfirmMode('before')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition active-press cursor-pointer"
            >
              <CalendarX2 className="w-3.5 h-3.5" />
              ล้างตามวันที่
            </button>
            <button
              onClick={() => setConfirmMode('all')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition active-press cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ล้างทั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* Clear result toast */}
      {clearResult && (
        <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-2xl">
          <span>{clearResult}</span>
          <button onClick={() => setClearResult(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-warm space-y-5">
        {/* Action Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 overflow-x-auto">
          {ACTION_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActionFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active-press whitespace-nowrap cursor-pointer ${
                actionFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Logs List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              กำลังโหลดบันทึกการตรวจสอบ...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-xs">ไม่พบบันทึกการตรวจสอบในหมวดหมู่นี้</div>
            </div>
          ) : (
            logs.map((log) => {
              const formattedDate = new Date(log.createdAt).toLocaleString('th-TH', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              return (
                <div
                  key={log.id}
                  className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 p-4 rounded-2xl transition space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getActionBadge(log.action)}
                      <span className="font-semibold text-xs text-slate-800">{log.actorName}</span>
                      {log.actorRole && (
                        <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-mono">
                          {log.actorRole}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 tabular-nums font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 leading-relaxed font-normal">
                    {log.details}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                    <div className="flex items-center gap-3 text-slate-400">
                      {log.ipAddress && (
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <Globe className="w-3 h-3" /> IP: {log.ipAddress}
                        </span>
                      )}
                      {log.actorEmail && (
                        <span className="text-[10px] text-slate-400">
                          {log.actorEmail}
                        </span>
                      )}
                    </div>

                    {log.booking && (
                      <span className="text-orange-600 bg-orange-50 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-orange-200">
                        {log.booking.bookingCode} ({log.booking.date})
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">
                  {confirmMode === 'all' ? 'ล้างบันทึกทั้งหมด?' : 'ล้างบันทึกตามวันที่?'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {confirmMode === 'all'
                    ? 'รายการทั้งหมดจะถูกลบถาวร ไม่สามารถกู้คืนได้'
                    : 'รายการก่อนหน้าวันที่เลือกจะถูกลบถาวร'}
                </div>
              </div>
            </div>

            {confirmMode === 'before' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  ลบบันทึกก่อนวันที่
                </label>
                <input
                  type="date"
                  max={todayStr}
                  value={beforeDate}
                  onChange={(e) => setBeforeDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setConfirmMode(null); setBeforeDate(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer active-press"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleClear}
                disabled={isClearing || (confirmMode === 'before' && !beforeDate)}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition disabled:opacity-50 cursor-pointer active-press"
              >
                {isClearing ? 'กำลังลบ...' : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
