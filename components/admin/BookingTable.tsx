'use client';

import { useState } from 'react';
import StatusBadge from './StatusBadge';
import toast from 'react-hot-toast';
import type { Booking } from '@/types';

interface BookingTableProps {
  bookings: Booking[];
  onUpdate: () => void;
}

export default function BookingTable({ bookings, onUpdate }: BookingTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleStatusChange = async (id: string, status: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        cache: 'no-store',
      });
      if (!res.ok) {
        let errorMsg = '更新に失敗しました';
        try { const err = await res.json(); errorMsg = err.error || errorMsg; } catch { /* empty */ }
        throw new Error(errorMsg);
      }
      toast.success('ステータスを更新しました');
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setLoadingId(null);
    }
  };

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        予約がありません
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-500">日時</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">お名前</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">メニュー</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">電話番号</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">料金</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">状態</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">操作</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="font-medium text-gray-900">{booking.date}</div>
                <div className="text-gray-500">{booking.time}〜</div>
              </td>
              <td className="py-3 px-4 font-medium text-gray-900">{booking.name}</td>
              <td className="py-3 px-4">
                <div className="text-gray-900">{booking.service_name}</div>
                <div className="text-gray-500">{booking.duration}分</div>
              </td>
              <td className="py-3 px-4 text-gray-900">{booking.phone}</td>
              <td className="py-3 px-4 font-medium text-gray-900">¥{booking.price.toLocaleString()}</td>
              <td className="py-3 px-4"><StatusBadge status={booking.status} /></td>
              <td className="py-3 px-4">
                {booking.status === 'confirmed' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(booking.id, 'completed')}
                      disabled={loadingId === booking.id}
                      className="text-xs px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      完了
                    </button>
                    <button
                      onClick={() => handleStatusChange(booking.id, 'cancelled')}
                      disabled={loadingId === booking.id}
                      className="text-xs px-2.5 py-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      キャンセル
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
