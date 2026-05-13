import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { z } from 'zod';

const bookingRulesSchema = z.object({
  slot_interval: z.number().int().min(15).max(120).optional(),
  max_bookings_per_slot: z.number().int().min(1).max(10).optional(),
  min_advance_hours: z.number().int().min(0).max(72).optional(),
  max_advance_days: z.number().int().min(1).max(365).optional(),
  cancellation_hours: z.number().int().min(0).max(168).optional(),
  booking_open: z.boolean().optional(),
  booking_closed_message: z.string().optional(),
});

export async function GET() {
  try {
    const db = getDB();
    const rules = db.prepare('SELECT * FROM booking_rules WHERE id = 1').get() as Record<string, unknown>;
    return NextResponse.json({ ...rules, booking_open: Boolean(rules.booking_open) });
  } catch {
    return NextResponse.json({ error: '予約ルールの取得に失敗しました' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const result = bookingRulesSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const db = getDB();
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
      return NextResponse.json({ error: '更新するフィールドがありません' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    const values = fields.map((f) => updates[f]);

    db.prepare(`UPDATE booking_rules SET ${setClause}, updated_at = ? WHERE id = 1`)
      .run(...values, now);

    const updated = db.prepare('SELECT * FROM booking_rules WHERE id = 1').get() as Record<string, unknown>;
    return NextResponse.json({ ...updated, booking_open: Boolean(updated.booking_open) });
  } catch {
    return NextResponse.json({ error: '予約ルールの更新に失敗しました' }, { status: 500 });
  }
}
