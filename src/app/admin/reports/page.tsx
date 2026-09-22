'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileCheck,
  ArrowRight,
  Sparkles,
  Table,
  Layers
} from 'lucide-react';

export default function AdminReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);
  const [activePreset, setActivePreset] = useState<number | null>(0);

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().slice(0, 10));
    setEndDate(lastDay.toISOString().slice(0, 10));
  }, []);

  const setMonthRange = (offset: number) => {
    setActivePreset(offset);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  };

  const handleDownload = () => {
    setIsExporting(true);
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (status) params.append('status', status);

    const downloadUrl = `/api/reports/export?${params.toString()}`;
    window.location.href = downloadUrl;

    setTimeout(() => {
      setIsExporting(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          ศูนย์ส่งออกรายงานสำหรับผู้บริหาร
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-light">
          ส่งออกไฟล์ Microsoft Excel (.xlsx) สองแผ่นงานเพื่อใช้ประกอบการรายงานผลและตรวจสอบความโปร่งใส
        </p>
      </div>

      {/* Filter & Export Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-warm space-y-6">
        <div>
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            1. เลือกช่วงเวลาที่ต้องการสรุปข้อมูล
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMonthRange(0)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition active-press cursor-pointer ${
                activePreset === 0
                  ? 'bg-orange-600 text-white shadow-warm-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              เดือนปัจจุบัน
            </button>
            <button
              type="button"
              onClick={() => setMonthRange(-1)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition active-press cursor-pointer ${
                activePreset === -1
                  ? 'bg-orange-600 text-white shadow-warm-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              เดือนที่แล้ว
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePreset(null);
                setStartDate('');
                setEndDate('');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition active-press cursor-pointer ${
                activePreset === null
                  ? 'bg-orange-600 text-white shadow-warm-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด (ไม่จำกัดช่วงเวลา)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ตั้งแต่วันที่</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset(null);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ถึงวันที่</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset(null);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">สถานะคำขอ</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
              >
                <option value="ALL">ทุกสถานะ (อนุมัติ, รออนุมัติ, ปฏิเสธ)</option>
                <option value="APPROVED">เฉพาะที่ได้รับการอนุมัติ (APPROVED)</option>
                <option value="PENDING">เฉพาะที่รออนุมัติ (PENDING)</option>
                <option value="REJECTED">เฉพาะที่ถูกปฏิเสธ (REJECTED)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Excel Sheets Preview Bento */}
        <div>
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            2. ข้อมูลที่จะถูกสร้างในไฟล์ Excel (.xlsx)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex items-start gap-3.5">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                <Table className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <span>ชีต 1: รายการจองห้องประชุม (Bookings)</span>
                </div>
                <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                  รหัสจอง, วันที่, เวลาเริ่มต้น-สิ้นสุด, ชื่อผู้จอง, รหัสนักศึกษา, คณะ/สังกัด, วัตถุประสงค์, สถานะ, ผู้อนุมัติ, และเหตุผลการปฏิเสธ
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex items-start gap-3.5">
              <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <span>ชีต 2: บันทึกการตรวจสอบ (Audit Trail)</span>
                </div>
                <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                  ประวัติการเปลี่ยนแปลงสถานะ, เวลาทำรายการ (Timestamp), เจ้าหน้าที่ผู้ดำเนินการ, IP Address, และรายละเอียดคำขอ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-xs text-slate-500 font-medium">
            รูปแบบไฟล์: <span className="font-mono text-slate-700 font-bold">KMUTNB_Council_Reservation_Report_YYYY-MM-DD.xlsx</span>
          </div>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownload}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-7 py-3 rounded-2xl text-xs shadow-warm hover:shadow-warm-lg transition-all duration-200 flex items-center justify-center gap-2 active-press cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'กำลังเตรียมไฟล์ Excel...' : 'ดาวน์โหลดรายงาน Excel ทันที'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
