'use client';

import { useState } from 'react';
import Toggle from '@/components/ui/Toggle';
import toast from 'react-hot-toast';
import type { BookingRules } from '@/types';

interface BookingRulesFormProps {
  initialData: BookingRules;
}

export default function BookingRulesForm({ initialData }: BookingRulesFormProps) {
  const [data, setData] = useState<BookingRules>(initialData);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/booking-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        cache: 'no-store',
      });
      if (!res.ok) {
        let errorMsg = '保存に失敗しました';
        try {
          const err = await res.json();
          errorMsg = err.error || errorMsg;
        } catch { /* response body may be empty */ }
        throw new Error(errorMsg);
      }
      toast.success('予約ルールを保存しました');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">予約受付設定</h3>
        <div className="flex items-center gap-4 mb-4">
          <Toggle
            checked={data.booking_open}
            onChange={(checked) => setData((prev) => ({ ...prev, booking_open: checked }))}
          />
          <span className="text-sm text-gray-700">
            現在: {data.booking_open ? '受付中' : '受付停止中'}
          </span>
        </div>
        {!data.booking_open && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">受付停止時のメッセージ</label>
            <input
              type="text"
              value={data.booking_closed_message}
              onChange={(e) => setData((prev) => ({ ...prev, booking_closed_message: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none"
            />
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">
          OFFにすると予約フォームが非表示になります
        </p>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">時間スロット設定</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">予約枠の間隔</label>
            <div className="flex gap-3">
              {[15, 30, 60].map((v) => (
                <label
                  key={v}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                    data.slot_interval === v
                      ? 'border-[#C9A96E] bg-[#C9A96E]/10 text-[#C9A96E]'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="slot_interval"
                    value={v}
                    checked={data.slot_interval === v}
                    onChange={() => setData((prev) => ({ ...prev, slot_interval: v }))}
                    className="sr-only"
                  />
                  {v}分
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">同時受付可能数</label>
            <div className="flex items-center gap-2">
              <select
                value={data.max_bookings_per_slot}
                onChange={(e) => setData((prev) => ({ ...prev, max_bookings_per_slot: Number(e.target.value) }))}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500">名まで</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">受付期間設定</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">最短受付時間</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">予約希望時間の</span>
              <select
                value={data.min_advance_hours}
                onChange={(e) => setData((prev) => ({ ...prev, min_advance_hours: Number(e.target.value) }))}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                {[0, 1, 2, 3, 4, 6, 8, 12, 24, 48].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500">時間前まで受付</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">最大予約可能日数</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">本日から</span>
              <select
                value={data.max_advance_days}
                onChange={(e) => setData((prev) => ({ ...prev, max_advance_days: Number(e.target.value) }))}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                {[7, 14, 30, 60, 90, 120, 180, 365].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500">日先まで予約可能</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">キャンセル期限</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">予約日時の</span>
              <select
                value={data.cancellation_hours}
                onChange={(e) => setData((prev) => ({ ...prev, cancellation_hours: Number(e.target.value) }))}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                {[0, 1, 2, 3, 6, 12, 24, 48, 72].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500">時間前まで</span>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-2.5 bg-[#C9A96E] text-white rounded-lg font-medium hover:bg-[#A07840] transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '設定を保存'}
        </button>
      </div>
    </div>
  );
}
