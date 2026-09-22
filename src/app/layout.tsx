import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#ea580c',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'สภานักศึกษา มจพ. - พอร์ทัลและระบบจองห้องประชุม',
  description: 'ระบบจองห้องประชุมและศูนย์บริการนักศึกษา สภานักศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (มจพ.)',
  keywords: ['มจพ.', 'สภานักศึกษา', 'จองห้องประชุม', 'KMUTNB', 'Student Parliament'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="scroll-smooth">
      <body className="bg-slate-50 text-slate-800 min-h-dvh flex flex-col antialiased selection:bg-orange-500 selection:text-white">
        {/* Skip to main content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-orange-600 focus:text-white focus:rounded-xl focus:shadow-lg focus:outline-none"
        >
          ข้ามไปยังเนื้อหาหลัก
        </a>
        <div id="main-content" className="flex flex-col flex-grow">
          {children}
        </div>
      </body>
    </html>
  );
}
