'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import DatePicker from '@/components/booking/DatePicker';
import TimeSlotPicker from '@/components/booking/TimeSlotPicker';
import BookingForm from '@/components/booking/BookingForm';
import type { BusinessHours, SpecialHoliday, BookingRules, TimeSlot, SalonSettings } from '@/types';

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#C9A96E] rounded-full" />
      </div>
    }>
      <BookingPageInner />
    </Suspense>
  );
}

function BookingPageInner() {
  const searchParams = useSearchParams();
  const serviceId = searchParams.get('service_id') || '';
  const serviceName = searchParams.get('service_name') || '';
  const duration = Number(searchParams.get('duration') || 60);
  const price = Number(searchParams.get('price') || 0);

  const [salon, setSalon] = useState<SalonSettings | null>(null);
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [specialHolidays, setSpecialHolidays] = useState<SpecialHoliday[]>([]);
  const [bookingRules, setBookingRules] = useState<BookingRules | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/salon', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/settings/schedule', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/settings/booking-rules', { cache: 'no-store' }).then((r) => r.json()),
    ]).then(([salonData, scheduleData, rulesData]) => {
      setSalon(salonData);
      setBusinessHours(scheduleData.businessHours);
      setSpecialHolidays(scheduleData.specialHolidays);
      setBookingRules(rulesData);
    });
  }, []);

  const fetchSlots = useCallback(async (date: Date) => {
    setLoadingSlots(true);
    setSelectedTime(null);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const res = await fetch(`/api/available-slots?date=${dateStr}&service_id=${serviceId}`, { cache: 'no-store' });
      const data = await res.json();
      setTimeSlots(data.slots || []);
    } catch {
      setTimeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [serviceId]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    fetchSlots(date);
  };

  const primaryColor = salon?.primary_color || '#C9A96E';

  if (!salon || !bookingRules) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#C9A96E] rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="py-4 px-4 border-b border-gray-100 bg-white">
        <div className="max-w-lg mx-auto flex items-center">
          <a
            href="/"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mr-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            戻る
          </a>
          <a href="/" className="text-xl font-bold" style={{ color: primaryColor }}>
            {salon.logo_text}
          </a>
          <div className="ml-auto w-12" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-6 p-4 rounded-xl border border-gray-100 bg-white animate-fadeIn">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-900">{serviceName}</h3>
              <p className="text-sm text-gray-500">{duration}分</p>
            </div>
            <span className="text-lg font-bold" style={{ color: primaryColor }}>
              ¥{price.toLocaleString()}
            </span>
          </div>
        </div>

        {!selectedTime ? (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">日付を選択</h2>
              <DatePicker
                selectedDate={selectedDate}
                onSelect={handleDateSelect}
                maxAdvanceDays={bookingRules.max_advance_days}
                businessHours={businessHours}
                specialHolidays={specialHolidays}
                primaryColor={primaryColor}
              />
            </div>

            {selectedDate && (
              <div className="animate-fadeInUp">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  時間を選択
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    {format(selectedDate, 'M月d日')}
                  </span>
                </h2>
                <TimeSlotPicker
                  slots={timeSlots}
                  selectedTime={selectedTime}
                  onSelect={setSelectedTime}
                  loading={loadingSlots}
                  primaryColor={primaryColor}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="animate-slideInRight">
            <button
              onClick={() => setSelectedTime(null)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              日時選択に戻る
            </button>
            <BookingForm
              serviceId={serviceId}
              serviceName={serviceName}
              date={format(selectedDate!, 'yyyy-MM-dd')}
              time={selectedTime}
              duration={duration}
              price={price}
              primaryColor={primaryColor}
            />
          </div>
        )}
      </main>
    </div>
  );
}
