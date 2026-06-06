import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun, dbBatch } from '@/lib/db';

export const dynamic = 'force-dynamic';
const noCacheHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' };

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'リクエストデータの読み取りに失敗しました' }, { status: 400, headers: noCacheHeaders });
    }
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const key of ['name', 'service_id', 'service_name', 'total_count', 'price']) {
      if (body[key] !== undefined) { fields.push(`${key} = ?`); values.push(body[key]); }
    }
    if (body.is_active !== undefined) { fields.push('is_active = ?'); values.push(body.is_active ? 1 : 0); }
    if (fields.length === 0) return NextResponse.json({ error: '更新するフィールドがありません' }, { status: 400, headers: noCacheHeaders });
    values.push(now, id);
    const batchResults = await dbBatch([
      { sql: `UPDATE ticket_plans SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`, args: values },
      { sql: 'SELECT * FROM ticket_plans WHERE id = ?', args: [id] },
    ]);
    const plan = batchResults[1].rows[0] as Record<string, unknown>;
    return NextResponse.json({ ...plan, is_active: Boolean(plan.is_active) }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('PUT /api/tickets/plans/[id] error:', err);
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    await dbRun('DELETE FROM ticket_plans WHERE id = ?', [id]);
    return NextResponse.json({ success: true }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('DELETE /api/tickets/plans/[id] error:', err);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
