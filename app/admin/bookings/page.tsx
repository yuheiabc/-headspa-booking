'use client';

import { useState, useEffect, useCallback } from 'react';
import BookingTable from '@/components/admin/BookingTable';
import type { Booking } from '@/types';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (dateFilter) params.set('date', dateFilter);
      const res = await fetch(`/api/bookings?${params.toString()}`);
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [filter, dateFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">予約管理</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { value: 'all', label: 'すべて' },
              { value: 'confirmed', label: '確定' },
              { value: 'completed', label: '完了' },
              { value: 'cancelled', label: 'キャンセル' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              日付クリア
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-[#C9A96E] rounded-full" />
          </div>
        ) : (
          <BookingTable bookings={bookings} onUpdate={fetchBookings} />
        )}
      </div>
    </div>
  );
}
