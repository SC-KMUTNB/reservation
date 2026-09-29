'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Share2,
  Save,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  FileText,
  Phone,
  Mail,
  Globe,
  Sliders,
  Sparkles,
  Check,
  X,
  ShieldCheck,
  Lock,
  Send,
  Eye,
  EyeOff,
  Table,
  HelpCircle,
  RefreshCw,
  Server
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    site_title: '',
    site_subtitle: '',
    hero_title: '',
    hero_description: '',
    social_facebook: '',
    social_facebook_title: '',
    social_instagram: '',
    social_instagram_title: '',
    social_tiktok: '',
    social_tiktok_title: '',
    complaint_url: '',
    rules_content: '',
    timezone: 'Asia/Bangkok',
    contact_email: '',
    contact_phone: '',
    // Email settings
    email_provider: 'AUTO',
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: 'false',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    resend_api_key: '',
    resend_from: '',
    admin_notification_email: '',
    // Google Sheets settings
    google_sheet_sync_mode: 'AUTO',
    google_sheet_webhook_url: '',
    google_sheet_id: '',
    google_service_account_email: '',
    google_private_key: '',
    google_sheet_name: 'ตารางจอง',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password visibility states
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);

  // Test Email state
  const [testEmailTo, setTestEmailTo] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailSuccess, setTestEmailSuccess] = useState<string | null>(null);
  const [testEmailError, setTestEmailError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...(data.settings || {}) }));
        setIsSuperAdmin(Boolean(data.isSuperAdmin));
        if (data.settings?.admin_notification_email) {
          setTestEmailTo(data.settings.admin_notification_email);
        } else if (data.settings?.contact_email) {
          setTestEmailTo(data.settings.contact_email);
        }
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('เกิดข้อผิดพลาดในการโหลดข้อมูลการตั้งค่า');
    } finally {
      setIsLoading(false);
    }
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
        setErrorMsg(data.error || 'ไม่สามารถบันทึกข้อมูลได้');
        return;
      }

      setSuccessMsg('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว (ข้อมูลสำคัญได้รับการเข้ารหัสอย่างปลอดภัย)');
    } catch (e) {
      console.error(e);
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleTestEmail = async () => {
    if (!testEmailTo.trim() || !testEmailTo.includes('@')) {
      setTestEmailError('กรุณาระบุที่อยู่อีเมลสำหรับรับข้อความทดสอบ');
      return;
    }

    setIsTestingEmail(true);
    setTestEmailSuccess(null);
    setTestEmailError(null);

    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: testEmailTo.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setTestEmailError(data.error || 'การทดสอบส่งอีเมลล้มเหลว');
      } else {
        setTestEmailSuccess(data.message || 'ส่งอีเมลทดสอบเรียบร้อยแล้ว');
      }
    } catch (err: any) {
      setTestEmailError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsTestingEmail(false);
    }
  };

  if (isLoading) {
    return <div className="p-10 text-center text-slate-400 text-xs">กำลังโหลดการตั้งค่าระบบ...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Header & Save Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              ตั้งค่าระบบ & การเชื่อมต่อภายนอก
            </h2>
            {isSuperAdmin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                <ShieldCheck className="w-3 h-3 text-amber-600" />
                Super Admin Access
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-light">
            ปรับแต่งชื่อระบบ ข้อความหน้าเว็บ กฎการจอง ระบบอีเมลแจ้งเตือน และการเชื่อมต่อ Google Sheets แบบเรียลไทม์
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-warm-xs transition flex items-center gap-2 active-press cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-600 font-bold p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-600 font-bold p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Section 1: General Branding & Hero */}
      <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-warm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <Globe className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">1. ข้อมูลชื่อระบบและแบนเนอร์หลัก</h3>
            <p className="text-[11px] text-slate-500">แสดงผลในแถบเมนูและส่วนหัวของหน้าหลัก</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อเว็บไซต์ (Site Title)</label>
            <input
              type="text"
              value={settings.site_title || ''}
              onChange={(e) => updateField('site_title', e.target.value)}
              placeholder="สภานักศึกษา มจพ."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Timezone ระบบ</label>
            <input
              type="text"
              value={settings.timezone || ''}
              onChange={(e) => updateField('timezone', e.target.value)}
              placeholder="Asia/Bangkok"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">คำบรรยายย่อย (Subtitle / English)</label>
            <input
              type="text"
              value={settings.site_subtitle || ''}
              onChange={(e) => updateField('site_subtitle', e.target.value)}
              placeholder="Student Council KMUTNB"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">ข้อความพาดหัวหน้าแรก (Hero Title)</label>
          <input
            type="text"
            value={settings.hero_title || ''}
            onChange={(e) => updateField('hero_title', e.target.value)}
            placeholder="ยินดีต้อนรับสู่พอร์ทัลสภานักศึกษา มจพ."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">คำอธิบายรายละเอียดหน้าแรก (Hero Description)</label>
          <textarea
            rows={2}
            value={settings.hero_description || ''}
            onChange={(e) => updateField('hero_description', e.target.value)}
            placeholder="ศูนย์รวมข้อมูลข่าวสาร การจองห้องประชุม..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
          ></textarea>
        </div>
      </div>

      {/* Section 2: Official Social Media Channels */}
      <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-warm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Share2 className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">2. ช่องทางโซเชียลมีเดียทางการ</h3>
            <p className="text-[11px] text-slate-500">ลิงก์และชื่อบัญชีแสดงผลในหน้าแรก</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Facebook */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อเพจ Facebook</label>
              <input
                type="text"
                value={settings.social_facebook_title || ''}
                onChange={(e) => updateField('social_facebook_title', e.target.value)}
                placeholder="สภานักศึกษา มจพ."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ลิงก์ Facebook URL</label>
              <input
                type="url"
                value={settings.social_facebook || ''}
                onChange={(e) => updateField('social_facebook', e.target.value)}
                placeholder="https://facebook.com/..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
          </div>

          {/* Instagram */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อบัญชี Instagram</label>
              <input
                type="text"
                value={settings.social_instagram_title || ''}
                onChange={(e) => updateField('social_instagram_title', e.target.value)}
                placeholder="@kmutnb_council"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ลิงก์ Instagram URL</label>
              <input
                type="url"
                value={settings.social_instagram || ''}
                onChange={(e) => updateField('social_instagram', e.target.value)}
                placeholder="https://instagram.com/..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
          </div>

          {/* TikTok */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อบัญชี TikTok</label>
              <input
                type="text"
                value={settings.social_tiktok_title || ''}
                onChange={(e) => updateField('social_tiktok_title', e.target.value)}
                placeholder="สภานักศึกษา มจพ."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ลิงก์ TikTok URL</label>
              <input
                type="url"
                value={settings.social_tiktok || ''}
                onChange={(e) => updateField('social_tiktok', e.target.value)}
                placeholder="https://tiktok.com/@..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Regulations & Contact */}
      <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-warm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <FileText className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">3. กฎระเบียบห้องประชุมและข้อมูลติดต่อ</h3>
            <p className="text-[11px] text-slate-500">ข้อความยืนยันก่อนจอง และข้อมูลท้ายหน้าเว็บ</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ลิงก์ Google Form รับเรื่องร้องเรียน
          </label>
          <input
            type="url"
            value={settings.complaint_url || ''}
            onChange={(e) => updateField('complaint_url', e.target.value)}
            placeholder="https://forms.gle/..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            กฎระเบียบการใช้ห้องประชุม (แสดงในหน้าต่างยืนยันก่อนส่งคำขอ)
          </label>
          <textarea
            rows={4}
            value={settings.rules_content || ''}
            onChange={(e) => updateField('rules_content', e.target.value)}
            placeholder="ระบุกฎระเบียบ เช่น ห้ามนำอาหารเข้ามา..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white leading-relaxed"
          ></textarea>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมลติดต่อทางการ</label>
            <input
              type="email"
              value={settings.contact_email || ''}
              onChange={(e) => updateField('contact_email', e.target.value)}
              placeholder="council@kmutnb.ac.th"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
            <input
              type="text"
              value={settings.contact_phone || ''}
              onChange={(e) => updateField('contact_phone', e.target.value)}
              placeholder="02-555-2000 ต่อ 1135"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Super Admin Section 4: Email Protocol & Notifications */}
      {isSuperAdmin && (
        <div className="bg-white rounded-3xl p-6 md:p-7 border border-orange-200/80 shadow-warm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Mail className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900">4. ระบบแจ้งเตือนทางอีเมล (Email Notifications)</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    Super Admin Only
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  ส่งอีเมลแจ้งเตือนแอดมินเมื่อมีคำขอใหม่ และแจ้งผู้จองเมื่อมีการเปลี่ยนสถานะคำขอ (รหัสผ่าน/คีย์จะถูกเข้ารหัส AES-256-GCM)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>AES-256-GCM Encrypted at Rest</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ผู้ให้บริการอีเมล (Active Provider)
              </label>
              <select
                value={settings.email_provider || 'AUTO'}
                onChange={(e) => updateField('email_provider', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-medium"
              >
                <option value="AUTO">AUTO (ตรวจสอบ SMTP ก่อน หากล้มเหลวจะสลับไป Resend)</option>
                <option value="SMTP">SMTP เท่านั้น (เช่น Gmail, Office365, Mail Server องค์กร)</option>
                <option value="RESEND">Resend API เท่านั้น (HTTPS REST)</option>
                <option value="DISABLED">DISABLED (ปิดระบบแจ้งเตือนทางอีเมล)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                อีเมลแอดมินสำหรับรับการแจ้งเตือนคำขอใหม่
              </label>
              <input
                type="email"
                value={settings.admin_notification_email || ''}
                onChange={(e) => updateField('admin_notification_email', e.target.value)}
                placeholder="council-admin@kmutnb.ac.th"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
              />
            </div>
          </div>

          {/* Sub-card: SMTP Configuration */}
          <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Server className="w-4 h-4 text-orange-600" />
              <span>ตั้งค่า SMTP Server (เช่น mail.kmutnb.ac.th หรือ smtp.gmail.com)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={settings.smtp_host || ''}
                  onChange={(e) => updateField('smtp_host', e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">SMTP Port</label>
                <input
                  type="number"
                  value={settings.smtp_port || '587'}
                  onChange={(e) => updateField('smtp_port', e.target.value)}
                  placeholder="587"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">SMTP Username</label>
                <input
                  type="text"
                  value={settings.smtp_user || ''}
                  onChange={(e) => updateField('smtp_user', e.target.value)}
                  placeholder="council@kmutnb.ac.th"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                    <span>SMTP Password / App Password</span>
                    <Lock className="w-2.5 h-2.5 text-emerald-600" />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                    className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
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
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">ชื่อและอีเมลผู้ส่ง (SMTP From)</label>
                <input
                  type="text"
                  value={settings.smtp_from || ''}
                  onChange={(e) => updateField('smtp_from', e.target.value)}
                  placeholder='"สภานักศึกษา มจพ." <council@kmutnb.ac.th>'
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">โหมดความปลอดภัย (Secure / TLS)</label>
                <select
                  value={settings.smtp_secure || 'false'}
                  onChange={(e) => updateField('smtp_secure', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                >
                  <option value="false">STARTTLS (พอร์ต 587 แนะนำทั่วไป)</option>
                  <option value="true">SSL/TLS ตรง (พอร์ต 465)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sub-card: Resend Configuration */}
          <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <span>ตั้งค่า Resend API (ทางเลือกสำรอง / รวดเร็ว)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                    <span>Resend API Key</span>
                    <Lock className="w-2.5 h-2.5 text-emerald-600" />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowResendKey(!showResendKey)}
                    className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    {showResendKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showResendKey ? 'ซ่อน' : 'แสดง'}</span>
                  </button>
                </div>
                <input
                  type={showResendKey ? 'text' : 'password'}
                  value={settings.resend_api_key || ''}
                  onChange={(e) => updateField('resend_api_key', e.target.value)}
                  placeholder="re_••••••••••••••••"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Resend From Address</label>
                <input
                  type="text"
                  value={settings.resend_from || ''}
                  onChange={(e) => updateField('resend_from', e.target.value)}
                  placeholder="สภานักศึกษา มจพ. <onboarding@resend.dev>"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Test Email Section */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                ทดสอบส่งอีเมลยืนยันการตั้งค่า (กดเพื่อเช็คว่าส่งได้จริงหรือไม่)
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  placeholder="ระบุอีเมลสำหรับรับข้อความทดสอบ"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={isTestingEmail}
                  className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 transition active-press cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isTestingEmail ? 'กำลังส่ง...' : 'ทดสอบส่ง'}</span>
                </button>
              </div>
            </div>

            {testEmailSuccess && (
              <div className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>{testEmailSuccess}</span>
              </div>
            )}

            {testEmailError && (
              <div className="text-xs text-rose-700 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>{testEmailError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Super Admin Section 5: Google Sheets Real-time Sync */}
      {isSuperAdmin && (
        <div className="bg-white rounded-3xl p-6 md:p-7 border border-emerald-200/80 shadow-warm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Table className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900">
                    5. การเชื่อมต่อ Google Sheets แบบเรียลไทม์ (Google Sheets Real-time Sync)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    Super Admin Only
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  ซิงค์ข้อมูลคำขอจองและการเปลี่ยนสถานะไปยัง Google Sheet อัตโนมัติในแบบ One-Way (คีย์จะถูกเข้ารหัส AES-256-GCM)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>AES-256-GCM Encrypted at Rest</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รูปแบบการเชื่อมต่อ (Sync Mode)
              </label>
              <select
                value={settings.google_sheet_sync_mode || 'AUTO'}
                onChange={(e) => updateField('google_sheet_sync_mode', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-medium"
              >
                <option value="AUTO">AUTO (ตรวจสอบ Webhook URL ก่อน หากไม่มีจะลอง Service Account)</option>
                <option value="APPS_SCRIPT_WEBHOOK">Google Apps Script Webhook (ตั้งค่าง่าย ไม่ต้องเปิด Cloud Console)</option>
                <option value="SERVICE_ACCOUNT">Google Cloud Service Account (เสถียร ใช้ API ตรง)</option>
                <option value="DISABLED">DISABLED (ปิดการเชื่อมต่อไปยัง Google Sheets)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อแผ่นงานในชีต (Sheet Name)
              </label>
              <input
                type="text"
                value={settings.google_sheet_name || 'ตารางจอง'}
                onChange={(e) => updateField('google_sheet_name', e.target.value)}
                placeholder="ตารางจอง"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
              />
            </div>
          </div>

          {/* Apps Script Webhook Option */}
          <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>ทางเลือกที่ 1: Google Apps Script Webhook URL (แนะนำ: ตั้งค่าง่ายสุด)</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              ใน Google Sheets กดเมนู <em>ส่วนขยาย (Extensions) &rarr; Apps Script</em> วางสคริปต์ Webhook แล้ว Deploy เป็น Web App (สิทธิ์ Anyone) จากนั้นนำ Webhook URL มาวางที่นี่
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Apps Script Webhook URL</label>
              <input
                type="url"
                value={settings.google_sheet_webhook_url || ''}
                onChange={(e) => updateField('google_sheet_webhook_url', e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
          </div>

          {/* Service Account Option */}
          <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>ทางเลือกที่ 2: Google Cloud Service Account (API v4)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Spreadsheet ID (ดูจาก URL ของ Google Sheet)
                </label>
                <input
                  type="text"
                  value={settings.google_sheet_id || ''}
                  onChange={(e) => updateField('google_sheet_id', e.target.value)}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Service Account Email
                </label>
                <input
                  type="email"
                  value={settings.google_service_account_email || ''}
                  onChange={(e) => updateField('google_service_account_email', e.target.value)}
                  placeholder="bot-reservation@project.iam.gserviceaccount.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <span>Service Account Private Key (RSA PEM)</span>
                  <Lock className="w-2.5 h-2.5 text-emerald-600" />
                </label>
                <button
                  type="button"
                  onClick={() => setShowGoogleKey(!showGoogleKey)}
                  className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  {showGoogleKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showGoogleKey ? 'ซ่อน' : 'แสดง'}</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={settings.google_private_key || ''}
                onChange={(e) => updateField('google_private_key', e.target.value)}
                placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;••••••••••••••••&#10;-----END RSA PRIVATE KEY-----"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono text-[11px]"
              ></textarea>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Save Bar */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="bg-orange-600 hover:bg-orange-700 text-white px-7 py-3 rounded-2xl text-xs font-bold shadow-warm hover:shadow-warm-lg transition-all duration-200 flex items-center gap-2 active-press cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลงทั้งหมด'}</span>
        </button>
      </div>
    </form>
  );
}
