'use client';

import React from 'react';
import Link from 'next/link';
import { Landmark } from 'lucide-react';

interface MobileHeaderProps {
  title?: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  rightAction?: React.ReactNode;
}

export default function MobileHeader({
  title = 'สภานักศึกษา มจพ.',
  subtitle = 'Student Council KMUTNB',
  rightAction,
}: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-orange-600 text-white shadow-warm-xs backdrop-blur-md bg-orange-600/95 border-b border-orange-500/40">
      <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between">
        <Link href="/m" className="flex items-center space-x-2.5 active:scale-95 transition-transform">
          <div className="bg-white text-orange-600 p-1.5 rounded-xl font-bold w-8 h-8 flex items-center justify-center shadow-xs">
            <Landmark className="w-4 h-4 stroke-[2.4]" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm leading-tight text-white tracking-tight truncate">
              {title}
            </h1>
            <p className="text-[10px] text-orange-100 font-medium tracking-wide truncate">
              {subtitle}
            </p>
          </div>
        </Link>

        {rightAction ? (
          <div>{rightAction}</div>
        ) : (
          <Link
            href="/m/track"
            className="text-[11px] font-semibold bg-white/15 hover:bg-white/25 active:bg-white/30 text-white px-2.5 py-1.5 rounded-xl transition-colors"
          >
            เช็คสถานะ
          </Link>
        )}
      </div>
    </header>
  );
}
