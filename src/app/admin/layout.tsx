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
  ExternalLink
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
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500 font-medium">
        กำลังโหลดระบบแอดมิน...
      </div>
    );
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const navItems = [
    {
      label: 'แผงควบคุมการจอง',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'รายงานผู้บริหาร (Excel)',
      href: '/admin/reports',
      icon: FileSpreadsheet,
    },
    {
      label: 'บันทึกการตรวจสอบ (Logs)',
      href: '/admin/logs',
      icon: History,
    },
    ...(isSuperAdmin
      ? [
          {
            label: 'จัดการผู้ดูแลระบบ',
            href: '/admin/users',
            icon: Users,
          },
          {
            label: 'ตั้งค่าระบบ & โซเชียล',
            href: '/admin/settings',
            icon: Settings,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-dvh bg-slate-100 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <Link href="/admin/dashboard" className="flex items-center space-x-3">
            <div className="bg-orange-600 text-white p-2 rounded-xl">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight">สภานักศึกษา มจพ.</div>
              <div className="text-[10px] text-orange-400 font-semibold tracking-wider uppercase">
                Admin Portal
              </div>
            </div>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {user && (
          <div className="px-5 py-4 bg-slate-800/60 border-b border-slate-800 text-xs">
            <div className="text-slate-400">เข้าสู่ระบบในชื่อ:</div>
            <div className="font-bold text-white truncate text-sm mt-0.5">{user.fullName}</div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  user.role === 'SUPER_ADMIN'
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                {user.role === 'SUPER_ADMIN' ? 'Super Admin (สิทธิ์สูงสุด)' : 'Admin (เจ้าหน้าที่)'}
              </span>
            </div>
          </div>
        )}

        <nav className={`p-4 space-y-1.5 flex-grow ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-4 border-t border-slate-800 mt-4 space-y-1.5">
            <Link
              href="/"
              target="_blank"
              className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <ExternalLink className="w-4 h-4" />
              <span>เปิดดูหน้าเว็บหลัก</span>
            </Link>

            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition cursor-pointer text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-grow p-4 md:p-8 overflow-y-auto max-h-screen">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
