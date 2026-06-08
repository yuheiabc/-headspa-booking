'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import type { SalonSettings } from '@/types';

export default function CompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#C9A96E] rounded-full" />
      </div>
    }>
      <CompletePageInner />
    </Suspense>
  );
}

function CompletePageInner() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || '';
  const serviceName = searchParams.get('service_name') || '';
  const date = searchParams.get('date') || '';
  const time = searchParams.get('time') || '';

  const [salon, setSalon] = useState<SalonSettings | null>(null);

  useEffect(() => {
    fetch('/api/settings/salon', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setSalon);
  }, []);

  const primaryColor = salon?.primary_color || '#C9A96E';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="py-4 px-4 border-b border-gray-100 bg-white">
        <div className="max-w-md mx-auto flex items-center">
          <a
            href="/"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mr-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            トップへ
          </a>
          <span className="text-xl font-bold" style={{ color: primaryColor }}>
            {salon?.logo_text || 'HeadSpa'}
          </span>
          <div className="ml-auto w-16" />
        </div>
      </header>

      <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 57px)' }}>
      <div className="max-w-md w-full text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          <svg className="w-8 h-8" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">ご予約ありがとうございます</h1>
        <p className="text-gray-500 mb-8">{name}様のご予約を承りました</p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-left space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">メニュー</span>
            <span className="font-medium text-gray-900">{serviceName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">日時</span>
            <span className="font-medium text-gray-900">{date} {time}〜</span>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <a
            href="/"
            className="block w-full py-3 text-white rounded-xl font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            トップに戻る
          </a>
          {salon?.line_url && (
            <a
              href={salon.line_url}
              className="block w-full py-3 bg-[#06C755] text-white rounded-xl font-medium hover:bg-[#05A847] transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              LINEで友だち追加
            </a>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
