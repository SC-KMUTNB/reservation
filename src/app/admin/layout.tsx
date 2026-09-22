'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileSpreadsheet,
  History,
  Users,
  Settings,
  LogOut,
  Landmark,
  ShieldAlert,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  Shield,
  UserCheck
} from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') {
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
          router.push('/admin/login');
        }
      } catch (e) {
        console.error(e);
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (e) {
      console.error(e);
    }
  };

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
        <div className="w-10 h-10 border-3 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
        <div className="text-xs font-medium tracking-wide">กำลังยืนยันสิทธิ์ผู้ดูแลระบบ...</div>
      </div>
    );
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const navItems = [
    {
      label: 'แผงควบคุมการจอง',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      desc: 'อนุมัติและจัดการคำขอ',
    },
    {
      label: 'รายงานสำหรับผู้บริหาร',
      href: '/admin/reports',
      icon: FileSpreadsheet,
      desc: 'ส่งออกไฟล์ Excel',
    },
    {
      label: 'ประวัติการทำงาน (Logs)',
      href: '/admin/logs',
      icon: History,
      desc: 'บันทึกการตรวจสอบระบบ',
    },
    ...(isSuperAdmin
      ? [
          {
            label: 'จัดการผู้ดูแลระบบ',
            href: '/admin/users',
            icon: Users,
            desc: 'เพิ่ม/แก้ไขสิทธิ์เจ้าหน้าที่',
          },
          {
            label: 'ตั้งค่าระบบ & โซเชียล',
            href: '/admin/settings',
            icon: Settings,
            desc: 'ปรับแต่งเนื้อหาและกฎ',
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-dvh bg-slate-100/90 text-slate-800 flex flex-col md:flex-row antialiased selection:bg-orange-500 selection:text-white">
      {/* Sleek Obsidian Sidebar */}
      <aside className="w-full md:w-68 bg-[#090d16] text-white flex flex-col shrink-0 border-r border-slate-800/80 shadow-2xl relative z-30">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/70 flex justify-between items-center">
          <Link href="/admin/dashboard" className="flex items-center space-x-3 group">
            <div className="bg-gradient-to-tr from-orange-600 to-amber-500 text-white p-2 rounded-2xl shadow-warm-xs group-hover:scale-105 transition-transform">
              <Landmark className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                <span>สภานักศึกษา มจพ.</span>
              </div>
              <div className="text-[10px] text-orange-400 font-bold tracking-widest uppercase font-mono">
                Admin Console
              </div>
            </div>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-xl cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* User Identity Chip */}
        {user && (
          <div className="mx-3.5 my-3.5 p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold flex items-center justify-center text-xs shrink-0 font-mono">
              {user.fullName.slice(0, 2)}
            </div>
            <div className="truncate flex-grow">
              <div className="font-semibold text-white text-xs truncate leading-snug">{user.fullName}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`inline-block px-1.5 py-0.2 rounded-md font-bold text-[9px] uppercase tracking-wide ${
                    user.role === 'SUPER_ADMIN'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  }`}
                >
                  {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Staff Admin'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className={`px-3 py-2 space-y-1 flex-grow ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`}>
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
            เมนูการจัดการ
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group active-press ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-warm-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-orange-400'}`} />
                  <div className="truncate">
                    <div>{item.label}</div>
                  </div>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white ml-2"></div>}
              </Link>
            );
          })}

          {/* Quick Actions & Logout */}
          <div className="pt-4 border-t border-slate-800/80 mt-4 space-y-1">
            <Link
              href="/"
              target="_blank"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900/80 transition active-press"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="w-4 h-4 text-slate-500" />
                <span>เปิดดูหน้าเว็บหลัก</span>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-rose-400/90 hover:text-rose-300 hover:bg-rose-950/30 transition active-press cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>ออกจากระบบ</span>
              </div>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Admin Content Canvas */}
      <main className="flex-grow p-4 md:p-8 overflow-y-auto max-h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
