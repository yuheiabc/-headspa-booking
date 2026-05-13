'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import type { AdminStats } from '@/types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
        const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');

        const res = await fetch('/api/bookings', { cache: 'no-store' });
        const bookings = await res.json();

        const todayBookings = bookings.filter(
          (b: { date: string; status: string }) => b.date === today && b.status === 'confirmed'
        ).length;

        const weekBookings = bookings.filter(
          (b: { date: string; status: string }) =>
            b.date >= weekStart && b.date <= weekEnd && b.status !== 'cancelled'
        ).length;

        const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
        const monthRevenue = bookings
          .filter(
            (b: { date: string; status: string }) =>
              b.date >= monthStart && b.date <= monthEnd && b.status !== 'cancelled'
          )
          .reduce((sum: number, b: { price: number }) => sum + b.price, 0);

        const pendingBookings = bookings.filter(
          (b: { date: string; status: string }) => b.date >= today && b.status === 'confirmed'
        ).length;

        const recentBookings = bookings
          .filter((b: { status: string }) => b.status === 'confirmed')
          .slice(0, 5);

        setStats({ todayBookings, weekBookings, monthRevenue, pendingBookings, recentBookings });
      } catch {
        // Dashboard loading failed
      }
    };
    fetchStats();
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#C9A96E] rounded-full" />
      </div>
    );
  }

  const cards = [
    { label: '本日の予約', value: `${stats.todayBookings}件`, color: 'bg-blue-50 text-blue-700' },
    { label: '今週の予約', value: `${stats.weekBookings}件`, color: 'bg-green-50 text-green-700' },
    { label: '今月の売上', value: `¥${stats.monthRevenue.toLocaleString()}`, color: 'bg-[#C9A96E]/10 text-[#A07840]' },
    { label: '予約待ち', value: `${stats.pendingBookings}件`, color: 'bg-purple-50 text-purple-700' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ダッシュボード</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-xl p-5 ${card.color}`}>
            <p className="text-sm opacity-80">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">直近の予約</h2>
        {stats.recentBookings.length === 0 ? (
          <p className="text-gray-500 text-sm">予約がありません</p>
        ) : (
          <div className="space-y-3">
            {stats.recentBookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className="font-medium text-gray-900">{b.name}</span>
                  <span className="text-sm text-gray-500 ml-3">{b.service_name}</span>
                </div>
                <div className="text-sm text-gray-500">
                  {b.date} {b.time}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
