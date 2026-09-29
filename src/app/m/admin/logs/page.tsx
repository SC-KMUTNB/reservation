'use client';

import React, { useState, useEffect } from 'react';
import { History, RotateCw, Filter, Clock, Globe, Shield } from 'lucide-react';

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

export default function MobileAdminLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/logs');
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

  const filteredLogs = logs.filter((l) => {
    if (filter === 'ALL') return true;
    return l.action.includes(filter);
  });

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900">บันทึกการตรวจสอบ (Audit Logs)</h2>
        <p className="text-xs text-slate-500">ประวัติการทำงาน การอนุมัติ และความปลอดภัยทั้งหมด</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'ALL', label: 'ทั้งหมด' },
          { id: 'APPROVED', label: 'อนุมัติ' },
          { id: 'REJECTED', label: 'ปฏิเสธ' },
          { id: 'CREATED', label: 'คำขอใหม่' },
          { id: 'EMAIL', label: 'อีเมล' },
          { id: 'SETTINGS', label: 'ตั้งค่า' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
              filter === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Logs Feed */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <RotateCw className="w-6 h-6 text-orange-600 animate-spin mx-auto mb-2" />
            <span>กำลังโหลดบันทึก...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-xs text-slate-500 border border-slate-200">
            ไม่พบบันทึกตามหมวดหมู่ที่เลือก
          </div>
        ) : (
          filteredLogs.map((log) => {
            const dateStr = new Date(log.createdAt).toLocaleString('th-TH', {
              timeZone: 'Asia/Bangkok',
              dateStyle: 'short',
              timeStyle: 'short',
            });

            return (
              <div
                key={log.id}
                className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{dateStr}</span>
                </div>

                <p className="text-slate-800 leading-relaxed font-light">{log.details}</p>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                  <span className="font-medium text-slate-600">
                    โดย: {log.actorName} {log.actorRole ? `(${log.actorRole})` : ''}
                  </span>
                  {log.ipAddress && <span className="font-mono">{log.ipAddress}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
