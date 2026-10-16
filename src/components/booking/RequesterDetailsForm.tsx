'use client';

import React from 'react';
import { User, Mail, Phone, Hash, Building, FileText, Trash2, AlertTriangle } from 'lucide-react';
import { BookingFormData } from '@/types/booking';

interface RequesterDetailsFormProps {
  formData: BookingFormData;
  onChange: (field: keyof BookingFormData, value: string) => void;
  errors: Record<string, string | undefined>;
  rememberMe: boolean;
  onToggleRememberMe: (val: boolean) => void;
  onClearSavedProfile: () => void;
  hasSavedProfile: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  conflictMessage?: string | null;
}

export default function RequesterDetailsForm({
  formData,
  onChange,
  errors,
  rememberMe,
  onToggleRememberMe,
  onClearSavedProfile,
  hasSavedProfile,
  onSubmit,
  onCancel,
  isSubmitting,
  conflictMessage,
}: RequesterDetailsFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 text-xs">
      {/* Header and Prefill Info */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <h4 className="font-bold text-sm text-slate-800">ข้อมูลผู้ขอใช้บริการ</h4>
        {hasSavedProfile && (
          <button
            type="button"
            onClick={onClearSavedProfile}
            className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 transition"
          >
            <Trash2 className="w-3 h-3" /> ล้างข้อมูลที่บันทึกไว้ (Clear saved info)
          </button>
        )}
      </div>

      {conflictMessage && (
        <div className="bg-rose-50 border border-rose-300 text-rose-700 p-3 rounded-2xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-medium">{conflictMessage}</span>
        </div>
      )}

      {/* Full Name */}
      <div>
        <label className="block font-semibold text-slate-700 mb-1">
          ชื่อ-นามสกุล ผู้จอง <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            required
            value={formData.fullName}
            onChange={(e) => onChange('fullName', e.target.value)}
            placeholder="เช่น นายสมชาย ใจดี"
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
          />
        </div>
        {errors.fullName && <p className="text-[11px] text-rose-600 mt-1">{errors.fullName}</p>}
      </div>

      {/* Student ID & Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            รหัสนักศึกษา (13 หลัก) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              maxLength={13}
              value={formData.studentId}
              onChange={(e) => onChange('studentId', e.target.value)}
              placeholder="เช่น 6501012345678"
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>
          {errors.studentId && <p className="text-[11px] text-rose-600 mt-1">{errors.studentId}</p>}
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            เบอร์ติดต่อ <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => onChange('phone', e.target.value)}
              placeholder="เช่น 0812345678"
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>
          {errors.phone && <p className="text-[11px] text-rose-600 mt-1">{errors.phone}</p>}
        </div>
      </div>

      {/* Email & Department */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            อีเมลผู้จอง <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="เช่น s6501012345678@kmutnb.ac.th"
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>
          {errors.email && <p className="text-[11px] text-rose-600 mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            หน่วยงาน / ชมรม / คณะ <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={formData.department}
              onChange={(e) => onChange('department', e.target.value)}
              placeholder="เช่น สโมสรนักศึกษาคณะวิศวกรรมศาสตร์"
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>
          {errors.department && (
            <p className="text-[11px] text-rose-600 mt-1">{errors.department}</p>
          )}
        </div>
      </div>

      {/* Meeting Reason */}
      <div>
        <label className="block font-semibold text-slate-700 mb-1">
          เหตุผลและวาระการประชุม <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <textarea
            rows={2}
            required
            value={formData.reason}
            onChange={(e) => onChange('reason', e.target.value)}
            placeholder="ระบุวาระการประชุมหรือกิจกรรมพอสังเขป (อย่างน้อย 5 ตัวอักษร)"
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
          ></textarea>
        </div>
        {errors.reason && <p className="text-[11px] text-rose-600 mt-1">{errors.reason}</p>}
      </div>

      {/* Task 2.3: Opt-in LocalStorage Prefill Checkbox */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => onToggleRememberMe(e.target.checked)}
            className="w-4 h-4 text-orange-600 rounded-md border-slate-300 focus:ring-orange-500 cursor-pointer"
          />
          <span className="text-xs text-slate-700 font-medium">
            จดจำข้อมูลผู้จองไว้ในอุปกรณ์นี้สำหรับครั้งถัดไป
          </span>
        </label>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-medium text-xs transition cursor-pointer"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !!conflictMessage}
          className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs transition shadow-warm-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          ตรวจสอบกฎระเบียบและยืนยัน
        </button>
      </div>
    </form>
  );
}
