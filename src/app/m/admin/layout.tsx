'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Settings,
  History,
  User,
  LogOut,
  Landmark,
  Shield,
  RotateCw,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import ViewSwitcherFooter from '@/components/mobile/ViewSwitcherFooter';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
}

export default function MobileAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (pathname === '/m/admin/login') {
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push('/m/admin/login');
        }
      } catch (e) {
        console.error(e);
        router.push('/m/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/m/admin/login');
    } catch (e) {
      console.error(e);
    }
  };

  if (pathname === '/m/admin/login') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-3">
        <RotateCw className="w-8 h-8 text-orange-500 animate-spin" />
        <div className="text-xs font-medium">กำลังยืนยันสิทธิ์ผู้ดูแลระบบ...</div>
      </div>
    );
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const navItems = [
    {
      label: 'คำขอ',
      href: '/m/admin/dashboard',
      icon: LayoutDashboard,
      isActive: pathname === '/m/admin/dashboard',
    },
    {
      label: 'รายงาน',
      href: '/m/admin/reports',
      icon: FileSpreadsheet,
      isActive: pathname === '/m/admin/reports',
    },
    ...(isSuperAdmin
      ? [
          {
            label: 'ตั้งค่า',
            href: '/m/admin/settings',
            icon: Settings,
            isActive: pathname === '/m/admin/settings',
          },
          {
            label: 'บันทึก',
            href: '/m/admin/logs',
            icon: History,
            isActive: pathname === '/m/admin/logs',
          },
        ]
      : []),
    {
      label: 'บัญชี',
      href: '/m/admin/profile',
      icon: User,
      isActive: pathname === '/m/admin/profile',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Mobile Admin Header */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-orange-600 text-white p-1.5 rounded-xl font-bold w-8 h-8 flex items-center justify-center shadow-xs">
              <Shield className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="font-bold text-xs text-white flex items-center gap-1.5">
                <span>{user?.fullName || 'ผู้ดูแลระบบ'}</span>
                <span className="text-[9px] bg-orange-950 text-orange-400 border border-orange-700/50 px-1.5 py-0.2 rounded-full font-bold">
                  {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <Link
              href="/m/admin/changelog"
              title="ประวัติการอัปเดตระบบ"
              className={`p-1.5 rounded-xl transition cursor-pointer ${
                pathname === '/m/admin/changelog'
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'text-slate-400 hover:text-orange-400 active:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </Link>

            <button
              onClick={handleLogout}
              title="ออกจากระบบ"
              className="text-slate-400 hover:text-red-400 p-1.5 rounded-xl active:bg-slate-800 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 pb-20">{children}</main>

      {/* Switch to Desktop Footer */}
      <ViewSwitcherFooter currentMode="mobile" />

      {/* Fixed Admin Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 shadow-xl px-2 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
                  active
                    ? 'text-orange-500 font-bold scale-105'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-colors ${
                    active ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400'
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
    </div>
  );
}
