import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbBatch, dbRun } from '@/lib/db';

export const dynamic = 'force-dynamic';
const noCacheHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' };

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const existing = await dbGet('SELECT * FROM other_income WHERE id = ?', [id]);
    if (!existing) return NextResponse.json({ error: '収入データが見つかりません' }, { status: 404, headers: noCacheHeaders });

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'リクエストデータの読み取りに失敗しました' }, { status: 400, headers: noCacheHeaders });
    }

    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const key of ['date', 'category', 'description', 'amount', 'staff_id', 'staff_name', 'customer_id', 'customer_name', 'memo']) {
      if (body[key] !== undefined) { fields.push(`${key} = ?`); values.push(body[key]); }
    }

    if (fields.length === 0) return NextResponse.json({ error: '更新するフィールドがありません' }, { status: 400, headers: noCacheHeaders });
    values.push(now, id);

    const batchResults = await dbBatch([
      { sql: `UPDATE other_income SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`, args: values },
      { sql: 'SELECT * FROM other_income WHERE id = ?', args: [id] },
    ]);

    return NextResponse.json(batchResults[1].rows[0], { headers: noCacheHeaders });
  } catch (err) {
    console.error('PUT /api/other-income/[id] error:', err);
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    await dbRun('DELETE FROM other_income WHERE id = ?', [id]);
    return NextResponse.json({ success: true }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('DELETE /api/other-income/[id] error:', err);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
