'use client';

import Link from 'next/link';

const settingsCards = [
  {
    href: '/admin/settings/salon',
    icon: '🏠',
    title: 'サロン情報',
    items: ['店名・住所・SNS', 'キャッチコピー', 'テーマカラー'],
  },
  {
    href: '/admin/settings/services',
    icon: '💆',
    title: 'メニュー管理',
    items: ['料金・時間・説明', '追加・編集・削除', '表示順の変更'],
  },
  {
    href: '/admin/settings/schedule',
    icon: '📅',
    title: '営業時間',
    items: ['曜日・時間設定', '定休日設定', '特別休業日管理'],
  },
  {
    href: '/admin/settings/booking-rules',
    icon: '⚙️',
    title: '予約ルール',
    items: ['受付間隔・上限', '先行予約日数', '予約受付ON/OFF'],
  },
];

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">設定</h1>
      <p className="text-gray-500 text-sm mb-8">サロンの各種設定を管理できます</p>

      <div className="grid gap-4 md:grid-cols-2">
        {settingsCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all hover:-translate-y-0.5 group"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{card.icon}</span>
              <h3 className="font-semibold text-gray-900 group-hover:text-[#C9A96E] transition-colors">
                {card.title}
              </h3>
            </div>
            <ul className="space-y-1">
              {card.items.map((item) => (
                <li key={item} className="text-sm text-gray-500 flex items-center gap-2">
                  <span className="w-1 h-1 bg-gray-300 rounded-full" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-4 text-sm font-medium text-[#C9A96E]">
              設定を変更 →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
