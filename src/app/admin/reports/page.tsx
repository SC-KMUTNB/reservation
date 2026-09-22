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
  ArrowRight
} from 'lucide-react';

export default function AdminReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().slice(0, 10));
    setEndDate(lastDay.toISOString().slice(0, 10));
  }, []);

  const setMonthRange = (offset: number) => {
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
      <div>
        <h2 className="text-2xl font-bold text-slate-800">ศูนย์ส่งออกรายงานสำหรับผู้บริหารมหาวิทยาลัย</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          ส่งออกไฟล์ Excel (.xlsx) สองชีต เพื่อใช้เป็นหลักฐานการตรวจสอบ (Audit Trail) และสถิติการใช้งานห้องประชุม
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div>
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            ตัวเลือกช่วงเวลาที่ต้องการส่งออก
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMonthRange(0)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              เดือนปัจจุบัน
            </button>
            <button
              type="button"
              onClick={() => setMonthRange(-1)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              เดือนที่แล้ว
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              ทั้งหมด (ไม่จำกัดช่วงเวลา)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">ตั้งแต่วันที่</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">ถึงวันที่</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">สถานะคำขอ</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
              >
                <option value="ALL">ทั้งหมดทุกสถานะ</option>
                <option value="APPROVED">เฉพาะที่อนุมัติแล้ว (Approved)</option>
                <option value="PENDING">เฉพาะที่รออนุมัติ (Pending)</option>
                <option value="REJECTED">เฉพาะที่ถูกปฏิเสธ (Rejected)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>ไฟล์ Excel ถูกจัดรูปแบบเป็นทางการและแนบประวัติการกดอนุมัติของเจ้าหน้าที่ครบถ้วน</span>
          </div>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownload}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-2xl text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'กำลังสร้างไฟล์ Excel...' : 'ดาวน์โหลดรายงาน Excel สำหรับผู้บริหาร (.xlsx)'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800">ชีตที่ 1: รายงานการจองห้องประชุม</h4>
              <p className="text-[11px] text-slate-500">ข้อมูลสรุปการใช้ห้องประชุมตามวันและเวลา</p>
            </div>
          </div>
          <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>รหัสการจอง (Booking Code) และวันที่ใช้งาน</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>ชื่อ-นามสกุล, รหัสนักศึกษา, คณะ/หน่วยงาน, เบอร์โทร และอีเมล</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>วัตถุประสงค์ในการขอใช้ห้อง และสถานะการพิจารณา</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>ชื่อแอดมินผู้อนุมัติ/ปฏิเสธ พร้อมวันเวลาที่บันทึกคำสั่ง</span>
            </li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800">ชีตที่ 2: บันทึกการตรวจสอบ (Audit Trail)</h4>
              <p className="text-[11px] text-slate-500">หลักฐานลำดับเหตุการณ์ความโปร่งใสของระบบ</p>
            </div>
          </div>
          <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <span>วันเวลาที่เกิดเหตุการณ์อย่างละเอียด (Timestamp)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <span>ประเภทคำสั่ง (สร้างการจอง, อนุมัติ, ปฏิเสธ, ปรับการตั้งค่า)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <span>ชื่อและบทบาทของผู้กระทำ (Actor & Role)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <span>IP Address และคำอธิบายบันทึก (Details & Remarks)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
