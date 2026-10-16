'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Share2,
  Save,
  CheckCircle,
  AlertTriangle,
  FileText,
  Mail,
  Globe,
  Check,
  X,
  ShieldCheck,
  Lock,
  Send,
  Eye,
  EyeOff,
  Table,
  Building,
  Plus,
  Trash2,
  Bell,
  CalendarX,
  Sliders,
} from 'lucide-react';
import { FacilityConfig, DEFAULT_FACILITY_CONFIG } from '@/lib/facility-config';

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
    app_base_url: '',
    // Email settings
    email_provider: 'AUTO',
    email_recipient_target: 'BOTH',
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: 'false',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    admin_notification_email: '',
    // Google Sheets settings
    google_sheet_sync_mode: 'AUTO',
    google_sheet_webhook_url: '',
    google_sheet_id: '',
    google_service_account_email: '',
    google_private_key: '',
    google_sheet_name: 'ตารางจอง',
    // Webhook settings
    webhook_discord_url: '',
    webhook_line_token: '',
    webhook_line_target_id: '',
  });

  const [facilityConfig, setFacilityConfig] = useState<FacilityConfig>(DEFAULT_FACILITY_CONFIG);
  const [newEquipmentName, setNewEquipmentName] = useState('');
  const [newClosedDate, setNewClosedDate] = useState('');
  const [newClosedReason, setNewClosedReason] = useState('');
  const [rulesText, setRulesText] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password visibility states
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [showDiscordWebhook, setShowDiscordWebhook] = useState(false);
  const [showLineToken, setShowLineToken] = useState(false);

  // Test Email state
  const [testEmailTo, setTestEmailTo] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailSuccess, setTestEmailSuccess] = useState<string | null>(null);
  const [testEmailError, setTestEmailError] = useState<string | null>(null);

  // Test Webhook state
  const [testWebhookService, setTestWebhookService] = useState<'ALL' | 'DISCORD' | 'LINE'>('ALL');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testWebhookSuccess, setTestWebhookSuccess] = useState<string | null>(null);
  const [testWebhookError, setTestWebhookError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const { facility_config_json, ...cleanSettings } = (data.settings || {}) as Record<string, string>;
        setSettings((prev) => ({ ...prev, ...cleanSettings }));
        setIsSuperAdmin(Boolean(data.isSuperAdmin));
        if (data.facilityConfig) {
          setFacilityConfig(data.facilityConfig);
          setRulesText((data.facilityConfig.bookingRules || []).join('\n'));
        }
        if (cleanSettings?.admin_notification_email) {
          setTestEmailTo(cleanSettings.admin_notification_email);
        } else if (cleanSettings?.contact_email) {
          setTestEmailTo(cleanSettings.contact_email);
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
        body: JSON.stringify({ settings, facilityConfig }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'ไม่สามารถบันทึกข้อมูลได้');
        return;
      }

      setSuccessMsg('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว (ข้อมูลสำคัญได้รับการเข้ารหัสอย่างปลอดภัย)');
      if (data.facilityConfig) {
        setFacilityConfig(data.facilityConfig);
        setRulesText((data.facilityConfig.bookingRules || []).join('\n'));
      }
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

  const updateFacilityField = <K extends keyof FacilityConfig>(key: K, value: FacilityConfig[K]) => {
    setFacilityConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddEquipment = () => {
    if (!newEquipmentName.trim()) return;
    const id = `eq_${Date.now()}`;
    setFacilityConfig((prev) => ({
      ...prev,
      equipmentList: [...(prev.equipmentList || []), { id, name: newEquipmentName.trim(), available: true }],
    }));
    setNewEquipmentName('');
  };

  const handleToggleEquipment = (id: string) => {
    setFacilityConfig((prev) => ({
      ...prev,
      equipmentList: (prev.equipmentList || []).map((eq) =>
        eq.id === id ? { ...eq, available: !eq.available } : eq
      ),
    }));
  };

  const handleRemoveEquipment = (id: string) => {
    setFacilityConfig((prev) => ({
      ...prev,
      equipmentList: (prev.equipmentList || []).filter((eq) => eq.id !== id),
    }));
  };

  const handleAddClosedDate = () => {
    if (!newClosedDate.trim()) return;
    setFacilityConfig((prev) => ({
      ...prev,
      closedDates: [
        ...(prev.closedDates || []),
        { date: newClosedDate.trim(), reason: newClosedReason.trim() || 'ปิดทำการ' },
      ],
    }));
    setNewClosedDate('');
    setNewClosedReason('');
  };

  const handleRemoveClosedDate = (dateStr: string) => {
    setFacilityConfig((prev) => ({
      ...prev,
      closedDates: (prev.closedDates || []).filter((cd) => cd.date !== dateStr),
    }));
  };

  const handleRulesChange = (text: string) => {
    setRulesText(text);
    const parsed = text.split('\n').map((line) => line.trim()).filter(Boolean);
    setFacilityConfig((prev) => ({ ...prev, bookingRules: parsed }));
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
      setTestEmailError(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true);
    setTestWebhookSuccess(null);
    setTestWebhookError(null);

    try {
      const res = await fetch('/api/admin/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: testWebhookService }),
      });
      const data = await res.json();

      if (!res.ok) {
        setTestWebhookError(data.error || 'การทดสอบส่ง Webhook ล้มเหลว');
      } else {
        setTestWebhookSuccess(data.message || 'ส่งข้อความทดสอบ Webhook เรียบร้อยแล้ว');
      }
    } catch (err: any) {
      setTestWebhookError(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsTestingWebhook(false);
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
            ปรับแต่งชื่อระบบ ห้องประชุม เวลาทำการ อุปกรณ์ กฎการจอง อีเมลแจ้งเตือน และการแจ้งเตือน Webhook แบบเรียลไทม์
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

      {/* Section 2: Facility Configuration (Dynamic Room, Operating Hours, Blackouts, Equipment) */}
      <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-warm space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Building className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">2. ตั้งค่าห้องประชุม เวลาทำการ และอุปกรณ์ (Facility Config)</h3>
            <p className="text-[11px] text-slate-500">กำหนดชื่อห้อง พิกัด ความจุ เวลาเปิด-ปิด อุปกรณ์ยืม และวันปิดทำการ</p>
          </div>
        </div>

        {/* Room Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อห้องประชุม</label>
            <input
              type="text"
              value={facilityConfig.roomName}
              onChange={(e) => updateFacilityField('roomName', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">สถานที่ตั้ง / อาคาร</label>
            <input
              type="text"
              value={facilityConfig.roomLocation}
              onChange={(e) => updateFacilityField('roomLocation', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ความจุสูงสุด (คน)</label>
            <input
              type="number"
              min={1}
              value={facilityConfig.maxCapacity}
              onChange={(e) => updateFacilityField('maxCapacity', Number(e.target.value) || 1)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Operating Hours */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">เวลาเปิดทำการ (HH:MM)</label>
            <input
              type="text"
              pattern="[0-2][0-9]:[0-5][0-9]"
              value={facilityConfig.openTime}
              onChange={(e) => updateFacilityField('openTime', e.target.value)}
              placeholder="08:00"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">เวลาปิดทำการ (HH:MM)</label>
            <input
              type="text"
              pattern="[0-2][0-9]:[0-5][0-9]"
              value={facilityConfig.closeTime}
              onChange={(e) => updateFacilityField('closeTime', e.target.value)}
              placeholder="20:00"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ความยาวรอบจอง (นาที)</label>
            <input
              type="number"
              min={15}
              step={15}
              value={facilityConfig.slotIntervalMinutes}
              onChange={(e) => updateFacilityField('slotIntervalMinutes', Number(e.target.value) || 60)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">จองล่วงหน้าสูงสุด (วัน)</label>
            <input
              type="number"
              min={1}
              value={facilityConfig.maxAdvanceBookingDays}
              onChange={(e) => updateFacilityField('maxAdvanceBookingDays', Number(e.target.value) || 30)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Equipment Management */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <label className="block text-xs font-bold text-slate-800">
            รายการอุปกรณ์ที่มีให้บริการ
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {(facilityConfig.equipmentList || []).map((eq) => (
              <div
                key={eq.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                  eq.available
                    ? 'bg-slate-50 border-slate-200 text-slate-800'
                    : 'bg-slate-100/60 border-slate-200 text-slate-400 line-through'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer select-none flex-grow">
                  <input
                    type="checkbox"
                    checked={eq.available}
                    onChange={() => handleToggleEquipment(eq.id)}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                  <span>{eq.name}</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleRemoveEquipment(eq.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition cursor-pointer"
                  title="ลบอุปกรณ์"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 max-w-md pt-1">
            <input
              type="text"
              value={newEquipmentName}
              onChange={(e) => setNewEquipmentName(e.target.value)}
              placeholder="ชื่ออุปกรณ์ใหม่ เช่น เครื่องบันทึกเสียง..."
              className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="button"
              onClick={handleAddEquipment}
              className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 active-press cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่ม
            </button>
          </div>
        </div>

        {/* Blackout Dates */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarX className="w-4 h-4 text-rose-500" />
            <label className="text-xs font-bold text-slate-800">
              วันหยุดและวันงดให้บริการ (Blackout Dates)
            </label>
          </div>

          {(facilityConfig.closedDates || []).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {facilityConfig.closedDates.map((cd) => (
                <div
                  key={cd.date}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900"
                >
                  <div>
                    <span className="font-mono font-bold mr-2">{cd.date}</span>
                    <span className="text-rose-700">({cd.reason})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveClosedDate(cd.date)}
                    className="text-rose-500 hover:text-rose-700 p-1 rounded-md transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <input
              type="date"
              value={newClosedDate}
              onChange={(e) => setNewClosedDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
            <input
              type="text"
              value={newClosedReason}
              onChange={(e) => setNewClosedReason(e.target.value)}
              placeholder="เหตุผล (เช่น วันหยุดนักขัตฤกษ์)"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 flex-grow max-w-xs"
            />
            <button
              type="button"
              onClick={handleAddClosedDate}
              className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 active-press cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่มวันปิดทำการ
            </button>
          </div>
        </div>

        {/* Booking Rules */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ข้อปฏิบัติและระเบียบการใช้ห้องประชุม (แยกบรรทัดละ 1 ข้อ)
          </label>
          <textarea
            rows={4}
            value={rulesText}
            onChange={(e) => handleRulesChange(e.target.value)}
            placeholder="1. รักษาความสะอาดห้องประชุม&#10;2. ห้ามนำอาหารและเครื่องดื่มเข้ามา..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white leading-relaxed"
          ></textarea>
        </div>
      </div>

      {/* Section 3: Official Social Media Channels */}
      <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-warm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Share2 className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">3. ช่องทางโซเชียลมีเดียทางการ</h3>
            <p className="text-[11px] text-slate-500">ลิงก์และชื่อบัญชีแสดงผลในหน้าแรก</p>
          </div>
        </div>

        <div className="space-y-4">
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

      {/* Section 4: Complaints & Contact */}
      <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-warm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <FileText className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">4. ข้อมูลร้องเรียนและช่องทางติดต่อ</h3>
            <p className="text-[11px] text-slate-500">ฟอร์มรับเรื่องร้องเรียน และข้อมูลท้ายหน้าเว็บ</p>
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

      {/* Super Admin Section 5: Email Protocol & Notifications */}
      {isSuperAdmin && (
        <div className="bg-white rounded-3xl p-6 md:p-7 border border-orange-200/80 shadow-warm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Mail className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900">5. ระบบแจ้งเตือนทางอีเมล (Email Notifications)</h3>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Base URL สำหรับลิงก์ในอีเมล
              </label>
              <input
                type="url"
                value={settings.app_base_url || ''}
                onChange={(e) => updateField('app_base_url', e.target.value)}
                placeholder="https://your-domain.vercel.app"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ผู้ให้บริการอีเมล (Active Provider)
              </label>
              <select
                value={settings.email_provider || 'SMTP'}
                onChange={(e) => updateField('email_provider', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-medium"
              >
                <option value="SMTP">SMTP (Google SMTP / Gmail หรือ Mail Server องค์กร)</option>
                <option value="DISABLED">DISABLED (ปิดระบบแจ้งเตือนทางอีเมล)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ส่งอีเมลแจ้งเตือนถึง (Send Email To)
              </label>
              <select
                value={settings.email_recipient_target || 'BOTH'}
                onChange={(e) => updateField('email_recipient_target', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-medium"
              >
                <option value="BOTH">ทั้งแอดมินและผู้ขอจอง (Both Admin & Booking Person)</option>
                <option value="ADMIN_ONLY">เฉพาะแอดมินเท่านั้น (Admin Only)</option>
                <option value="BOOKING_PERSON">เฉพาะผู้ขอจองเท่านั้น (Booking Person Only)</option>
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
                placeholder="sc.kmutnb65@gmail.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
              />
            </div>
          </div>

          {/* Sub-card: SMTP Configuration */}
          <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-800">
              การตั้งค่าเชื่อมต่อ SMTP Server
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={settings.smtp_host || ''}
                  onChange={(e) => updateField('smtp_host', e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">SMTP Port</label>
                <input
                  type="text"
                  value={settings.smtp_port || '587'}
                  onChange={(e) => updateField('smtp_port', e.target.value)}
                  placeholder="587"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Secure (SSL / TLS)</label>
                <select
                  value={settings.smtp_secure || 'false'}
                  onChange={(e) => updateField('smtp_secure', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="false">STARTTLS (Port 587 - ค่าเริ่มต้น)</option>
                  <option value="true">SSL / TLS (Port 465)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">SMTP Username</label>
                <input
                  type="text"
                  value={settings.smtp_user || ''}
                  onChange={(e) => updateField('smtp_user', e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
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
                  placeholder="App Password 16 หลัก"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">From Name & Email</label>
                <input
                  type="text"
                  value={settings.smtp_from || ''}
                  onChange={(e) => updateField('smtp_from', e.target.value)}
                  placeholder="สภานักศึกษา มจพ. <no-reply@kmutnb.ac.th>"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            {/* Test Email Box */}
            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <input
                type="email"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                placeholder="ใส่อีเมลสำหรับรับผลทดสอบ..."
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono flex-grow max-w-sm"
              />
              <button
                type="button"
                disabled={isTestingEmail}
                onClick={handleTestEmail}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 active-press cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTestingEmail ? 'กำลังส่งทดสอบ...' : 'ทดสอบส่งอีเมล'}</span>
              </button>
              {testEmailSuccess && <span className="text-emerald-700 text-xs font-medium">{testEmailSuccess}</span>}
              {testEmailError && <span className="text-rose-700 text-xs font-medium">{testEmailError}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Section 6: Webhook Notifications (Discord & LINE) */}
      {isSuperAdmin && (
        <div className="bg-white rounded-3xl p-6 md:p-7 border border-indigo-200/80 shadow-warm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Bell className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900">6. ระบบแจ้งเตือนเรียลไทม์ผ่าน Webhook (Discord & LINE)</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    Super Admin Only
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  ส่งข้อความแจ้งเตือนอัตโนมัติเข้า Discord Channel หรือ LINE กลุ่ม/แอดมินทันทีที่มีคำขอใหม่หรือการอัปเดตสถานะ
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>AES-256-GCM Encrypted at Rest</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Discord Webhook */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  <span>Discord Webhook URL</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowDiscordWebhook(!showDiscordWebhook)}
                  className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  {showDiscordWebhook ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showDiscordWebhook ? 'ซ่อน' : 'แสดง'}</span>
                </button>
              </div>
              <input
                type={showDiscordWebhook ? 'text' : 'password'}
                value={settings.webhook_discord_url || ''}
                onChange={(e) => updateField('webhook_discord_url', e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>

            {/* LINE Messaging Token */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>LINE Messaging API / Push Notification</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-slate-700">LINE Channel Access Token</label>
                    <button
                      type="button"
                      onClick={() => setShowLineToken(!showLineToken)}
                      className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      {showLineToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showLineToken ? 'ซ่อน' : 'แสดง'}</span>
                    </button>
                  </div>
                  <input
                    type={showLineToken ? 'text' : 'password'}
                    value={settings.webhook_line_token || ''}
                    onChange={(e) => updateField('webhook_line_token', e.target.value)}
                    placeholder="LINE Channel Long-lived Access Token..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    LINE Target ID (User ID หรือ Group ID)
                  </label>
                  <input
                    type="text"
                    value={settings.webhook_line_target_id || ''}
                    onChange={(e) => updateField('webhook_line_target_id', e.target.value)}
                    placeholder="U12345678... หรือ C12345678..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Test Webhook Controls */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <select
                value={testWebhookService}
                onChange={(e) => setTestWebhookService(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium"
              >
                <option value="ALL">ทดสอบทั้ง Discord & LINE</option>
                <option value="DISCORD">เฉพาะ Discord</option>
                <option value="LINE">เฉพาะ LINE</option>
              </select>

              <button
                type="button"
                disabled={isTestingWebhook}
                onClick={handleTestWebhook}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 active-press cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTestingWebhook ? 'กำลังส่ง...' : 'ทดสอบส่ง Webhook'}</span>
              </button>

              {testWebhookSuccess && <span className="text-emerald-700 text-xs font-medium">{testWebhookSuccess}</span>}
              {testWebhookError && <span className="text-rose-700 text-xs font-medium">{testWebhookError}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Section 7: Google Sheets Database Sync */}
      {isSuperAdmin && (
        <div className="bg-white rounded-3xl p-6 md:p-7 border border-emerald-200/80 shadow-warm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Table className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900">7. การซิงก์ข้อมูลลง Google Sheets</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    Super Admin Only
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  สำรองข้อมูลการจองลงสเปรดชีตอัตโนมัติแบบเรียลไทม์
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
                โหมดการซิงก์ (Sync Mode)
              </label>
              <select
                value={settings.google_sheet_sync_mode || 'AUTO'}
                onChange={(e) => updateField('google_sheet_sync_mode', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-medium"
              >
                <option value="AUTO">AUTO (Webhook ก่อน แล้วสำรองด้วย Service Account)</option>
                <option value="WEBHOOK">WEBHOOK ONLY (Google Apps Script Web App)</option>
                <option value="SERVICE_ACCOUNT">SERVICE ACCOUNT ONLY (Google Cloud API v4)</option>
                <option value="DISABLED">DISABLED (ปิดการเชื่อมต่อ Google Sheets)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อแท็บชีต (Sheet Name)
              </label>
              <input
                type="text"
                value={settings.google_sheet_name || 'ตารางจอง'}
                onChange={(e) => updateField('google_sheet_name', e.target.value)}
                placeholder="ตารางจอง"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Webhook Option */}
          <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-800">
              ทางเลือกที่ 1: Google Apps Script Webhook (แนะนำ - ตั้งค่าง่ายสุด)
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
            <div className="text-xs font-bold text-slate-800">
              ทางเลือกที่ 2: Google Cloud Service Account (API v4)
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
