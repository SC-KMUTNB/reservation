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
  Layers,
  UploadCloud,
  FileUp,
  AlertTriangle,
  RefreshCw,
  X,
  Database,
  PlusCircle,
  HelpCircle
} from 'lucide-react';

export default function AdminReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);
  const [activePreset, setActivePreset] = useState<number | null>(0);

  // Super Admin state & Sheet Migration
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'overwrite' | 'add'>('overwrite');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    mode: 'overwrite' | 'add';
    totalRows: number;
    imported: number;
    updated: number;
    skipped: number;
  } | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [migrationSuccess, setMigrationSuccess] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().slice(0, 10));
    setEndDate(lastDay.toISOString().slice(0, 10));

    // Check if Super Admin
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.role === 'SUPER_ADMIN') {
          setIsSuperAdmin(true);
        }
      })
      .catch(console.error);
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

  const executeMigration = async () => {
    setIsImportModalOpen(false);
    setIsMigrating(true);
    setMigrationError(null);
    setMigrationSuccess(null);
    setMigrationResult(null);

    try {
      const res = await fetch('/api/admin/migrate-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: importMode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMigrationError(data.error || 'การนำเข้าข้อมูลล้มเหลว');
      } else {
        setMigrationSuccess(data.message || 'นำเข้าข้อมูลประวัติสำเร็จ');
        setMigrationResult(data.result);
      }
    } catch (err: any) {
      setMigrationError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          ศูนย์ส่งออกรายงาน & จัดการข้อมูลประวัติ
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-light">
          ส่งออกไฟล์ Microsoft Excel (.xlsx) สองแผ่นงานเพื่อใช้ประกอบการรายงานผล และนำเข้าข้อมูลประวัติเดิม
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

      {/* Super Admin Section: Sheet Migration from sheetexample */}
      {isSuperAdmin && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-orange-200/90 shadow-warm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <FileUp className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900">
                    นำเข้าข้อมูลประวัติจากโฟลเดอร์ชีต (Import Sheet History)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    Super Admin Only
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  อ่านไฟล์ <code className="font-mono text-orange-600 font-semibold">sheetexample/*.xlsx</code> เพื่อนำเข้าประวัติการจองห้องประชุมเก่าเข้าสู่ระบบ
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              disabled={isMigrating}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-warm-xs transition flex items-center justify-center gap-2 active-press cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isMigrating ? 'animate-spin' : ''}`} />
              <span>{isMigrating ? 'กำลังประมวลผลข้อมูลชีต...' : 'นำเข้าข้อมูลประวัติ (Import)'}</span>
            </button>
          </div>

          {/* Feedback messages */}
          {migrationError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{migrationError}</span>
              </div>
              <button type="button" onClick={() => setMigrationError(null)} className="text-rose-600 font-bold p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {migrationSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{migrationSuccess}</span>
              </div>
              <button type="button" onClick={() => setMigrationSuccess(null)} className="text-emerald-600 font-bold p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {migrationResult && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="text-[11px] font-bold text-slate-700">
                ผลการนำเข้า (โหมด: {migrationResult.mode === 'overwrite' ? 'เขียนทับข้อมูลเดิม (Overwrite)' : 'เพิ่มเฉพาะรายการใหม่ (Add into)'}):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">แถวทั้งหมดในไฟล์</div>
                  <div className="text-lg font-extrabold text-slate-900 mt-0.5">{migrationResult.totalRows}</div>
                </div>
                <div className="text-center p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-emerald-600 font-medium">นำเข้าใหม่สำเร็จ</div>
                  <div className="text-lg font-extrabold text-emerald-600 mt-0.5">+{migrationResult.imported}</div>
                </div>
                <div className="text-center p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-blue-600 font-medium">เขียนทับ/อัปเดต</div>
                  <div className="text-lg font-extrabold text-blue-600 mt-0.5">{migrationResult.updated}</div>
                </div>
                <div className="text-center p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">ข้ามรายการเดิม</div>
                  <div className="text-lg font-extrabold text-slate-400 mt-0.5">{migrationResult.skipped}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Migration Mode Confirmation Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    เลือกรูปแบบการนำเข้าข้อมูลประวัติ
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    คุณต้องการเขียนทับหรือเพิ่มเฉพาะข้อมูลใหม่เข้าสู่ระบบ?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode selection radio cards */}
            <div className="space-y-3">
              <label
                className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition ${
                  importMode === 'overwrite'
                    ? 'border-orange-500 bg-orange-50/50 shadow-xs ring-2 ring-orange-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="overwrite"
                  checked={importMode === 'overwrite'}
                  onChange={() => setImportMode('overwrite')}
                  className="mt-1 text-orange-600 focus:ring-orange-500"
                />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>1. เขียนทับข้อมูลเดิม (Overwrite)</span>
                    <span className="text-[10px] font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      แนะนำสำหรับข้อมูลล่าสุด
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    หากพบรายการที่มีรหัสการจองตรงกัน ระบบจะอัปเดตข้อมูลให้ตรงกับไฟล์ชีตล่าสุด และนำเข้ารายการใหม่ที่ยังไม่เคยมี
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition ${
                  importMode === 'add'
                    ? 'border-orange-500 bg-orange-50/50 shadow-xs ring-2 ring-orange-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="add"
                  checked={importMode === 'add'}
                  onChange={() => setImportMode('add')}
                  className="mt-1 text-orange-600 focus:ring-orange-500"
                />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>2. เพิ่มเฉพาะรายการใหม่ (Add into)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    ไม่แตะต้องหรือแก้ไขข้อมูลเดิมที่มีอยู่ในระบบ ข้ามรายการเดิม และเพิ่มเฉพาะรายการใหม่ที่ยังไม่เคยมีในระบบ
                  </p>
                </div>
              </label>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={executeMigration}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-warm-xs transition flex items-center gap-2 active-press cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ยืนยันเริ่มนำเข้า</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
