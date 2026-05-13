import { getDB } from './db';
import type { SalonSettings, Service, BusinessHours, SpecialHoliday, BookingRules } from '@/types';

export function getSalonSettings(): SalonSettings {
  const db = getDB();
  const row = db.prepare('SELECT * FROM salon_settings WHERE id = 1').get() as SalonSettings;
  return row;
}

export function getActiveServices(): Service[] {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM services WHERE is_active = 1 ORDER BY sort_order ASC').all() as Array<Record<string, unknown>>;
  return rows.map(mapService);
}

export function getAllServices(): Service[] {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM services ORDER BY sort_order ASC').all() as Array<Record<string, unknown>>;
  return rows.map(mapService);
}

export function getBusinessHours(): BusinessHours[] {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM business_hours ORDER BY day_of_week ASC').all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    ...r,
    is_open: Boolean(r.is_open),
  })) as BusinessHours[];
}

export function getSpecialHolidays(): SpecialHoliday[] {
  const db = getDB();
  return db.prepare('SELECT * FROM special_holidays ORDER BY date ASC').all() as SpecialHoliday[];
}

export function getBookingRules(): BookingRules {
  const db = getDB();
  const row = db.prepare('SELECT * FROM booking_rules WHERE id = 1').get() as Record<string, unknown>;
  return {
    ...row,
    booking_open: Boolean(row.booking_open),
  } as BookingRules;
}

export function isBusinessDay(
  date: Date,
  businessHours: BusinessHours[],
  specialHolidays: SpecialHoliday[]
): boolean {
  const dateStr = formatDateStr(date);
  if (specialHolidays.some((h) => h.date === dateStr)) {
    return false;
  }
  const dayOfWeek = date.getDay();
  const bh = businessHours.find((h) => h.day_of_week === dayOfWeek);
  return bh ? bh.is_open : false;
}

export function generateTimeSlots(
  date: Date,
  businessHours: BusinessHours[],
  bookingRules: BookingRules
): string[] {
  const dayOfWeek = date.getDay();
  const bh = businessHours.find((h) => h.day_of_week === dayOfWeek);
  if (!bh || !bh.is_open) return [];

  const [openH, openM] = bh.open_time.split(':').map(Number);
  const [closeH, closeM] = bh.close_time.split(':').map(Number);
  const interval = bookingRules.slot_interval;

  const slots: string[] = [];
  let currentMinutes = openH * 60 + openM;
  const endMinutes = closeH * 60 + closeM;

  while (currentMinutes < endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    currentMinutes += interval;
  }

  return slots;
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mapService(r: Record<string, unknown>): Service {
  return {
    ...r,
    is_active: Boolean(r.is_active),
  } as Service;
}
