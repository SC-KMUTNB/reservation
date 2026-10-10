'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Mail,
  FileSpreadsheet,
  Save,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Server,
  Lock,
  Eye,
  EyeOff,
  Send
} from 'lucide-react';

export default function MobileAdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Test email state
  const [testEmailTo, setTestEmailTo] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const [showSmtpPass, setShowSmtpPass] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('ไม่สามารถดึงข้อมูลการตั้งค่าได้');
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'บันทึกการตั้งค่าไม่สำเร็จ');
        return;
      }

      setSuccessMsg('บันทึกการตั้งค่าเรียบร้อยแล้ว');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      console.error(e);
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailTo.trim()) return;
    setIsTestingEmail(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: testEmailTo.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTestResult(`ส่งไม่สำเร็จ: ${data.error}`);
      } else {
        setTestResult(`ส่งสำเร็จ! (${data.message})`);
      }
    } catch (e: any) {
      setTestResult(`เกิดข้อผิดพลาด: ${e.message}`);
    } finally {
      setIsTestingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        <RotateCw className="w-6 h-6 text-orange-600 animate-spin mx-auto mb-2" />
        <span>กำลังโหลดการตั้งค่า...</span>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900">ตั้งค่าระบบ (Settings)</h2>
        <p className="text-xs text-slate-500">จัดการข้อมูลพื้นฐาน การเชื่อมต่ออีเมล และ Google Sheets</p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 text-xs">
        {/* Section 1: General Info */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
            <Settings className="w-4 h-4 text-orange-600" />
            <span>ข้อมูลทั่วไปของระบบ</span>
          </h3>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">ชื่อระบบ</label>
            <input
              type="text"
              value={settings.site_title || ''}
              onChange={(e) => updateField('site_title', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">คำบรรยายย่อย</label>
            <input
              type="text"
              value={settings.site_subtitle || ''}
              onChange={(e) => updateField('site_subtitle', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">อีเมลติดต่อหลัก</label>
            <input
              type="email"
              value={settings.contact_email || ''}
              onChange={(e) => updateField('contact_email', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
            />
          </div>
        </div>

        {/* Section 2: Google SMTP Email Settings */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
            <Mail className="w-4 h-4 text-orange-600" />
            <span>การแจ้งเตือนอีเมล (Google SMTP)</span>
          </h3>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Base URL สำหรับลิงก์ในอีเมล
            </label>
            <input
              type="url"
              value={settings.app_base_url || ''}
              onChange={(e) => updateField('app_base_url', e.target.value)}
              placeholder="https://your-domain.vercel.app"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">สถานะระบบอีเมล</label>
            <select
              value={settings.email_provider || 'SMTP'}
              onChange={(e) => updateField('email_provider', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
            >
              <option value="SMTP">SMTP (Google SMTP / Gmail เปิดใช้งาน)</option>
              <option value="DISABLED">DISABLED (ปิดระบบแจ้งเตือนทางอีเมล)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              อีเมลแอดมินสำหรับรับคำขอใหม่
            </label>
            <input
              type="email"
              value={settings.admin_notification_email || ''}
              onChange={(e) => updateField('admin_notification_email', e.target.value)}
              placeholder="sc.kmutnb65@gmail.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Google Account (SMTP User)
            </label>
            <input
              type="text"
              value={settings.smtp_user || ''}
              onChange={(e) => updateField('smtp_user', e.target.value)}
              placeholder="sc.kmutnb65@gmail.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-700">Google App Password (16 หลัก)</label>
              <button
                type="button"
                onClick={() => setShowSmtpPass(!showSmtpPass)}
                className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                {showSmtpPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showSmtpPass ? 'ซ่อน' : 'แสดง'}</span>
              </button>
            </div>
            <input
              type={showSmtpPass ? 'text' : 'password'}
              value={settings.smtp_pass || ''}
              onChange={(e) => updateField('smtp_pass', e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
            />
          </div>

          {/* Quick Test Email */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="block text-[11px] font-semibold text-slate-700">ทดสอบส่งอีเมลยืนยัน</label>
            <div className="flex gap-1.5">
              <input
                type="email"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                placeholder="ใส่อีเมลสำหรับรับข้อความทดสอบ"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={isTestingEmail || !testEmailTo}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs active:scale-95 disabled:opacity-50"
              >
                {isTestingEmail ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : 'ทดสอบ'}
              </button>
            </div>
            {testResult && (
              <p className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg font-mono">
                {testResult}
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Google Sheets Sync */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Google Sheets Real-time Sync</span>
          </h3>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">โหมดการซิงก์ (Sync Mode)</label>
            <select
              value={settings.google_sheet_sync_mode || 'AUTO'}
              onChange={(e) => updateField('google_sheet_sync_mode', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
            >
              <option value="AUTO">AUTO (Webhook URL หรือ Service Account)</option>
              <option value="APPS_SCRIPT_WEBHOOK">Google Apps Script Webhook (แนะนำ)</option>
              <option value="DISABLED">DISABLED (ปิดการซิงก์)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Apps Script Webhook URL</label>
            <input
              type="url"
              value={settings.google_sheet_webhook_url || ''}
              onChange={(e) => updateField('google_sheet_webhook_url', e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="sticky bottom-20 z-30 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-2xl text-xs shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
          >
            {isSaving ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึกการตั้งค่า...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกการตั้งค่าทั้งหมด</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
