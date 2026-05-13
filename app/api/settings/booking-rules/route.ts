import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const bookingRulesSchema = z.object({
  slot_interval: z.number().int().min(15).max(120).optional(),
  max_bookings_per_slot: z.number().int().min(1).max(10).optional(),
  min_advance_hours: z.number().int().min(0).max(72).optional(),
  max_advance_days: z.number().int().min(1).max(365).optional(),
  cancellation_hours: z.number().int().min(0).max(168).optional(),
  booking_open: z.boolean().optional(),
  booking_closed_message: z.string().optional(),
});

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
};

export async function GET() {
  try {
    const rules = await dbGet<Record<string, unknown>>('SELECT * FROM booking_rules WHERE id = 1');
    return NextResponse.json({ ...rules, booking_open: Boolean(rules!.booking_open) }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/settings/booking-rules error:', err);
    return NextResponse.json({ error: '予約ルールの取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function PUT(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'リクエストデータの読み取りに失敗しました' }, { status: 400, headers: noCacheHeaders });
    }

    const result = bookingRulesSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400, headers: noCacheHeaders });
    }

    const updates: Record<string, unknown> = {};

    if (result.data.slot_interval !== undefined) updates.slot_interval = result.data.slot_interval;
    if (result.data.max_bookings_per_slot !== undefined) updates.max_bookings_per_slot = result.data.max_bookings_per_slot;
    if (result.data.min_advance_hours !== undefined) updates.min_advance_hours = result.data.min_advance_hours;
    if (result.data.max_advance_days !== undefined) updates.max_advance_days = result.data.max_advance_days;
    if (result.data.cancellation_hours !== undefined) updates.cancellation_hours = result.data.cancellation_hours;
    if (result.data.booking_open !== undefined) updates.booking_open = result.data.booking_open ? 1 : 0;
    if (result.data.booking_closed_message !== undefined) updates.booking_closed_message = result.data.booking_closed_message;

    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return NextResponse.json({ error: '更新するフィールドがありません' }, { status: 400, headers: noCacheHeaders });
    }

    const now = new Date().toISOString();
    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    const values: unknown[] = fields.map((f) => updates[f]);
    values.push(now);

    await dbRun(`UPDATE booking_rules SET ${setClause}, updated_at = ? WHERE id = 1`, values);

    const updated = await dbGet<Record<string, unknown>>('SELECT * FROM booking_rules WHERE id = 1');
    return NextResponse.json({ ...updated, booking_open: Boolean(updated!.booking_open) }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('PUT /api/settings/booking-rules error:', err);
    return NextResponse.json({ error: '予約ルールの更新に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
