'use client';

import { useState, useEffect, useCallback } from 'react';
import ServiceList from '@/components/admin/settings/ServiceList';
import type { Service } from '@/types';

export default function ServicesSettingsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/services', { cache: 'no-store' });
      const data = await res.json();
      setServices(data);
    } catch {
      // Failed to fetch
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

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
          <span className="text-gray-900">メニュー管理</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">メニュー・料金管理</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ServiceList services={services} onRefresh={fetchServices} />
      </div>
    </div>
  );
}
