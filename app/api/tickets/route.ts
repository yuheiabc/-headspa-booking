import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbRun, dbBatch } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
const noCacheHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' };

const issueSchema = z.object({
  customer_id: z.string().min(1),
  customer_name: z.string().optional(),
  ticket_plan_id: z.string().optional(),
  plan_name: z.string().min(1, 'プラン名を入力してください'),
  service_name: z.string().optional(),
  total_count: z.number().int().min(1),
  expires_at: z.string().optional(),
  memo: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');
    const activeOnly = searchParams.get('active') === '1';

    let query = 'SELECT * FROM customer_tickets';
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (customerId) { conditions.push('customer_id = ?'); params.push(customerId); }
    if (activeOnly) { conditions.push('remaining_count > 0'); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY purchased_at DESC';

    const tickets = await dbAll(query, params);
    return NextResponse.json(tickets, { headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/tickets error:', err);
    return NextResponse.json({ error: '回数券の取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'リクエストデータの読み取りに失敗しました' }, { status: 400, headers: noCacheHeaders });
    }
    const result = issueSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.errors[0].message }, { status: 400, headers: noCacheHeaders });

    const now = new Date().toISOString();
    const batchResults = await dbBatch([
      {
        sql: `INSERT INTO customer_tickets (customer_id, customer_name, ticket_plan_id, plan_name, service_name, total_count, used_count, remaining_count, purchased_at, expires_at, memo)
              VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        args: [
          result.data.customer_id,
          result.data.customer_name || '',
          result.data.ticket_plan_id || '',
          result.data.plan_name,
          result.data.service_name || '',
          result.data.total_count,
          result.data.total_count,
          now,
          result.data.expires_at || '',
          result.data.memo || '',
        ],
      },
      { sql: 'SELECT * FROM customer_tickets ORDER BY id DESC LIMIT 1', args: [] },
    ]);

    return NextResponse.json(batchResults[1].rows[0], { status: 201, headers: noCacheHeaders });
  } catch (err) {
    console.error('POST /api/tickets error:', err);
    return NextResponse.json({ error: '回数券の発行に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
