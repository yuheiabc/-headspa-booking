'use client';

import { useState, useEffect, useCallback } from 'react';
import ScheduleForm from '@/components/admin/settings/ScheduleForm';
import HolidayManager from '@/components/admin/settings/HolidayManager';
import type { BusinessHours, SpecialHoliday } from '@/types';

export default function ScheduleSettingsPage() {
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [holidays, setHolidays] = useState<SpecialHoliday[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/schedule', { cache: 'no-store' });
      const data = await res.json();
      setBusinessHours(data.businessHours);
      setHolidays(data.specialHolidays);
    } catch {
      // Failed to fetch
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
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
          <span className="text-gray-900">営業時間</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">営業時間・定休日設定</h1>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">営業時間設定</h2>
          <ScheduleForm initialData={businessHours} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <HolidayManager holidays={holidays} onRefresh={fetchData} />
        </div>
      </div>
    </div>
  );
}
