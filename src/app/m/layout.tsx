import React from 'react';
import MobileBottomNav from '@/components/mobile/MobileBottomNav';

export const metadata = {
  title: 'ระบบจองห้องประชุม สภานักศึกษา มจพ. (Mobile)',
  description: 'ระบบจองห้องประชุมสภานักศึกษา มจพ. สำหรับอุปกรณ์มือถือ',
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-slate-100 text-slate-800">
      <div className="w-full max-w-md mx-auto min-h-dvh flex flex-col bg-slate-50 shadow-md relative pb-20">
        {children}
        <MobileBottomNav />
      </div>
    </div>
  );
}
