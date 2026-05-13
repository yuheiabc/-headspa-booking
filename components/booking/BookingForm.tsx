'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface BookingFormProps {
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  primaryColor: string;
}

export default function BookingForm({
  serviceId,
  serviceName,
  date,
  time,
  duration,
  price,
  primaryColor,
}: BookingFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'confirm'>('input');

  const validate = (): boolean => {
    if (!name.trim()) {
      toast.error('お名前を入力してください');
      return false;
    }
    if (!phone.trim()) {
      toast.error('電話番号を入力してください');
      return false;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('正しいメールアドレスを入力してください');
      return false;
    }
    return true;
  };

  const handleConfirm = () => {
    if (validate()) setStep('confirm');
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          date,
          time,
          service_id: serviceId,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '予約に失敗しました');
      }

      const booking = await res.json();
      const params = new URLSearchParams({
        id: booking.id,
        name: booking.name,
        service_name: booking.service_name,
        date: booking.date,
        time: booking.time,
      });
      window.location.href = `/booking/complete?${params.toString()}`;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '予約に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'confirm') {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">予約内容の確認</h2>
        <div className="bg-gray-50 rounded-xl p-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">メニュー</span>
            <span className="font-medium">{serviceName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">日時</span>
            <span className="font-medium">{date} {time}〜</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">所要時間</span>
            <span className="font-medium">{duration}分</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">料金</span>
            <span className="font-bold" style={{ color: primaryColor }}>¥{price.toLocaleString()}</span>
          </div>
          <hr className="border-gray-200" />
          <div className="flex justify-between">
            <span className="text-gray-500">お名前</span>
            <span className="font-medium">{name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">電話番号</span>
            <span className="font-medium">{phone}</span>
          </div>
          {email && (
            <div className="flex justify-between">
              <span className="text-gray-500">メール</span>
              <span className="font-medium">{email}</span>
            </div>
          )}
          {notes && (
            <div className="flex justify-between">
              <span className="text-gray-500">備考</span>
              <span className="font-medium">{notes}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep('input')}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            修正する
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {loading ? '予約中...' : '予約を確定する'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">お客様情報</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          お名前 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="山田 太郎"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 focus:border-transparent outline-none transition-all"
          style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          電話番号 <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="090-1234-5678"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 focus:border-transparent outline-none transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 focus:border-transparent outline-none transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">備考・ご要望</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ご要望があればご記入ください"
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 focus:border-transparent outline-none transition-all resize-none"
        />
      </div>

      <button
        onClick={handleConfirm}
        className="w-full py-3 text-white rounded-xl font-medium transition-colors hover:opacity-90"
        style={{ backgroundColor: primaryColor }}
      >
        確認画面へ
      </button>
    </div>
  );
}
