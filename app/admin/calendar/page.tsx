'use client';

import { useState, useEffect } from 'react';

export default function CalendarPage() {
  const [calendarEmail, setCalendarEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  useEffect(() => {
    // Google連携済みのメールアドレスを取得
    fetch('/api/google-calendar/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.connected_email) {
          setCalendarEmail(data.connected_email);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="h-8 w-48 skeleton mb-6" />
        <div className="h-[600px] skeleton" />
      </div>
    );
  }

  if (!calendarEmail) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Googleカレンダー</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Googleカレンダー未接続</h3>
          <p className="text-sm text-gray-500 mb-4">
            カレンダーを表示するには、まずGoogleアカウントを接続してください。
          </p>
          <a
            href="/admin/settings/google"
            className="inline-block px-5 py-2.5 bg-[#C9A96E] text-white rounded-lg text-sm font-medium hover:bg-[#B89555] transition-colors"
          >
            Google連携設定へ
          </a>
        </div>
      </div>
    );
  }

  const encodedEmail = encodeURIComponent(calendarEmail);
  const embedUrl = `https://calendar.google.com/calendar/embed?src=${encodedEmail}&ctz=Asia%2FTokyo&mode=${viewMode === 'week' ? 'WEEK' : 'MONTH'}&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=0&wkst=2`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Googleカレンダー</h1>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              週表示
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              月表示
            </button>
          </div>
          <a
            href={`https://calendar.google.com/calendar/r`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Googleで開く
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <iframe
          src={embedUrl}
          className="w-full border-0"
          style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}
          title="Google Calendar"
        />
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">
        {calendarEmail} のカレンダーを表示中
      </p>
    </div>
  );
}
