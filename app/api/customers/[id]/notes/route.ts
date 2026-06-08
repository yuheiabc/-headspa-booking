import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbBatch } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
};

const noteSchema = z.object({
  booking_id: z.string().optional(),
  staff_id: z.string().optional(),
  staff_name: z.string().optional(),
  date: z.string(),
  service_name: z.string().optional(),
  content: z.string().optional(),
  scalp_condition: z.string().optional(),
  treatment_detail: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const notes = await dbAll(
      'SELECT * FROM customer_notes WHERE customer_id = ? ORDER BY date DESC',
      [id]
    );
    return NextResponse.json(notes, { headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/customers/[id]/notes error:', err);
    return NextResponse.json({ error: 'カルテの取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const customer = await dbGet('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return NextResponse.json({ error: '顧客が見つかりません' }, { status: 404, headers: noCacheHeaders });
    }

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'リクエストデータの読み取りに失敗しました' }, { status: 400, headers: noCacheHeaders });
    }

    const result = noteSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400, headers: noCacheHeaders });
    }

    const now = new Date().toISOString();

    const batchResults = await dbBatch([
      {
        sql: `INSERT INTO customer_notes (customer_id, booking_id, staff_id, staff_name, date, service_name, content, scalp_condition, treatment_detail, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          result.data.booking_id || '',
          result.data.staff_id || '',
          result.data.staff_name || '',
          result.data.date,
          result.data.service_name || '',
          result.data.content || '',
          result.data.scalp_condition || '',
          result.data.treatment_detail || '',
          now,
          now,
        ],
      },
      {
        sql: `UPDATE customers SET visit_count = visit_count + 1, last_visit = ?, updated_at = ? WHERE id = ?`,
        args: [result.data.date, now, id],
      },
      { sql: 'SELECT * FROM customer_notes WHERE customer_id = ? ORDER BY id DESC LIMIT 1', args: [id] },
    ]);

    return NextResponse.json(batchResults[2].rows[0], { status: 201, headers: noCacheHeaders });
  } catch (err) {
    console.error('POST /api/customers/[id]/notes error:', err);
    return NextResponse.json({ error: 'カルテの保存に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
