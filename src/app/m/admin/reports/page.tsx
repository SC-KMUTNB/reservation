'use client';

import React, { useState } from 'react';
import { FileSpreadsheet, Download, Calendar, Filter, RotateCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function MobileAdminReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (status && status !== 'ALL') params.append('status', status);

      const url = `/api/reports/export?${params.toString()}`;
      window.location.href = url;
    } catch (e) {
      console.error(e);
      setExportError('เกิดข้อผิดพลาดในการดาวน์โหลดรายงาน');
    } finally {
      setTimeout(() => setIsExporting(false), 2000);
    }
  };

  const handlePreset = (monthsBack: number) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - monthsBack);

    const format = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    setStartDate(format(start));
    setEndDate(format(end));
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900">ส่งออกรายงาน (Export Reports)</h2>
        <p className="text-xs text-slate-500">ดาวน์โหลดไฟล์ Excel (.xlsx) สรุปสถิติและประวัติการจอง</p>
      </div>

      {exportError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{exportError}</span>
        </div>
      )}

      {/* Export Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>กำหนดเงื่อนไขรายงาน Excel</span>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-slate-700">ช่วงเวลาด่วน</label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => handlePreset(0)}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700 active:scale-95"
            >
              เดือนนี้
            </button>
            <button
              onClick={() => handlePreset(3)}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700 active:scale-95"
            >
              3 เดือน
            </button>
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700 active:scale-95"
            >
              ทั้งหมด
            </button>
          </div>
        </div>

        {/* Date Inputs */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">ตั้งแต่วันที่</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">ถึงวันที่</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">สถานะคำขอ</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
          >
            <option value="ALL">สถานะทั้งหมด</option>
            <option value="APPROVED">เฉพาะที่อนุมัติแล้ว (APPROVED)</option>
            <option value="PENDING">เฉพาะที่รออนุมัติ (PENDING)</option>
            <option value="REJECTED">เฉพาะที่ปฏิเสธ (REJECTED)</option>
            <option value="CANCELLED">เฉพาะที่ยกเลิก (CANCELLED)</option>
          </select>
        </div>

        {/* Download Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-98 transition cursor-pointer"
        >
          {isExporting ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>กำลังสร้างไฟล์รายงาน...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดรายงาน Excel (.xlsx)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
