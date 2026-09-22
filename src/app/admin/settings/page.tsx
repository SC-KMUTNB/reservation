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
  Globe
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
    return <div className="p-8 text-center text-slate-400">กำลังโหลดการตั้งค่า...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">จัดการข้อมูลโซเชียลมีเดียและการตั้งค่าระบบ</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ปรับเปลี่ยนช่องทาง Social Links, ฟอร์มร้องเรียน, กฎการใช้ห้อง และข้อความหน้าบ้านแบบเรียลไทม์
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-orange-600/20 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800">ช่องทางโซเชียลมีเดีย (Social Media Channels)</h3>
            <p className="text-[11px] text-slate-400">ลิงก์และชื่อบัญชีที่จะแสดงบนการ์ดหน้าหลัก</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">ลิงก์ Facebook Page</label>
            <input
              type="url"
              value={settings.social_facebook || ''}
              onChange={(e) => updateField('social_facebook', e.target.value)}
              placeholder="https://www.facebook.com/..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">ชื่อแสดง Facebook</label>
            <input
              type="text"
              value={settings.social_facebook_title || ''}
              onChange={(e) => updateField('social_facebook_title', e.target.value)}
              placeholder="สภานักศึกษา มจพ."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">ลิงก์ Instagram Profile</label>
            <input
              type="url"
              value={settings.social_instagram || ''}
              onChange={(e) => updateField('social_instagram', e.target.value)}
              placeholder="https://www.instagram.com/..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">ชื่อแสดง Instagram</label>
            <input
              type="text"
              value={settings.social_instagram_title || ''}
              onChange={(e) => updateField('social_instagram_title', e.target.value)}
              placeholder="@kmutnb_parliament"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">ลิงก์ TikTok Profile</label>
            <input
              type="url"
              value={settings.social_tiktok || ''}
              onChange={(e) => updateField('social_tiktok', e.target.value)}
              placeholder="https://www.tiktok.com/@..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">ชื่อแสดง TikTok</label>
            <input
              type="text"
              value={settings.social_tiktok_title || ''}
              onChange={(e) => updateField('social_tiktok_title', e.target.value)}
              placeholder="สภานักศึกษา มจพ."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800">ลิงก์แบบฟอร์มร้องเรียน (Complaint Form)</h3>
            <p className="text-[11px] text-slate-400">Google Form URL สำหรับรับเรื่องร้องเรียนจากนักศึกษา</p>
          </div>
        </div>

        <div className="text-xs">
          <label className="block font-semibold text-slate-700 mb-1">Google Form URL</label>
          <input
            type="url"
            value={settings.complaint_url || ''}
            onChange={(e) => updateField('complaint_url', e.target.value)}
            placeholder="https://forms.gle/..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800">กฎระเบียบการใช้ห้องประชุม (Meeting Room Rules)</h3>
            <p className="text-[11px] text-slate-400">ข้อความเตือนและกฎระเบียบที่จะแสดงให้นักศึกษากดยอมรับก่อนยืนยันการจอง</p>
          </div>
        </div>

        <div className="text-xs">
          <label className="block font-semibold text-slate-700 mb-1">รายละเอียดกฎระเบียบ (เว้นบรรทัดได้)</label>
          <textarea
            rows={5}
            value={settings.rules_content || ''}
            onChange={(e) => updateField('rules_content', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-orange-500 leading-relaxed"
          ></textarea>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800">ข้อมูลติดต่อและส่วนหัวของเว็บไซต์</h3>
            <p className="text-[11px] text-slate-400">ชื่อหน่วยงานและข้อมูลติดต่อที่แสดงบริเวณแถบด้านล่าง (Footer)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">อีเมลติดต่อสภาฯ</label>
            <input
              type="email"
              value={settings.contact_email || ''}
              onChange={(e) => updateField('contact_email', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
            <input
              type="text"
              value={settings.contact_phone || ''}
              onChange={(e) => updateField('contact_phone', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
