'use client';

import { useState, useEffect } from 'react';
import Toggle from '@/components/ui/Toggle';
import type { Service } from '@/types';

interface ServiceFormProps {
  service?: Service | null;
  onSave: (data: Partial<Service>) => Promise<void>;
  onCancel: () => void;
}

export default function ServiceForm({ service, onSave, onCancel }: ServiceFormProps) {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState('');
  const [detail, setDetail] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (service) {
      setName(service.name);
      setDuration(service.duration);
      setPrice(service.price);
      setDescription(service.description);
      setDetail(service.detail);
      setImageUrl(service.image_url || '');
      setIsActive(service.is_active);
    }
  }, [service]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'メニュー名を入力してください';
    if (name.length > 50) newErrors.name = '50文字以内で入力してください';
    if (duration < 15 || duration > 480) newErrors.duration = '15〜480分で指定してください';
    if (price < 0) newErrors.price = '0以上の金額を入力してください';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        duration,
        price,
        description: description.trim(),
        detail: detail.trim(),
        image_url: imageUrl.trim(),
        is_active: isActive,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          メニュー名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none"
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            所要時間 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min={15}
              max={480}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none"
            />
            <span className="text-sm text-gray-500 whitespace-nowrap">分</span>
          </div>
          {errors.duration && <p className="mt-1 text-xs text-red-500">{errors.duration}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            料金（税込） <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              min={0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none"
            />
            <span className="text-sm text-gray-500 whitespace-nowrap">円</span>
          </div>
          {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">短い説明（一覧に表示）</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={50}
          placeholder="50文字以内"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">メニュー画像URL</label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none"
        />
        <p className="mt-1 text-xs text-gray-400">Google Drive、Imgur、その他の画像URLを貼り付けてください</p>
        {imageUrl && (
          <div className="mt-2 relative w-32 h-20 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={imageUrl}
              alt="プレビュー"
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">詳細説明</label>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A96E]/50 focus:border-[#C9A96E] outline-none resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <Toggle checked={isActive} onChange={setIsActive} />
        <span className="text-sm text-gray-700">公開する</span>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-6 py-2 bg-[#C9A96E] text-white rounded-lg font-medium hover:bg-[#A07840] transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存する'}
        </button>
      </div>
    </div>
  );
}
