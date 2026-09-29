'use client';

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  GitCommit,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  Bug,
  Zap,
  ShieldCheck,
  Tag,
  Rocket
} from 'lucide-react';
import updatesData from '@/data/updates.json';

interface ChangeItem {
  category: 'feat' | 'fix' | 'improve' | 'security' | string;
  description: string;
}

interface UpdateRecord {
  version: string;
  date: string;
  type: 'major' | 'minor';
  title: string;
  summary: string;
  changes: ChangeItem[];
}

const updates: UpdateRecord[] = updatesData as UpdateRecord[];

export default function AdminChangelogPage() {
  const [filterType, setFilterType] = useState<'ALL' | 'major' | 'minor'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats calculation
  const totalCount = updates.length;
  const majorCount = updates.filter((u) => u.type === 'major').length;
  const minorCount = updates.filter((u) => u.type === 'minor').length;
  const latestVersion = updates[0]?.version || 'v1.0.0';

  // Filtered updates
  const filteredUpdates = useMemo(() => {
    return updates.filter((item) => {
      const matchType = filterType === 'ALL' || item.type === filterType;
      const matchQuery =
        !searchQuery ||
        item.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.changes.some((c) =>
          c.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      return matchType && matchQuery;
    });
  }, [filterType, searchQuery]);

  // Format Thai date
  const formatThaiDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'feat':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ฟีเจอร์ใหม่
          </span>
        );
      case 'fix':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Bug className="w-3 h-3 text-rose-600" /> แก้ไขข้อผิดพลาด
          </span>
        );
      case 'improve':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Zap className="w-3 h-3 text-blue-600" /> ปรับปรุงระบบ
          </span>
        );
      case 'security':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldCheck className="w-3 h-3 text-purple-600" /> ความปลอดภัย
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Tag className="w-3 h-3" /> ทั่วไป
          </span>
        );
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0f172a] text-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> บันทึกการปล่อยเวอร์ชัน
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              ประวัติการอัปเดตระบบ
              <span className="text-sm font-bold bg-slate-800/90 text-orange-400 border border-orange-500/40 px-2.5 py-0.5 rounded-full font-mono">
                {latestVersion}
              </span>
            </h1>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
              ติดตามความเคลื่อนไหว รายการพัฒนาฟีเจอร์ใหม่ การแก้ไขปัญหา และการปรับปรุงประสิทธิภาพของระบบจองห้องประชุม สภาอาจารย์ มจพ.
            </p>
          </div>

          {/* Stat Badges */}
          <div className="grid grid-cols-3 gap-2.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800 backdrop-blur-xs shrink-0">
            <div className="text-center px-3 py-1.5">
              <div className="text-xs text-slate-400 font-medium">เวอร์ชันทั้งหมด</div>
              <div className="text-xl font-black text-white">{totalCount}</div>
            </div>
            <div className="text-center px-3 py-1.5 border-x border-slate-800">
              <div className="text-xs text-amber-400 font-medium">Major</div>
              <div className="text-xl font-black text-amber-300">{majorCount}</div>
            </div>
            <div className="text-center px-3 py-1.5">
              <div className="text-xs text-blue-400 font-medium">Minor</div>
              <div className="text-xl font-black text-blue-300">{minorCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              filterType === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> ทั้งหมด ({totalCount})
          </button>
          <button
            onClick={() => setFilterType('major')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              filterType === 'major'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-amber-700'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" /> อัปเดตหลัก (Major: {majorCount})
          </button>
          <button
            onClick={() => setFilterType('minor')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              filterType === 'minor'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-blue-700'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" /> อัปเดตย่อย (Minor: {minorCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาเวอร์ชัน, หัวข้อ หรือฟีเจอร์..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Changelog Timeline */}
      <div className="relative pl-6 md:pl-8 border-l-2 border-slate-200 space-y-8 ml-3 md:ml-4">
        {filteredUpdates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <Layers className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <div className="font-bold text-slate-700 text-sm">ไม่พบรายการอัปเดตที่ค้นหา</div>
            <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองประเภทอื่น</p>
          </div>
        ) : (
          filteredUpdates.map((item, index) => {
            const isMajor = item.type === 'major';

            return (
              <div key={item.version} className="relative group">
                {/* Timeline Pin/Dot */}
                <div
                  className={`absolute -left-[35px] md:-left-[43px] top-1.5 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-slate-100 shadow-md transition ${
                    isMajor
                      ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-orange-500/30'
                      : 'bg-slate-700 text-slate-200 shadow-slate-400/20'
                  }`}
                >
                  {isMajor ? (
                    <Rocket className="w-3.5 h-3.5 stroke-[2.2]" />
                  ) : (
                    <GitCommit className="w-3.5 h-3.5 stroke-[2.2]" />
                  )}
                </div>

                {/* Release Card */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden">
                  {/* Card Header */}
                  <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-base md:text-lg font-black text-slate-900 bg-slate-200/80 px-3 py-1 rounded-xl">
                          {item.version}
                        </span>
                        {isMajor ? (
                          <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            Major Release
                          </span>
                        ) : (
                          <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                            Minor Update
                          </span>
                        )}
                        {index === 0 && (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-2xs">
                            ล่าสุด (Latest)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatThaiDate(item.date)}</span>
                      </div>
                    </div>

                    <h2 className="text-base md:text-lg font-bold text-slate-900">
                      {item.title}
                    </h2>
                    <p className="text-xs md:text-sm text-slate-600 mt-1 leading-relaxed">
                      {item.summary}
                    </p>
                  </div>

                  {/* Changes List */}
                  <div className="p-5 md:p-6 space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      รายการความเปลี่ยนแปลง ({item.changes.length} รายการ)
                    </div>
                    <ul className="space-y-2.5">
                      {item.changes.map((change, cIdx) => (
                        <li
                          key={cIdx}
                          className="flex items-start gap-2.5 text-xs md:text-sm text-slate-700 bg-slate-50/70 hover:bg-slate-100/70 p-2.5 rounded-xl border border-slate-100 transition"
                        >
                          <div className="shrink-0 pt-0.5">
                            {getCategoryBadge(change.category)}
                          </div>
                          <span className="leading-relaxed text-slate-800">
                            {change.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
