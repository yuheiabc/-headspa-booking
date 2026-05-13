'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import ColorPicker from '@/components/ui/ColorPicker';
import type { SalonSettings } from '@/types';

interface SalonSettingsFormProps {
  initialData: SalonSettings;
}

export default function SalonSettingsForm({ initialData }: SalonSettingsFormProps) {
  const [data, setData] = useState<SalonSettings>(initialData);
  const [saving, setSaving] = useState(false);

  const update = (field: keyof SalonSettings, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/salon', {
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
      toast.success('サロン情報を更新しました');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">ブランド情報</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">サロン名</label>
            <input
              type="text"
              value={data.salon_name}
              onChange={(e) => update('salon_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">サロン名（サブ）</label>
            <input
              type="text"
              value={data.salon_name_sub}
              onChange={(e) => update('salon_name_sub', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">キャッチコピー</label>
            <input
              type="text"
              value={data.catch_copy}
              onChange={(e) => update('catch_copy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ロゴテキスト</label>
            <input
              type="text"
              value={data.logo_text}
              onChange={(e) => update('logo_text', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">サロン説明文</label>
          <textarea
            value={data.description}
            onChange={(e) => update('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none resize-none"
          />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">テーマカラー</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <ColorPicker
            label="メインカラー"
            value={data.primary_color}
            onChange={(c) => update('primary_color', c)}
          />
          <ColorPicker
            label="ヒーロー背景色"
            value={data.hero_color}
            onChange={(c) => update('hero_color', c)}
          />
        </div>
        <div className="mt-4 p-4 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 mb-3">プレビュー</p>
          <div className="flex items-center gap-4">
            <button
              className="px-6 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: data.primary_color }}
            >
              ボタン例
            </button>
            <div
              className="px-6 py-3 rounded-lg text-white text-sm"
              style={{ backgroundColor: data.hero_color }}
            >
              ヘッダー背景例
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">連絡先情報</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
            <input
              type="text"
              value={data.address}
              onChange={(e) => update('address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input
              type="email"
              value={data.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">LINE公式アカウントURL</label>
            <input
              type="url"
              value={data.line_url}
              onChange={(e) => update('line_url', e.target.value)}
              placeholder="https://lin.ee/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instagram URL</label>
            <input
              type="url"
              value={data.instagram_url}
              onChange={(e) => update('instagram_url', e.target.value)}
              placeholder="https://instagram.com/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-2.5 bg-[#C9A96E] text-white rounded-lg font-medium hover:bg-[#A07840] transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存する'}
        </button>
      </div>
    </div>
  );
}
