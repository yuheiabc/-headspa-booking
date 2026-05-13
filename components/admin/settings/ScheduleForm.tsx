'use client';

import { useState } from 'react';
import Toggle from '@/components/ui/Toggle';
import toast from 'react-hot-toast';
import type { BusinessHours } from '@/types';

const dayNames = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'];

const timeOptions: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    timeOptions.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

interface ScheduleFormProps {
  initialData: BusinessHours[];
}

export default function ScheduleForm({ initialData }: ScheduleFormProps) {
  const [hours, setHours] = useState<BusinessHours[]>(initialData);
  const [saving, setSaving] = useState(false);

  const updateHour = (dayOfWeek: number, field: keyof BusinessHours, value: unknown) => {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessHours: hours.map((h) => ({
            day_of_week: h.day_of_week,
            is_open: h.is_open,
            open_time: h.open_time,
            close_time: h.close_time,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('営業時間を保存しました');
    } catch {
      toast.error('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="space-y-3">
        {hours.map((h) => (
          <div
            key={h.day_of_week}
            className={`flex items-center gap-4 p-3 rounded-lg border ${
              h.is_open ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
            }`}
          >
            <span
              className={`w-12 text-sm font-medium ${
                h.day_of_week === 0 ? 'text-red-500' : h.day_of_week === 6 ? 'text-blue-500' : 'text-gray-700'
              }`}
            >
              {dayNames[h.day_of_week]}
            </span>

            <Toggle
              checked={h.is_open}
              onChange={(checked) => updateHour(h.day_of_week, 'is_open', checked)}
            />

            <select
              value={h.open_time}
              onChange={(e) => updateHour(h.day_of_week, 'open_time', e.target.value)}
              disabled={!h.is_open}
              className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-30 disabled:bg-gray-100"
            >
              {timeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <span className="text-gray-400">〜</span>

            <select
              value={h.close_time}
              onChange={(e) => updateHour(h.day_of_week, 'close_time', e.target.value)}
              disabled={!h.is_open}
              className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-30 disabled:bg-gray-100"
            >
              {timeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {!h.is_open && (
              <span className="text-xs text-red-400 font-medium">定休日</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-2.5 bg-[#C9A96E] text-white rounded-lg font-medium hover:bg-[#A07840] transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '営業時間を保存'}
        </button>
      </div>
    </div>
  );
}
