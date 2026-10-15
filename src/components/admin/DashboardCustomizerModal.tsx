'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  SlidersHorizontal,
  Table as TableIcon,
  Calendar as CalendarIcon,
  Clock,
  RotateCcw,
  Check,
  Columns,
  LayoutDashboard,
  Filter,
  AlertTriangle,
  CalendarDays,
  Save,
  Loader2,
  Layers,
} from 'lucide-react';
import {
  UserDashboardPreferences,
  DEFAULT_USER_PREFERENCES,
  mergeUserPreferences,
} from '@/lib/user-preferences';

export interface DashboardCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserDashboardPreferences;
  onSave: (newPrefs: UserDashboardPreferences) => Promise<boolean>;
}

interface WidgetOption {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
}

const WIDGET_OPTIONS: WidgetOption[] = [
  {
    id: 'PENDING',
    title: 'รอการตรวจสอบ',
    desc: 'แสดงจำนวนคำขอที่รอดำเนินการอนุมัติหรือปฏิเสธ',
    icon: Clock,
    badgeColor: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    id: 'TODAY',
    title: 'การจองวันนี้',
    desc: 'แสดงจำนวนคำขอจองห้องสำหรับใช้งานในวันปัจจุบัน',
    icon: CalendarIcon,
    badgeColor: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    id: 'URGENT',
    title: 'เร่งด่วน 48 ชม.',
    desc: 'แจ้งเตือนคำขอรออนุมัติที่มีกำหนดการใช้งานภายใน 48 ชั่วโมง',
    icon: AlertTriangle,
    badgeColor: 'text-rose-600 bg-rose-50 border-rose-200',
  },
  {
    id: 'WEEKLY',
    title: 'รวมในสัปดาห์นี้',
    desc: 'แสดงจำนวนการจองห้องทั้งหมดในรอบสัปดาห์ปัจจุบัน',
    icon: CalendarDays,
    badgeColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
];

interface ColumnOption {
  key: keyof UserDashboardPreferences['visibleColumns'];
  title: string;
  desc: string;
}

const COLUMN_OPTIONS: ColumnOption[] = [
  {
    key: 'department',
    title: 'สังกัด / หน่วยงาน',
    desc: 'ชื่อภาควิชา คณะ หรือชมรมกิจกรรมที่ยื่นคำขอจอง',
  },
  {
    key: 'studentId',
    title: 'รหัสนักศึกษา',
    desc: 'รหัสประจำตัวนักศึกษาของผู้ยื่นคำขอ',
  },
  {
    key: 'reason',
    title: 'เหตุผลและวาระ',
    desc: 'วัตถุประสงค์ในการขอใช้ห้องประชุมและรายละเอียดการใช้งาน',
  },
  {
    key: 'approvedBy',
    title: 'ผู้อนุมัติ',
    desc: 'ชื่อผู้ดูแลที่ทำการอนุมัติและวันเวลาที่ดำเนินการ',
  },
];

export default function DashboardCustomizerModal({
  isOpen,
  onClose,
  preferences,
  onSave,
}: DashboardCustomizerModalProps) {
  const [form, setForm] = useState<UserDashboardPreferences>(() =>
    mergeUserPreferences(preferences)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(mergeUserPreferences(preferences));
      setErrorMsg(null);
    }
  }, [isOpen, preferences]);

  if (!isOpen) return null;

  const toggleWidget = (id: string) => {
    setForm((prev) => {
      const exists = prev.visibleWidgets.includes(id);
      const nextWidgets = exists
        ? prev.visibleWidgets.filter((w) => w !== id)
        : [...prev.visibleWidgets, id];
      return { ...prev, visibleWidgets: nextWidgets };
    });
  };

  const toggleColumn = (key: keyof UserDashboardPreferences['visibleColumns']) => {
    setForm((prev) => ({
      ...prev,
      visibleColumns: {
        ...prev.visibleColumns,
        [key]: !prev.visibleColumns[key],
      },
    }));
  };

  const handleResetDefaults = () => {
    setForm({
      ...DEFAULT_USER_PREFERENCES,
      visibleWidgets: [...DEFAULT_USER_PREFERENCES.visibleWidgets],
      visibleColumns: { ...DEFAULT_USER_PREFERENCES.visibleColumns },
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const success = await onSave(form);
      if (success) {
        onClose();
      } else {
        setErrorMsg('ไม่สามารถบันทึกการตั้งค่าได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                ปรับแต่งแดชบอร์ด (Personalize Dashboard)
              </h3>
              <p className="text-xs text-slate-500 font-light">
                กำหนดมุมมอง วิดเจ็ต และคอลัมน์ในแบบของคุณ บันทึกแยกเฉพาะบัญชีของคุณ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-6 flex-1 text-slate-800">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Default View, Filter, and Density */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <LayoutDashboard className="w-4 h-4 text-orange-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. มุมมองและตัวกรองเริ่มต้น (Default View & Filter)
              </h4>
            </div>

            {/* Default View Mode */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">
                มุมมองหน้าจอหลักเริ่มต้น (Default View)
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'TABLE', label: '📋 ตาราง', sub: 'Table View' },
                  { id: 'TIMELINE', label: '🕒 ไทม์ไลน์', sub: 'Timeline View' },
                  { id: 'MONTH', label: '📅 ปฏิทินเดือน', sub: 'Calendar View' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        defaultView: item.id as UserDashboardPreferences['defaultView'],
                      }))
                    }
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      form.defaultView === item.id
                        ? 'border-orange-500 bg-orange-50/40 text-orange-900 ring-2 ring-orange-400/30'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Default Status Filter */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">
                สถานะตัวกรองเริ่มต้น (Default Filter)
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'ALL', label: 'ทั้งหมด', desc: 'ทุกรายการ' },
                  { id: 'PENDING', label: 'รออนุมัติ', desc: 'เฉพาะคำขอรอพิจารณา' },
                  { id: 'TODAY', label: 'วันนี้', desc: 'เฉพาะการจองวันนี้' },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        defaultStatusFilter: filter.id as UserDashboardPreferences['defaultStatusFilter'],
                      }))
                    }
                    className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                      form.defaultStatusFilter === filter.id
                        ? 'border-orange-500 bg-orange-50/40 text-orange-900 ring-2 ring-orange-400/30'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold">{filter.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{filter.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Table Density */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">
                ความหนาแน่นของแถวในตาราง (Table Density)
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'normal',
                    label: 'มาตรฐาน (Normal)',
                    desc: 'ความสูงแถวปกติ เว้นระยะอ่านง่าย สบายตา',
                  },
                  {
                    id: 'compact',
                    label: 'กะทัดรัด (Compact)',
                    desc: 'แถวกระชับ แสดงข้อมูลได้จำนวนมากขึ้นในหน้าเดียว',
                  },
                ].map((density) => (
                  <button
                    key={density.id}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        tableDensity: density.id as 'normal' | 'compact',
                        density: density.id as 'normal' | 'compact',
                      }))
                    }
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      form.tableDensity === density.id
                        ? 'border-orange-500 bg-orange-50/40 text-orange-900 ring-2 ring-orange-400/30'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold">{density.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{density.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Metric Widgets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  2. การแสดงการ์ดสรุปยอด (Metric Widgets)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                เลือกแสดง {form.visibleWidgets.length}/{WIDGET_OPTIONS.length} การ์ด
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {WIDGET_OPTIONS.map((widget) => {
                const IconComponent = widget.icon;
                const isChecked = form.visibleWidgets.includes(widget.id);

                return (
                  <label
                    key={widget.id}
                    onClick={() => toggleWidget(widget.id)}
                    className={`p-3 rounded-2xl border flex items-start gap-3 transition cursor-pointer select-none ${
                      isChecked
                        ? 'border-orange-400 bg-orange-50/25 ring-1 ring-orange-300'
                        : 'border-slate-200 bg-white hover:bg-slate-50 opacity-70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent div
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer pointer-events-none"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {widget.title}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${widget.badgeColor}`}
                        >
                          {widget.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {widget.desc}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 3: Table Columns Visibility */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Columns className="w-4 h-4 text-orange-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  3. การแสดงคอลัมน์ในตาราง (Table Columns Visibility)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                คอลัมน์ข้อมูลเสริม
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {COLUMN_OPTIONS.map((col) => {
                const isChecked = !!form.visibleColumns[col.key];

                return (
                  <label
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className={`p-3 rounded-2xl border flex items-start gap-3 transition cursor-pointer select-none ${
                      isChecked
                        ? 'border-orange-400 bg-orange-50/25 ring-1 ring-orange-300'
                        : 'border-slate-200 bg-white hover:bg-slate-50 opacity-70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent div
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer pointer-events-none"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900">
                        {col.title}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {col.desc}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition cursor-pointer disabled:opacity-50"
            title="รีเซ็ตค่าทั้งหมดกลับเป็นค่ามาตรฐานของระบบ"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่าเริ่มต้น</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-warm-xs active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>บันทึกการตั้งค่า</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
