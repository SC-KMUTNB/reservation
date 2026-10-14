'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, Landmark, Lock, Search, CalendarCheck, ArrowLeft } from 'lucide-react';
import { FacilityConfig } from '@/lib/facility-config';

interface BookingPageHeaderProps {
  siteTitle?: string;
  siteSubtitle?: string;
  facilityConfig: FacilityConfig;
}

export default function BookingPageHeader({
  siteTitle = 'สภานักศึกษา มจพ.',
  siteSubtitle = 'Student Council KMUTNB',
  facilityConfig,
}: BookingPageHeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-40 bg-orange-600/95 backdrop-blur-md border-b border-orange-500/40 text-white shadow-warm-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="bg-white text-orange-600 p-2 rounded-2xl font-bold w-10 h-10 flex items-center justify-center shadow-warm-xs group-hover:scale-105 transition-transform">
              <Landmark className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight tracking-tight text-white drop-shadow-2xs">{siteTitle}</h1>
              <p className="text-[11px] text-orange-100 font-medium tracking-wide">{siteSubtitle}</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
            <Link href="/" className="px-3 py-1.5 rounded-xl text-orange-100 hover:text-white hover:bg-orange-500/40 transition">หน้าหลัก</Link>
            <Link href="/booking" className="px-3 py-1.5 rounded-xl bg-orange-700/60 text-white font-semibold shadow-inner border border-orange-400/30 flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> จองห้องประชุม</Link>
            <Link href="/track" className="px-3 py-1.5 rounded-xl text-orange-100 hover:text-white hover:bg-orange-500/40 transition flex items-center gap-1.5"><Search className="w-4 h-4" /> ตรวจสอบสถานะ</Link>
            <Link href="/admin/login" className="bg-orange-950/40 hover:bg-orange-950/60 text-orange-100 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold border border-orange-400/30 shadow-xs transition active-press flex items-center gap-1.5 ml-2"><Lock className="w-3.5 h-3.5" /> แอดมิน</Link>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-b from-orange-600 to-amber-600 text-white py-10 px-4 relative overflow-hidden">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-orange-950/30 text-orange-100 px-3 py-1 rounded-full text-xs font-medium mb-2 border border-orange-400/30 backdrop-blur-xs">
              <CalendarCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>{facilityConfig.roomName} • {facilityConfig.roomLocation}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">ปฏิทินตรวจสอบและจองห้องประชุม</h2>
            <p className="text-orange-100 text-xs md:text-sm mt-1 max-w-xl font-light">เวลาทำการ {facilityConfig.openTime} - {facilityConfig.closeTime} น. • จองล่วงหน้าได้สูงสุด {facilityConfig.maxAdvanceBookingDays} วัน</p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/" className="bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-4 py-2.5 rounded-xl border border-white/20 transition active-press flex items-center gap-1.5"><ArrowLeft className="w-3.5 h-3.5" /> กลับหน้าหลัก</Link>
            <Link href="/track" className="bg-white text-orange-600 hover:bg-orange-50 text-xs font-bold px-4 py-2.5 rounded-xl shadow-warm-xs transition active-press flex items-center gap-1.5"><Search className="w-3.5 h-3.5" /> ตรวจสอบสถานะการจอง</Link>
          </div>
        </div>
      </section>
    </>
  );
}
