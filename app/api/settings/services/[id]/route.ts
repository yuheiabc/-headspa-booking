import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateServiceSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  duration: z.number().int().min(15).max(480).optional(),
  price: z.number().int().min(0).optional(),
  description: z.string().max(50).optional(),
  detail: z.string().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const service = await dbGet<Record<string, unknown>>('SELECT * FROM services WHERE id = ?', [id]);
    if (!service) {
      return NextResponse.json({ error: 'メニューが見つかりません' }, { status: 404, headers: noCacheHeaders });
    }
    return NextResponse.json({ ...service, is_active: Boolean(service.is_active) }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/settings/services/[id] error:', err);
    return NextResponse.json({ error: 'メニューの取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const existing = await dbGet('SELECT * FROM services WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'メニューが見つかりません' }, { status: 404, headers: noCacheHeaders });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'リクエストデータの読み取りに失敗しました' }, { status: 400, headers: noCacheHeaders });
    }

    const result = updateServiceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400, headers: noCacheHeaders });
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
      return NextResponse.json({ error: '更新するフィールドがありません' }, { status: 400, headers: noCacheHeaders });
    }

    const now = new Date().toISOString();
    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    const values: unknown[] = fields.map((f) => updates[f]);
    values.push(now, id);

    await dbRun(`UPDATE services SET ${setClause}, updated_at = ? WHERE id = ?`, values);

    const updated = await dbGet<Record<string, unknown>>('SELECT * FROM services WHERE id = ?', [id]);
    return NextResponse.json({ ...updated, is_active: Boolean(updated!.is_active) }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('PUT /api/settings/services/[id] error:', err);
    return NextResponse.json({ error: 'メニューの更新に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const service = await dbGet('SELECT * FROM services WHERE id = ?', [id]);
    if (!service) {
      return NextResponse.json({ error: 'メニューが見つかりません' }, { status: 404, headers: noCacheHeaders });
    }

    const bookingCount = await dbGet<{ count: number }>(
      "SELECT COUNT(*) as count FROM bookings WHERE service_id = ? AND status = 'confirmed'",
      [id]
    );

    if ((bookingCount?.count ?? 0) > 0) {
      const now = new Date().toISOString();
      await dbRun('UPDATE services SET is_active = 0, updated_at = ? WHERE id = ?', [now, id]);
      return NextResponse.json({ message: '既存の予約があるため、非公開にしました', deactivated: true }, { headers: noCacheHeaders });
    }

    await dbRun('DELETE FROM services WHERE id = ?', [id]);
    return NextResponse.json({ success: true }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('DELETE /api/settings/services/[id] error:', err);
    return NextResponse.json({ error: 'メニューの削除に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
