import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbBatch } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
const noCacheHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' };

const incomeSchema = z.object({
  date: z.string().min(1, '日付を入力してください'),
  category: z.string().min(1, 'カテゴリを選択してください'),
  description: z.string().optional(),
  amount: z.number().int().min(1, '金額を入力してください'),
  staff_id: z.string().optional(),
  staff_name: z.string().optional(),
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  memo: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const category = searchParams.get('category');

    let query = 'SELECT * FROM other_income';
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (startDate) { conditions.push('date >= ?'); params.push(startDate); }
    if (endDate) { conditions.push('date <= ?'); params.push(endDate); }
    if (category) { conditions.push('category = ?'); params.push(category); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY date DESC, id DESC';

    const items = await dbAll(query, params);
    return NextResponse.json(items, { headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/other-income error:', err);
    return NextResponse.json({ error: 'その他収入の取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'リクエストデータの読み取りに失敗しました' }, { status: 400, headers: noCacheHeaders });
    }
    const result = incomeSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.errors[0].message }, { status: 400, headers: noCacheHeaders });

    const now = new Date().toISOString();
    const batchResults = await dbBatch([
      {
        sql: `INSERT INTO other_income (date, category, description, amount, staff_id, staff_name, customer_id, customer_name, memo, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          result.data.date,
          result.data.category,
          result.data.description || '',
          result.data.amount,
          result.data.staff_id || '',
          result.data.staff_name || '',
          result.data.customer_id || '',
          result.data.customer_name || '',
          result.data.memo || '',
          now,
          now,
        ],
      },
      { sql: 'SELECT * FROM other_income ORDER BY id DESC LIMIT 1', args: [] },
    ]);

    return NextResponse.json(batchResults[1].rows[0], { status: 201, headers: noCacheHeaders });
  } catch (err) {
    console.error('POST /api/other-income error:', err);
    return NextResponse.json({ error: 'その他収入の登録に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
