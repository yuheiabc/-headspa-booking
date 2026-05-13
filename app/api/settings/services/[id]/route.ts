import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { z } from 'zod';

const updateServiceSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  duration: z.number().int().min(15).max(480).optional(),
  price: z.number().int().min(0).optional(),
  description: z.string().max(50).optional(),
  detail: z.string().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDB();
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(params.id) as Record<string, unknown> | undefined;
    if (!service) {
      return NextResponse.json({ error: 'メニューが見つかりません' }, { status: 404 });
    }
    return NextResponse.json({ ...service, is_active: Boolean(service.is_active) });
  } catch {
    return NextResponse.json({ error: 'メニューの取得に失敗しました' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDB();
    const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'メニューが見つかりません' }, { status: 404 });
    }

    const body = await request.json();
    const result = updateServiceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (result.data.name !== undefined) updates.name = result.data.name;
    if (result.data.duration !== undefined) updates.duration = result.data.duration;
    if (result.data.price !== undefined) updates.price = result.data.price;
    if (result.data.description !== undefined) updates.description = result.data.description;
    if (result.data.detail !== undefined) updates.detail = result.data.detail;
    if (result.data.is_active !== undefined) updates.is_active = result.data.is_active ? 1 : 0;
    if (result.data.sort_order !== undefined) updates.sort_order = result.data.sort_order;

    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return NextResponse.json({ error: '更新するフィールドがありません' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    const values = fields.map((f) => updates[f]);

    db.prepare(`UPDATE services SET ${setClause}, updated_at = ? WHERE id = ?`)
      .run(...values, now, params.id);

    const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(params.id) as Record<string, unknown>;
    return NextResponse.json({ ...updated, is_active: Boolean(updated.is_active) });
  } catch {
    return NextResponse.json({ error: 'メニューの更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDB();
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(params.id);
    if (!service) {
      return NextResponse.json({ error: 'メニューが見つかりません' }, { status: 404 });
    }

    const bookingCount = db.prepare(
      "SELECT COUNT(*) as count FROM bookings WHERE service_id = ? AND status = 'confirmed'"
    ).get(params.id) as { count: number };

    if (bookingCount.count > 0) {
      const now = new Date().toISOString();
      db.prepare('UPDATE services SET is_active = 0, updated_at = ? WHERE id = ?').run(now, params.id);
      return NextResponse.json({ message: '既存の予約があるため、非公開にしました', deactivated: true });
    }

    db.prepare('DELETE FROM services WHERE id = ?').run(params.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'メニューの削除に失敗しました' }, { status: 500 });
  }
}
