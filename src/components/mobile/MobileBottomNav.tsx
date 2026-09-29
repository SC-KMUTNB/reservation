'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarCheck, Search, Shield } from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'หน้าแรก',
      href: '/m',
      icon: Home,
      isActive: pathname === '/m',
    },
    {
      label: 'จองห้อง',
      href: '/m/booking',
      icon: CalendarCheck,
      isActive: pathname === '/m/booking',
    },
    {
      label: 'ติดตามผล',
      href: '/m/track',
      icon: Search,
      isActive: pathname === '/m/track',
    },
    {
      label: 'ผู้ดูแล',
      href: '/m/admin/dashboard',
      icon: Shield,
      isActive: pathname.startsWith('/m/admin'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] px-2 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
                active
                  ? 'text-orange-600 font-bold scale-105'
                  : 'text-slate-600 hover:text-slate-800 font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  active ? 'bg-orange-100 text-orange-600' : 'text-slate-600'
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
