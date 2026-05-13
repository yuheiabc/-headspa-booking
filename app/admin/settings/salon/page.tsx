'use client';

import { useState, useEffect } from 'react';
import SalonSettingsForm from '@/components/admin/settings/SalonSettingsForm';
import type { SalonSettings } from '@/types';

export default function SalonSettingsPage() {
  const [salon, setSalon] = useState<SalonSettings | null>(null);

  useEffect(() => {
    fetch('/api/settings/salon', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setSalon)
      .catch(() => { /* fetch error */ });
  }, []);

  if (!salon) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#C9A96E] rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <nav className="text-sm text-gray-500 mb-2">
          <a href="/admin" className="hover:text-gray-700">管理トップ</a>
          <span className="mx-2">/</span>
          <a href="/admin/settings" className="hover:text-gray-700">設定</a>
          <span className="mx-2">/</span>
          <span className="text-gray-900">サロン情報</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">サロン基本情報設定</h1>
        {salon.updated_at && (
          <p className="text-xs text-gray-400 mt-1">
            最終更新: {new Date(salon.updated_at).toLocaleString('ja-JP')}
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <SalonSettingsForm initialData={salon} />
      </div>
    </div>
  );
}
