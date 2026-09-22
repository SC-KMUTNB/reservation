'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Clock,
  Landmark,
  Lock,
  Search,
  ExternalLink,
  Phone,
  Mail,
  Share2,
  CalendarCheck,
  FileText,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle2,
  ChevronRight,
  Tv,
  Volume2,
  Wifi
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [quickSearchQuery, setQuickSearchQuery] = useState('');

  useEffect(() => {
    fetchSettings();
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

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearchQuery.trim()) {
      router.push(`/track?q=${encodeURIComponent(quickSearchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 text-slate-800">
      {/* Sticky Header with Frosted Glass Effect */}
      <header className="sticky top-0 z-40 bg-orange-600/95 backdrop-blur-md border-b border-orange-500/40 text-white shadow-warm-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="bg-white text-orange-600 p-2 rounded-2xl font-bold w-10 h-10 flex items-center justify-center shadow-warm-xs group-hover:scale-105 transition-transform duration-200">
              <Landmark className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight tracking-tight text-white drop-shadow-2xs">
                {settings.site_title || 'สภานักศึกษา มจพ.'}
              </h1>
              <p className="text-[11px] text-orange-100 font-medium tracking-wide">
                {settings.site_subtitle || 'Student Council KMUTNB'}
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl bg-orange-700/60 text-white font-semibold shadow-inner border border-orange-400/30"
            >
              หน้าหลัก
            </Link>
            <Link
              href="/booking"
              className="px-3 py-1.5 rounded-xl text-orange-100 hover:text-white hover:bg-orange-500/40 transition flex items-center gap-1.5"
            >
              <CalendarIcon className="w-4 h-4 stroke-[2]" /> จองห้องประชุม
            </Link>
            <Link
              href="/track"
              className="px-3 py-1.5 rounded-xl text-orange-100 hover:text-white hover:bg-orange-500/40 transition flex items-center gap-1.5"
            >
              <Search className="w-4 h-4 stroke-[2]" /> ตรวจสอบสถานะ
            </Link>
            <a
              href="#channels"
              className="px-3 py-1.5 rounded-xl text-orange-100 hover:text-white hover:bg-orange-500/40 transition"
            >
              ช่องทางติดต่อ
            </a>
            <a
              href="#complaint"
              className="px-3 py-1.5 rounded-xl text-orange-100 hover:text-white hover:bg-orange-500/40 transition"
            >
              เรื่องร้องเรียน
            </a>
            <div className="pl-2">
              <Link
                href="/admin/login"
                className="bg-orange-950/40 hover:bg-orange-950/60 text-orange-100 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold border border-orange-400/30 shadow-xs transition active-press flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" /> แอดมิน
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section with Ambient Lighting and Depth */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-600 via-orange-600 to-amber-600 text-white pt-16 pb-20 px-4">
        {/* Ambient background glow & mesh texture */}
        <div className="absolute inset-0 bg-mesh-dots opacity-15 pointer-events-none"></div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Status badge with animated pulse */}
          <div className="inline-flex items-center gap-2 bg-orange-950/30 text-orange-100 px-4 py-1.5 rounded-full text-xs font-medium mb-6 border border-orange-400/40 backdrop-blur-md shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span>ระบบบริการออนไลน์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-5 leading-[1.18] text-white">
            {settings.hero_title || 'ยินดีต้อนรับสู่พอร์ทัลสภานักศึกษา มจพ.'}
          </h2>

          <p className="text-orange-50 text-base md:text-lg mb-8 max-w-2xl mx-auto font-light leading-relaxed">
            {settings.hero_description ||
              'ศูนย์รวมข้อมูลข่าวสาร จองห้องประชุมเพื่อกิจกรรมนักศึกษา และช่องทางสื่อสารสำหรับชาวพระจอมเกล้าพระนครเหนือ'}
          </p>

          <div className="flex flex-wrap justify-center items-center gap-3.5">
            <Link
              href="/booking"
              className="bg-white text-orange-600 font-bold px-7 py-3.5 rounded-2xl shadow-warm hover:shadow-warm-lg hover:bg-orange-50 transition-all duration-200 active-press flex items-center gap-2.5 text-sm md:text-base group"
            >
              <CalendarIcon className="w-5 h-5 text-orange-600 group-hover:scale-110 transition-transform" />
              <span>จองห้องประชุมทันที</span>
              <ArrowRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/track"
              className="bg-orange-950/40 hover:bg-orange-950/60 text-white font-semibold px-6 py-3.5 rounded-2xl transition-all duration-200 border border-orange-300/40 active-press flex items-center gap-2 text-sm md:text-base backdrop-blur-sm"
            >
              <Search className="w-4 h-4 text-orange-200" />
              <span>ตรวจสอบผลการจอง</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Bento Grid Services Section */}
      <main className="flex-grow max-w-6xl mx-auto px-4 -mt-8 pb-16 w-full space-y-12 relative z-20">
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Bento Card 1: Featured Main Booking Card (Spans 2 columns) */}
            <div className="md:col-span-2 bg-white rounded-3xl p-7 md:p-8 border border-slate-200/90 shadow-warm hover:shadow-warm-lg transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-orange-100/40 rounded-full blur-2xl pointer-events-none group-hover:bg-orange-200/50 transition-all duration-500"></div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200/80 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold">
                    <CalendarCheck className="w-3.5 h-3.5 text-orange-600" />
                    <span>บริการเด่น</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 text-xs">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> รองรับ 15-20 คน</span>
                    <span className="flex items-center gap-1"><Tv className="w-3.5 h-3.5" /> จอโปรเจกเตอร์</span>
                    <span className="flex items-center gap-1"><Wifi className="w-3.5 h-3.5" /> Wi-Fi มจพ.</span>
                  </div>
                </div>

                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2.5">
                  ระบบจองห้องประชุมสภานักศึกษา
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6 max-w-xl">
                  เลือกดูปฏิทินรายเดือนและตารางช่วงเวลาว่าง (08:00 – 20:00 น.) ระบบล็อกช่วงเวลาที่มีการจองแล้วอัตโนมัติ หมดปัญหาการจองเวลาชนกัน สามารถทราบผลการอนุมัติผ่านรหัสตรวจสอบได้ทันที
                </p>

                {/* Operating hours visual pill teaser */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-600" /> เวลาเปิดให้บริการรายวัน
                    </span>
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 text-[11px]">
                      พร้อมใช้งาน
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-[11px] tabular-nums text-slate-500 font-mono">
                    <span className="bg-white border border-slate-200 px-2 py-1 rounded-lg">08:00</span>
                    <span>→</span>
                    <span className="bg-white border border-slate-200 px-2 py-1 rounded-lg">12:00</span>
                    <span>→</span>
                    <span className="bg-white border border-slate-200 px-2 py-1 rounded-lg">16:00</span>
                    <span>→</span>
                    <span className="bg-white border border-slate-200 px-2 py-1 rounded-lg">20:00</span>
                    <span className="text-[10px] text-slate-400 font-sans ml-2">(บล็อกละ 1 ชม.)</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  ฟรีสำหรับชมรม สโมสร และนักศึกษา มจพ. ทุกคณะ
                </span>
                <Link
                  href="/booking"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition-all duration-200 shadow-warm-xs hover:shadow-warm flex items-center gap-2 active-press"
                >
                  <span>เปิดหน้าปฏิทินเพื่อเริ่มจอง</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Bento Card 2: Instant Tracking Card (1 column) */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-warm hover:shadow-warm-lg transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-amber-50 text-amber-600 border border-amber-200/80 rounded-2xl flex items-center justify-center mb-5 shadow-warm-xs">
                  <Search className="w-6 h-6 stroke-[2.2]" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">
                  ตรวจสอบสถานะการจอง
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed mb-5">
                  พิมพ์รหัสการจอง หรือรหัสนักศึกษา เพื่อเช็คผลการอนุมัติได้ทันที
                </p>

                {/* Instant Inline Search Form */}
                <form onSubmit={handleQuickSearch} className="space-y-2 mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={quickSearchQuery}
                      onChange={(e) => setQuickSearchQuery(e.target.value)}
                      placeholder="เช่น 6501012345 หรือ KMUTNB-..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-black text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-xs active-press flex items-center justify-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" /> ค้นหาข้อมูล
                  </button>
                </form>
              </div>

              <Link
                href="/track"
                className="text-xs text-orange-600 font-medium hover:text-orange-700 flex items-center gap-1 mt-2 group"
              >
                <span>ไปยังหน้าค้นหาแบบเต็ม</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* Bento Card 3: Student Voice & Complaints (1 column) */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-warm hover:shadow-warm-lg transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-rose-50 text-rose-600 border border-rose-200/80 rounded-2xl flex items-center justify-center mb-5 shadow-warm-xs">
                  <FileText className="w-6 h-6 stroke-[2.2]" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">
                  เรื่องร้องเรียน & เสนอแนะ
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed mb-6">
                  ร่วมสะท้อนปัญหาเกี่ยวกับการเรียน กิจกรรม อาคารสถานที่ หรือข้อเสนอแนะในการพัฒนามหาวิทยาลัย
                </p>
              </div>

              <a
                href={settings.complaint_url || 'https://forms.gle/your-google-form-link'}
                target="_blank"
                rel="noreferrer"
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition active-press"
              >
                <span>กรอกแบบฟอร์มเสียงนักศึกษา</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Bento Card 4: Official Social Channels Strip (2 columns) */}
            <div id="channels" className="scroll-mt-24 md:col-span-2 bg-white rounded-3xl p-7 border border-slate-200/90 shadow-warm hover:shadow-warm-lg transition-all duration-300 flex flex-col justify-between">
              <div className="mb-5 flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    ช่องทางติดต่อสื่อสารทางการ
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    ติดตามข่าวสารกิจกรรม นโยบาย และประกาศเร่งด่วนจากสภานักศึกษา
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                  @kmutnb_council
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a
                  href={settings.social_facebook || 'https://www.facebook.com'}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 hover:border-blue-300 p-4 rounded-2xl transition flex items-center gap-3.5 group active-press"
                >
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
                    f
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-xs text-slate-800 group-hover:text-blue-600 transition">Facebook</div>
                    <div className="text-[11px] text-slate-500 truncate">{settings.social_facebook_title || 'สภานักศึกษา มจพ.'}</div>
                  </div>
                </a>

                <a
                  href={settings.social_instagram || 'https://www.instagram.com'}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-50 hover:bg-pink-50/70 border border-slate-200/80 hover:border-pink-300 p-4 rounded-2xl transition flex items-center gap-3.5 group active-press"
                >
                  <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
                    IG
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-xs text-slate-800 group-hover:text-pink-600 transition">Instagram</div>
                    <div className="text-[11px] text-slate-500 truncate">{settings.social_instagram_title || '@kmutnb_council'}</div>
                  </div>
                </a>

                <a
                  href={settings.social_tiktok || 'https://www.tiktok.com'}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-slate-400 p-4 rounded-2xl transition flex items-center gap-3.5 group active-press"
                >
                  <div className="w-10 h-10 bg-slate-950 text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
                    TT
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-xs text-slate-800 group-hover:text-slate-950 transition">TikTok</div>
                    <div className="text-[11px] text-slate-500 truncate">{settings.social_tiktok_title || 'สภานักศึกษา มจพ.'}</div>
                  </div>
                </a>
              </div>
            </div>

          </div>
        </section>

        {/* Complaint Callout Banner with Dark Warm Aesthetic */}
        <section
          id="complaint"
          className="scroll-mt-24 bg-gradient-to-r from-slate-900 via-slate-800 to-zinc-900 text-white p-8 md:p-10 rounded-3xl shadow-warm border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="space-y-1.5 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-orange-400 text-xs font-semibold uppercase tracking-wider">
              <span>ศูนย์รับเรื่องราวร้องทุกข์</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold tracking-tight">
              พบปัญหาหรือต้องการความช่วยเหลือในมหาวิทยาลัย?
            </h3>
            <p className="text-slate-300 text-xs md:text-sm max-w-xl font-light leading-relaxed">
              สภานักศึกษาพร้อมเป็นตัวกลางในการประสานงานกับหน่วยงานที่เกี่ยวข้องเพื่อสิทธิและสวัสดิการของเพื่อนนักศึกษาทุกคน
            </p>
          </div>
          <a
            href={settings.complaint_url || 'https://forms.gle/your-google-form-link'}
            target="_blank"
            rel="noreferrer"
            className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-warm hover:shadow-warm-lg transition-all duration-200 whitespace-nowrap flex items-center gap-2 text-xs md:text-sm active-press cursor-pointer shrink-0"
          >
            <span>ส่งเรื่องร้องเรียนออนไลน์</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </section>
      </main>

      {/* Footer with Balanced Spacing & Semantic Details */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-xs mt-auto border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left space-y-1">
            <p className="font-semibold text-slate-200 text-sm">
              สภานักศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (มจพ.)
            </p>
            <p className="text-slate-400 font-light">
              อาคารกิจกรรมนักศึกษา 1518 ถนนประชาราษฎร์ 1 แขวงวงศ์สว่าง เขตบางซื่อ กรุงเทพมหานคร 10800
            </p>
            <p className="text-slate-500 text-[11px] pt-1">
              อีเมล: <span className="text-slate-300">{settings.contact_email || 'council@kmutnb.ac.th'}</span> • โทร: <span className="text-slate-300">{settings.contact_phone || '02-555-2000 ต่อ 1135'}</span>
            </p>
          </div>
          <div className="flex items-center space-x-5 text-slate-300 text-xs font-medium">
            <Link href="/booking" className="hover:text-white transition">
              จองห้องประชุม
            </Link>
            <Link href="/track" className="hover:text-white transition">
              ตรวจสอบสถานะ
            </Link>
            <Link href="/admin/login" className="hover:text-white transition">
              ระบบแอดมิน
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
