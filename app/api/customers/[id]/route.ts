import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbAll, dbBatch } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
};

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  gender: z.string().optional(),
  birthday: z.string().optional(),
  memo: z.string().optional(),
  referral_source: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const customer = await dbGet('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return NextResponse.json({ error: '顧客が見つかりません' }, { status: 404, headers: noCacheHeaders });
    }

    // Get booking history
    const bookings = await dbAll(
      'SELECT * FROM bookings WHERE customer_id = ? ORDER BY date DESC, time DESC',
      [id]
    );

    // Get notes
    const notes = await dbAll(
      'SELECT * FROM customer_notes WHERE customer_id = ? ORDER BY date DESC',
      [id]
    );

    return NextResponse.json({ customer, bookings, notes }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/customers/[id] error:', err);
    return NextResponse.json({ error: '顧客情報の取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const existing = await dbGet('SELECT * FROM customers WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ error: '顧客が見つかりません' }, { status: 404, headers: noCacheHeaders });
    }

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'リクエストデータの読み取りに失敗しました' }, { status: 400, headers: noCacheHeaders });
    }

    const result = updateCustomerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400, headers: noCacheHeaders });
    }

    const updates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(result.data)) {
      if (val !== undefined) updates[key] = val;
    }

    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return NextResponse.json({ error: '更新するフィールドがありません' }, { status: 400, headers: noCacheHeaders });
    }

    const now = new Date().toISOString();
    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    const values: unknown[] = fields.map((f) => updates[f]);
    values.push(now, id);

    const batchResults = await dbBatch([
      { sql: `UPDATE customers SET ${setClause}, updated_at = ? WHERE id = ?`, args: values },
      { sql: 'SELECT * FROM customers WHERE id = ?', args: [id] },
    ]);

    return NextResponse.json(batchResults[1].rows[0], { headers: noCacheHeaders });
  } catch (err) {
    console.error('PUT /api/customers/[id] error:', err);
    return NextResponse.json({ error: '顧客情報の更新に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
