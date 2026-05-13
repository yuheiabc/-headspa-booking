'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const menuItems = [
  { href: '/admin', label: 'ダッシュボード', icon: '📊' },
  { href: '/admin/bookings', label: '予約管理', icon: '📋' },
];

const settingsItems = [
  { href: '/admin/settings/salon', label: 'サロン情報', icon: '🏠' },
  { href: '/admin/settings/services', label: 'メニュー管理', icon: '💆' },
  { href: '/admin/settings/schedule', label: '営業時間', icon: '📅' },
  { href: '/admin/settings/booking-rules', label: '予約ルール', icon: '📏' },
  { href: '/admin/settings/google', label: 'Google連携', icon: '🔗' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith('/admin/settings'));

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const isActive = (href: string) => pathname === href;

  const sidebar = (
    <div className="flex flex-col h-full bg-[#1A1A1A] text-white">
      <div className="p-6 border-b border-gray-800">
        <Link href="/admin" className="text-xl font-bold text-[#C9A96E]">
          HeadSpa 管理
        </Link>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
              isActive(item.href) ? 'bg-gray-800 text-[#C9A96E]' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="flex items-center justify-between w-full px-6 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-3">
            <span>⚙️</span>
            設定
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {settingsOpen && (
          <div className="ml-4">
            {settingsItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                  isActive(item.href) ? 'bg-gray-800 text-[#C9A96E]' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          ログアウト
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-[#1A1A1A] text-white rounded-lg shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-64 h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebar}
          </div>
        </div>
      )}

      <div className="hidden lg:block w-64 min-h-screen flex-shrink-0">
        {sidebar}
      </div>
    </>
  );
}
