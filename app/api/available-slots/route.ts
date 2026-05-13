import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbAll } from '@/lib/db';
import { getBusinessHours, getSpecialHolidays, getBookingRules, isBusinessDay, generateTimeSlots } from '@/lib/settings';
import { getCalendarEvents } from '@/lib/google-calendar';
import type { TimeSlot } from '@/types';

export const dynamic = 'force-dynamic';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const serviceId = searchParams.get('service_id');

    if (!date) {
      return NextResponse.json({ error: '日付を指定してください' }, { status: 400, headers: noCacheHeaders });
    }

    const businessHours = await getBusinessHours();
    const specialHolidays = await getSpecialHolidays();
    const bookingRules = await getBookingRules();

    const targetDate = new Date(date + 'T00:00:00+09:00');

    if (!isBusinessDay(targetDate, businessHours, specialHolidays)) {
      return NextResponse.json({ slots: [], message: '定休日です' }, { headers: noCacheHeaders });
    }

    let serviceDuration = 60;
    if (serviceId) {
      const service = await dbGet<{ duration: number }>('SELECT duration FROM services WHERE id = ?', [serviceId]);
      if (service) serviceDuration = service.duration;
    }

    const allSlots = generateTimeSlots(targetDate, businessHours, bookingRules);

    const existingBookings = await dbAll<{ time: string; duration: number }>(
      "SELECT time, duration FROM bookings WHERE date = ? AND status = 'confirmed'",
      [date]
    );

    let calendarEvents: Array<{ start: string; end: string }> = [];
    try {
      calendarEvents = await getCalendarEvents(date);
    } catch {
      // Google Calendar is optional
    }

    const now = new Date();
    const minAdvanceMs = bookingRules.min_advance_hours * 60 * 60 * 1000;

    const timeSlots: TimeSlot[] = allSlots.map((time) => {
      const slotStart = new Date(`${date}T${time}:00+09:00`);
      const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);

      if (slotStart.getTime() - now.getTime() < minAdvanceMs) {
        return { time, available: false, remaining: 0 };
      }

      const bh = businessHours.find((h) => h.day_of_week === targetDate.getDay());
      if (bh) {
        const [closeH, closeM] = bh.close_time.split(':').map(Number);
        const closeMinutes = closeH * 60 + closeM;
        const endMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
        if (endMinutes > closeMinutes) {
          return { time, available: false, remaining: 0 };
        }
      }

      let bookingsInSlot = 0;
      for (const booking of existingBookings) {
        const bStart = new Date(`${date}T${booking.time}:00+09:00`);
        const bEnd = new Date(bStart.getTime() + booking.duration * 60000);
        if (slotStart < bEnd && slotEnd > bStart) {
          bookingsInSlot++;
        }
      }

      for (const event of calendarEvents) {
        const eStart = new Date(event.start);
        const eEnd = new Date(event.end);
        if (slotStart < eEnd && slotEnd > eStart) {
          bookingsInSlot++;
        }
      }

      const remaining = bookingRules.max_bookings_per_slot - bookingsInSlot;
      return {
        time,
        available: remaining > 0,
        remaining: Math.max(0, remaining),
      };
    });

    return NextResponse.json({ slots: timeSlots }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/available-slots error:', err);
    return NextResponse.json({ error: '空き枠の取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
