'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck,
  Search,
  Users,
  Tv,
  Volume2,
  Wifi,
  Wind,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Phone,
  Mail,
  ExternalLink,
  Sparkles,
  Info
} from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import ViewSwitcherFooter from '@/components/mobile/ViewSwitcherFooter';

export default function MobileHomePage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [trackQuery, setTrackQuery] = useState('');
  const [isRulesExpanded, setIsRulesExpanded] = useState(false);
  const [todayBookings, setTodayBookings] = useState<any[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  useEffect(() => {
    fetchSettings();
    fetchTodayStatus();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTodayStatus = async () => {
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const res = await fetch(`/api/bookings?date=${todayStr}`);
      if (res.ok) {
        const data = await res.json();
        setTodayBookings(data.bookings || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackQuery.trim()) {
      router.push(`/m/track?q=${encodeURIComponent(trackQuery.trim())}`);
    }
  };

  // Determine current room state right now
  const getCurrentRoomStatus = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

    const activeBooking = todayBookings.find(
      (b) => b.status === 'APPROVED' && b.startTime <= currentTimeStr && b.endTime > currentTimeStr
    );

    if (activeBooking) {
      return {
        isBusy: true,
        text: `กำลังใช้งาน (${activeBooking.startTime} - ${activeBooking.endTime} น.)`,
        department: activeBooking.department || 'มีหน่วยงานใช้งาน',
      };
    }

    return {
      isBusy: false,
      text: 'ห้องว่างพร้อมใช้งาน',
      department: 'ไม่มีการประชุมในขณะนี้',
    };
  };

  const currentStatus = getCurrentRoomStatus();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <MobileHeader />

      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-orange-600 to-amber-600 text-white px-4 pt-6 pb-8 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-orange-950/30 text-orange-100 text-[11px] px-3 py-1 rounded-full border border-orange-400/40">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span>บริการจองห้องประชุมออนไลน์</span>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight leading-tight">
            {settings.hero_title || 'ห้องประชุมสภานักศึกษา มจพ.'}
          </h2>

          <p className="text-xs text-orange-50 font-light leading-relaxed">
            {settings.hero_description || 'จองห้องประชุม ติดตามสถานะคำขอ และตรวจสอบช่วงเวลาว่างได้ง่ายๆ ผ่านสมาร์ตโฟน'}
          </p>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <Link
              href="/m/booking"
              className="bg-white text-orange-600 font-bold px-3 py-2.5 rounded-xl text-xs text-center shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>จองห้องทันที</span>
            </Link>
            <Link
              href="/m/track"
              className="bg-orange-700/80 hover:bg-orange-700 border border-orange-400/50 text-white font-bold px-3 py-2.5 rounded-xl text-xs text-center active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Search className="w-4 h-4" />
              <span>ติดตามสถานะ</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="px-4 py-4 space-y-4 -mt-3 relative z-20">
        {/* Live Room Status Card */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                currentStatus.isBusy ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>{currentStatus.text}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{currentStatus.department}</p>
            </div>
          </div>
          <Link
            href="/m/booking"
            className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-lg active:scale-95 transition"
          >
            ดูตาราง &rarr;
          </Link>
        </div>

        {/* Quick Tracking Search Box */}
        <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200/90">
          <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-orange-600" />
            <span>ค้นหาหรือติดตามรหัสการจอง</span>
          </div>
          <form onSubmit={handleTrackSubmit} className="flex gap-1.5">
            <input
              type="text"
              value={trackQuery}
              onChange={(e) => setTrackQuery(e.target.value)}
              placeholder="เช่น KMUTNB-2026-..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="submit"
              className="bg-orange-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold active:scale-95 transition"
            >
              ค้นหา
            </button>
          </form>
        </div>

        {/* Room Specifications & Facilities */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>ข้อมูลห้องประชุมสภานักศึกษา</span>
            </h3>
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              อาคาร 40 ปี มจพ.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <Users className="w-4 h-4 text-orange-600 shrink-0" />
              <div>
                <div className="font-semibold text-slate-700">ความจุ</div>
                <div className="text-[10px] text-slate-500">20 - 30 ที่นั่ง</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <Clock className="w-4 h-4 text-orange-600 shrink-0" />
              <div>
                <div className="font-semibold text-slate-700">เวลาทำการ</div>
                <div className="text-[10px] text-slate-500">08:00 - 20:00 น.</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <Tv className="w-4 h-4 text-orange-600 shrink-0" />
              <div>
                <div className="font-semibold text-slate-700">จอแสดงผล</div>
                <div className="text-[10px] text-slate-500">Smart TV / HDMI</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <Wifi className="w-4 h-4 text-orange-600 shrink-0" />
              <div>
                <div className="font-semibold text-slate-700">อินเทอร์เน็ต</div>
                <div className="text-[10px] text-slate-500">KMUTNB-WiFi</div>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Rules & Regulations */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
          <button
            onClick={() => setIsRulesExpanded(!isRulesExpanded)}
            className="w-full p-4 text-left flex items-center justify-between cursor-pointer active:bg-slate-50 transition"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-bold text-slate-800">กฎระเบียบและข้อปฏิบัติ</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                isRulesExpanded ? 'rotate-180 text-orange-600' : ''
              }`}
            />
          </button>

          {isRulesExpanded && (
            <div className="px-4 pb-4 pt-1 text-[11px] text-slate-600 border-t border-slate-100 space-y-2 whitespace-pre-line leading-relaxed font-light">
              {settings.rules_content ||
                '1. ห้ามนำอาหารและเครื่องดื่ม (ยกเว้นน้ำเปล่า) เข้ามารับประทานในห้องประชุมเด็ดขาด\n2. ช่วยกันรักษาความสะอาด ปิดไฟ และเครื่องปรับอากาศทุกครั้งหลังใช้งานเสร็จ\n⚠️ คำเตือน: หากทำผิดกฎระเบียบ ท่านจะไม่สามารถจองห้องประชุมได้อีกเป็นเวลา 2 เดือนเต็ม'}
            </div>
          )}
        </div>

        {/* Contact & Support */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 space-y-2.5">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-orange-600" />
            <span>ติดต่อสอบถามและแจ้งปัญหา</span>
          </h4>
          <div className="space-y-1.5 text-[11px] text-slate-600">
            {settings.contact_email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <a href={`mailto:${settings.contact_email}`} className="text-orange-600 font-medium">
                  {settings.contact_email}
                </a>
              </div>
            )}
            {settings.contact_phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <a href={`tel:${settings.contact_phone}`} className="text-slate-700">
                  {settings.contact_phone}
                </a>
              </div>
            )}
            {settings.complaint_url && (
              <div className="pt-1">
                <a
                  href={settings.complaint_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-orange-600 font-semibold underline"
                >
                  <span>แบบฟอร์มส่งเรื่องร้องเรียนนักศึกษา</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Switch to Desktop Footer */}
      <ViewSwitcherFooter currentMode="mobile" />
    </div>
  );
}
