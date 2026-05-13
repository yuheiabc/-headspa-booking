'use client';

import type { TimeSlot } from '@/types';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedTime: string | null;
  onSelect: (time: string) => void;
  loading: boolean;
  primaryColor: string;
}

export default function TimeSlotPicker({
  slots,
  selectedTime,
  onSelect,
  loading,
  primaryColor,
}: TimeSlotPickerProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-current rounded-full" style={{ borderTopColor: primaryColor }} />
        <span className="ml-3 text-sm text-gray-500">空き枠を確認中...</span>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        この日の空き枠はありません
      </div>
    );
  }

  const availableSlots = slots.filter((s) => s.available);
  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        この日は満席です
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {slots.map((slot) => {
        const isSelected = selectedTime === slot.time;
        return (
          <button
            key={slot.time}
            disabled={!slot.available}
            onClick={() => slot.available && onSelect(slot.time)}
            className={`py-3 px-2 rounded-lg text-sm font-medium transition-all ${
              isSelected
                ? 'text-white shadow-md'
                : slot.available
                ? 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
            }`}
            style={isSelected ? { backgroundColor: primaryColor } : undefined}
          >
            {slot.time}
          </button>
        );
      })}
    </div>
  );
}
