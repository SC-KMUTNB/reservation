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
  X
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
    contact_email: '',
    contact_phone: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

      setSuccessMsg('บันทึกการตั้งค่าระบบและช่องทางโซเชียลมีเดียเรียบร้อยแล้ว');
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

  if (isLoading) {
    return <div className="p-10 text-center text-slate-400 text-xs">กำลังโหลดการตั้งค่าระบบ...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Header & Save Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            ตั้งค่าระบบและเนื้อหาเว็บไซต์
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-light">
            ปรับแต่งชื่อระบบ ข้อความแนะนำหน้าแรก ลิงก์โซเชียล และกฎการใช้ห้องประชุม
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
