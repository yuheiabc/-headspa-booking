'use client';

import { useState, useMemo } from 'react';
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, isAfter, isBefore } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { BusinessHours, SpecialHoliday } from '@/types';

interface DatePickerProps {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  maxAdvanceDays: number;
  businessHours: BusinessHours[];
  specialHolidays: SpecialHoliday[];
  primaryColor: string;
}

export default function DatePicker({
  selectedDate,
  onSelect,
  maxAdvanceDays,
  businessHours,
  specialHolidays,
  primaryColor,
}: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();
  const maxDate = addDays(today, maxAdvanceDays);

  const holidayDates = useMemo(
    () => new Set(specialHolidays.map((h) => h.date)),
    [specialHolidays]
  );

  const closedDays = useMemo(
    () => new Set(businessHours.filter((h) => !h.is_open).map((h) => h.day_of_week)),
    [businessHours]
  );

  const isDateDisabled = (date: Date): boolean => {
    if (isBefore(date, today) && !isSameDay(date, today)) return true;
    if (isAfter(date, maxDate)) return true;
    if (closedDays.has(date.getDay())) return true;
    const dateStr = format(date, 'yyyy-MM-dd');
    if (holidayDates.has(dateStr)) return true;
    return false;
  };

  const renderDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: JSX.Element[] = [];
    let day = startDate;

    while (day <= endDate) {
      const currentDay = day;
      const isCurrentMonth = isSameMonth(day, currentMonth);
      const isDisabled = !isCurrentMonth || isDateDisabled(day);
      const isSelected = selectedDate && isSameDay(day, selectedDate);
      const isToday = isSameDay(day, today);
      const isClosed = closedDays.has(day.getDay());

      days.push(
        <button
          key={day.toISOString()}
          disabled={isDisabled}
          onClick={() => !isDisabled && onSelect(currentDay)}
          className={`relative w-full aspect-square flex items-center justify-center text-sm rounded-lg transition-all ${
            isSelected
              ? 'text-white font-bold shadow-md'
              : isDisabled
              ? 'text-gray-300 cursor-not-allowed'
              : isToday
              ? 'font-bold border-2 hover:opacity-80'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          style={
            isSelected
              ? { backgroundColor: primaryColor }
              : isToday && !isDisabled
              ? { borderColor: primaryColor, color: primaryColor }
              : undefined
          }
        >
          {format(day, 'd')}
          {isClosed && isCurrentMonth && !isSelected && (
            <span className="absolute bottom-0.5 text-[8px] text-red-400">休</span>
          )}
        </button>
      );
      day = addDays(day, 1);
    }

    return days;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          disabled={isSameMonth(currentMonth, today)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="font-semibold text-gray-900">
          {format(currentMonth, 'yyyy年 M月', { locale: ja })}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
    </div>
  );
}
