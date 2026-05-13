import { dbGet, dbAll } from './db';
import type { SalonSettings, Service, BusinessHours, SpecialHoliday, BookingRules } from '@/types';

export async function getSalonSettings(): Promise<SalonSettings> {
  const row = await dbGet<SalonSettings>('SELECT * FROM salon_settings WHERE id = 1');
  return row!;
}

export async function getActiveServices(): Promise<Service[]> {
  const rows = await dbAll<Record<string, unknown>>('SELECT * FROM services WHERE is_active = 1 ORDER BY sort_order ASC');
  return rows.map(mapService);
}

export async function getAllServices(): Promise<Service[]> {
  const rows = await dbAll<Record<string, unknown>>('SELECT * FROM services ORDER BY sort_order ASC');
  return rows.map(mapService);
}

export async function getBusinessHours(): Promise<BusinessHours[]> {
  const rows = await dbAll<Record<string, unknown>>('SELECT * FROM business_hours ORDER BY day_of_week ASC');
  return rows.map((r) => ({
    ...r,
    is_open: Boolean(r.is_open),
  })) as BusinessHours[];
}

export async function getSpecialHolidays(): Promise<SpecialHoliday[]> {
  return dbAll<SpecialHoliday>('SELECT * FROM special_holidays ORDER BY date ASC');
}

export async function getBookingRules(): Promise<BookingRules> {
  const row = await dbGet<Record<string, unknown>>('SELECT * FROM booking_rules WHERE id = 1');
  return {
    ...row,
    booking_open: Boolean(row!.booking_open),
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
