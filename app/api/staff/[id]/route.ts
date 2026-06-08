import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun, dbBatch } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
};

const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().optional(),
  color: z.string().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const staff = await dbGet<Record<string, unknown>>('SELECT * FROM staff WHERE id = ?', [id]);
    if (!staff) {
      return NextResponse.json({ error: 'スタッフが見つかりません' }, { status: 404, headers: noCacheHeaders });
    }
    return NextResponse.json({ ...staff, is_active: Boolean(staff.is_active) }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/staff/[id] error:', err);
    return NextResponse.json({ error: 'スタッフの取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const existing = await dbGet('SELECT * FROM staff WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'スタッフが見つかりません' }, { status: 404, headers: noCacheHeaders });
    }

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'リクエストデータの読み取りに失敗しました' }, { status: 400, headers: noCacheHeaders });
    }

    const result = updateStaffSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400, headers: noCacheHeaders });
    }

    const updates: Record<string, unknown> = {};
    if (result.data.name !== undefined) updates.name = result.data.name;
    if (result.data.role !== undefined) updates.role = result.data.role;
    if (result.data.color !== undefined) updates.color = result.data.color;
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

    const batchResults = await dbBatch([
      { sql: `UPDATE staff SET ${setClause}, updated_at = ? WHERE id = ?`, args: values },
      { sql: 'SELECT * FROM staff WHERE id = ?', args: [id] },
    ]);

    const updated = batchResults[1].rows[0] as Record<string, unknown>;
    return NextResponse.json({ ...updated, is_active: Boolean(updated.is_active) }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('PUT /api/staff/[id] error:', err);
    return NextResponse.json({ error: 'スタッフの更新に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const staff = await dbGet('SELECT * FROM staff WHERE id = ?', [id]);
    if (!staff) {
      return NextResponse.json({ error: 'スタッフが見つかりません' }, { status: 404, headers: noCacheHeaders });
    }

    // Check if staff has future bookings
    const today = new Date().toISOString().split('T')[0];
    const bookingCount = await dbGet<{ count: number }>(
      "SELECT COUNT(*) as count FROM bookings WHERE staff_id = ? AND date >= ? AND status = 'confirmed'",
      [id, today]
    );

    if ((bookingCount?.count ?? 0) > 0) {
      const now = new Date().toISOString();
      await dbRun('UPDATE staff SET is_active = 0, updated_at = ? WHERE id = ?', [now, id]);
      return NextResponse.json({ message: '既存の予約があるため、非アクティブにしました', deactivated: true }, { headers: noCacheHeaders });
    }

    await dbRun('DELETE FROM staff WHERE id = ?', [id]);
    return NextResponse.json({ success: true }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('DELETE /api/staff/[id] error:', err);
    return NextResponse.json({ error: 'スタッフの削除に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
