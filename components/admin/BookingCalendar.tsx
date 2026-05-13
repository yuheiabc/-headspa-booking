'use client';

import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Booking } from '@/types';

interface BookingCalendarProps {
  bookings: Booking[];
  currentMonth: Date;
  onDateClick: (date: string) => void;
}

export default function BookingCalendar({ bookings, currentMonth, onDateClick }: BookingCalendarProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const bookingsByDate = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.date] = (acc[b.date] || 0) + 1;
    return acc;
  }, {});

  const days: JSX.Element[] = [];
  let day = startDate;

  while (day <= endDate) {
    const dateStr = format(day, 'yyyy-MM-dd');
    const count = bookingsByDate[dateStr] || 0;
    const isCurrentMonth = isSameMonth(day, currentMonth);
    const isToday = isSameDay(day, new Date());
    const currentDay = day;

    days.push(
      <button
        key={dateStr}
        onClick={() => onDateClick(format(currentDay, 'yyyy-MM-dd'))}
        className={`p-2 min-h-[60px] text-left rounded-lg transition-colors ${
          isCurrentMonth ? 'hover:bg-gray-100' : 'opacity-30'
        } ${isToday ? 'bg-[#C9A96E]/10 border border-[#C9A96E]' : ''}`}
      >
        <div className={`text-xs ${isToday ? 'text-[#C9A96E] font-bold' : 'text-gray-500'}`}>
          {format(day, 'd')}
        </div>
        {count > 0 && isCurrentMonth && (
          <div className="mt-1 text-xs bg-[#C9A96E] text-white rounded px-1.5 py-0.5 text-center">
            {count}件
          </div>
        )}
      </button>
    );
    day = addDays(day, 1);
  }

  return (
    <div>
      <div className="text-center font-semibold text-gray-900 mb-3">
        {format(currentMonth, 'yyyy年 M月', { locale: ja })}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{days}</div>
    </div>
  );
}
