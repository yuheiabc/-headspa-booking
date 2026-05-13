'use client';

const statusConfig = {
  confirmed: { label: '確定', bg: 'bg-green-100', text: 'text-green-800' },
  cancelled: { label: 'キャンセル', bg: 'bg-red-100', text: 'text-red-800' },
  completed: { label: '完了', bg: 'bg-gray-100', text: 'text-gray-800' },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.confirmed;
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
