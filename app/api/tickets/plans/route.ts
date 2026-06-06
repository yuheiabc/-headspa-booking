import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbBatch } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
const noCacheHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' };

const planSchema = z.object({
  name: z.string().min(1, 'プラン名を入力してください'),
  service_id: z.string().optional(),
  service_name: z.string().optional(),
  total_count: z.number().int().min(1).default(5),
  price: z.number().int().min(0).default(0),
});

export async function GET() {
  try {
    const plans = await dbAll('SELECT * FROM ticket_plans ORDER BY sort_order ASC, created_at ASC');
    const mapped = (plans as Record<string, unknown>[]).map(p => ({ ...p, is_active: Boolean(p.is_active) }));
    return NextResponse.json(mapped, { headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/tickets/plans error:', err);
    return NextResponse.json({ error: '回数券プランの取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'リクエストデータの読み取りに失敗しました' }, { status: 400, headers: noCacheHeaders });
    }
    const result = planSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.errors[0].message }, { status: 400, headers: noCacheHeaders });

    const id = uuidv4();
    const now = new Date().toISOString();
    const batchResults = await dbBatch([
      {
        sql: 'INSERT INTO ticket_plans (id, name, service_id, service_name, total_count, price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [id, result.data.name, result.data.service_id || '', result.data.service_name || '', result.data.total_count, result.data.price, now, now],
      },
      { sql: 'SELECT * FROM ticket_plans WHERE id = ?', args: [id] },
    ]);
    const plan = batchResults[1].rows[0] as Record<string, unknown>;
    return NextResponse.json({ ...plan, is_active: Boolean(plan.is_active) }, { status: 201, headers: noCacheHeaders });
  } catch (err) {
    console.error('POST /api/tickets/plans error:', err);
    return NextResponse.json({ error: '回数券プランの作成に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
