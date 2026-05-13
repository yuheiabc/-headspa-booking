'use client';

import { useState, useEffect } from 'react';
import BookingRulesForm from '@/components/admin/settings/BookingRulesForm';
import type { BookingRules } from '@/types';

export default function BookingRulesSettingsPage() {
  const [rules, setRules] = useState<BookingRules | null>(null);

  useEffect(() => {
    fetch('/api/settings/booking-rules')
      .then((r) => r.json())
      .then(setRules);
  }, []);

  if (!rules) {
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
          <span className="text-gray-900">予約ルール</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">予約ルール設定</h1>
        {rules.updated_at && (
          <p className="text-xs text-gray-400 mt-1">
            最終更新: {new Date(rules.updated_at).toLocaleString('ja-JP')}
          </p>
        )}
      </div>

      <BookingRulesForm initialData={rules} />
    </div>
  );
}
