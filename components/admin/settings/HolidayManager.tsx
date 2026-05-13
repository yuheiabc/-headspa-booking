'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { SpecialHoliday } from '@/types';

interface HolidayManagerProps {
  holidays: SpecialHoliday[];
  onRefresh: () => void;
}

export default function HolidayManager({ holidays, onRefresh }: HolidayManagerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [saving, setSaving] = useState(false);

  const grouped = holidays.reduce<Record<string, SpecialHoliday[]>>((acc, h) => {
    const year = h.date.substring(0, 4);
    if (!acc[year]) acc[year] = [];
    acc[year].push(h);
    return acc;
  }, {});

  const handleAdd = async () => {
    if (!newDate) {
      toast.error('日付を選択してください');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/settings/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate, reason: newReason || '臨時休業' }),
        cache: 'no-store',
      });
      if (!res.ok) {
        let errorMsg = '追加に失敗しました';
        try { const err = await res.json(); errorMsg = err.error || errorMsg; } catch { /* empty */ }
        throw new Error(errorMsg);
      }
      toast.success('休業日を追加しました');
      setShowAdd(false);
      setNewDate('');
      setNewReason('');
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '追加に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/settings/schedule?id=${id}`, { method: 'DELETE', cache: 'no-store' });
      if (!res.ok) {
        let errorMsg = '削除に失敗しました';
        try { const err = await res.json(); errorMsg = err.error || errorMsg; } catch { /* empty */ }
        throw new Error(errorMsg);
      }
      toast.success('休業日を削除しました');
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900">特別休業日・臨時休業</h4>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 bg-[#C9A96E] text-white rounded-lg text-xs font-medium hover:bg-[#A07840] transition-colors"
        >
          + 休業日を追加
        </button>
      </div>

      {holidays.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">登録された休業日はありません</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([year, items]) => (
            <div key={year}>
              <h5 className="text-xs font-medium text-gray-500 mb-2">{year}年</h5>
              <div className="space-y-1">
                {items.map((h) => {
                  const d = parseISO(h.date);
                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">
                          {format(d, 'M/d（E）', { locale: ja })}
                        </span>
                        <span className="text-sm text-gray-500">{h.reason}</span>
                      </div>
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="休業日を追加">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">理由</label>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="例: 年末休業、研修のため"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-2 bg-[#C9A96E] text-white rounded-lg font-medium hover:bg-[#A07840] transition-colors disabled:opacity-50"
            >
              {saving ? '追加中...' : '追加する'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
