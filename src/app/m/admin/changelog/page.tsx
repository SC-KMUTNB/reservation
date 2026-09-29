'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
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
  Rocket,
  ChevronLeft
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

export default function MobileAdminChangelogPage() {
  const [filterType, setFilterType] = useState<'ALL' | 'major' | 'minor'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const totalCount = updates.length;
  const majorCount = updates.filter((u) => u.type === 'major').length;
  const minorCount = updates.filter((u) => u.type === 'minor').length;
  const latestVersion = updates[0]?.version || 'v1.0.0';

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

  const formatThaiDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
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
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> ใหม่
          </span>
        );
      case 'fix':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Bug className="w-2.5 h-2.5 text-rose-600" /> แก้ไข
          </span>
        );
      case 'improve':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Zap className="w-2.5 h-2.5 text-blue-600" /> ปรับปรุง
          </span>
        );
      case 'security':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldCheck className="w-2.5 h-2.5 text-purple-600" /> ปลอดภัย
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
            <Tag className="w-2.5 h-2.5" /> ทั่วไป
          </span>
        );
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <Link
          href="/m/admin/dashboard"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-2xs"
        >
          <ChevronLeft className="w-4 h-4" /> แผงควบคุม
        </Link>
        <span className="font-mono text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
          {latestVersion}
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-2 text-orange-400 text-xs font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" /> บันทึกการอัปเดตระบบ
        </div>
        <h1 className="text-lg font-bold">System Changelog</h1>
        <p className="text-slate-300 text-xs mt-1">
          ประวัติการปรับปรุงระบบและฟีเจอร์ใหม่ สภาอาจารย์ มจพ.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-center">
          <div className="bg-slate-950/50 p-1.5 rounded-xl">
            <div className="text-[10px] text-slate-400">ทั้งหมด</div>
            <div className="text-base font-bold text-white">{totalCount}</div>
          </div>
          <div className="bg-slate-950/50 p-1.5 rounded-xl">
            <div className="text-[10px] text-amber-400">Major</div>
            <div className="text-base font-bold text-amber-300">{majorCount}</div>
          </div>
          <div className="bg-slate-950/50 p-1.5 rounded-xl">
            <div className="text-[10px] text-blue-400">Minor</div>
            <div className="text-base font-bold text-blue-300">{minorCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 bg-slate-200/80 p-1 rounded-xl">
        <button
          onClick={() => setFilterType('ALL')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold text-center transition cursor-pointer ${
            filterType === 'ALL'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600'
          }`}
        >
          ทั้งหมด ({totalCount})
        </button>
        <button
          onClick={() => setFilterType('major')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold text-center transition cursor-pointer ${
            filterType === 'major'
              ? 'bg-amber-500 text-white shadow-2xs'
              : 'text-slate-600'
          }`}
        >
          Major ({majorCount})
        </button>
        <button
          onClick={() => setFilterType('minor')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold text-center transition cursor-pointer ${
            filterType === 'minor'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600'
          }`}
        >
          Minor ({minorCount})
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="ค้นหาการเปลี่ยนแปลง..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Releases List */}
      <div className="space-y-3.5">
        {filteredUpdates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            ไม่พบรายการอัปเดตที่ค้นหา
          </div>
        ) : (
          filteredUpdates.map((item, index) => {
            const isMajor = item.type === 'major';

            return (
              <div
                key={item.version}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Release Card Header */}
                <div className="p-3.5 border-b border-slate-100 bg-slate-50/70">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-black text-slate-900 bg-slate-200/90 px-2 py-0.5 rounded-lg">
                        {item.version}
                      </span>
                      {isMajor ? (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          Major
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                          Minor
                        </span>
                      )}
                      {index === 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
                          ล่าสุด
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{formatThaiDate(item.date)}</span>
                    </div>
                  </div>

                  <h2 className="text-sm font-bold text-slate-900 leading-snug">
                    {item.title}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                {/* Changes List */}
                <div className="p-3.5 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    รายการเปลี่ยนแปลง ({item.changes.length})
                  </div>
                  <ul className="space-y-1.5">
                    {item.changes.map((change, cIdx) => (
                      <li
                        key={cIdx}
                        className="text-xs text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-start gap-1.5"
                      >
                        <div className="shrink-0 pt-0.5">
                          {getCategoryBadge(change.category)}
                        </div>
                        <span className="leading-relaxed flex-1 text-slate-800 text-[11px]">
                          {change.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
