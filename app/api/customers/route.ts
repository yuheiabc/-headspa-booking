import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbBatch } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
};

const customerSchema = z.object({
  name: z.string().min(1, 'お名前を入力してください'),
  phone: z.string().min(1, '電話番号を入力してください'),
  email: z.string().optional(),
  gender: z.string().optional(),
  birthday: z.string().optional(),
  memo: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM customers';
    let countQuery = 'SELECT COUNT(*) as count FROM customers';
    const params: unknown[] = [];
    const countParams: unknown[] = [];

    if (search) {
      const condition = ' WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?';
      const searchParam = `%${search}%`;
      query += condition;
      countQuery += condition;
      params.push(searchParam, searchParam, searchParam);
      countParams.push(searchParam, searchParam, searchParam);
    }

    query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [customers, countResult] = await Promise.all([
      dbAll(query, params),
      dbGet<{ count: number }>(countQuery, countParams),
    ]);

    return NextResponse.json({
      customers,
      total: countResult?.count || 0,
      page,
      limit,
    }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/customers error:', err);
    return NextResponse.json({ error: '顧客の取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'リクエストデータの読み取りに失敗しました' }, { status: 400, headers: noCacheHeaders });
    }

    const result = customerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400, headers: noCacheHeaders });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const batchResults = await dbBatch([
      {
        sql: `INSERT INTO customers (id, name, phone, email, gender, birthday, memo, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, result.data.name, result.data.phone, result.data.email || '', result.data.gender || '', result.data.birthday || '', result.data.memo || '', now, now],
      },
      { sql: 'SELECT * FROM customers WHERE id = ?', args: [id] },
    ]);

    return NextResponse.json(batchResults[1].rows[0], { status: 201, headers: noCacheHeaders });
  } catch (err) {
    console.error('POST /api/customers error:', err);
    return NextResponse.json({ error: '顧客の作成に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
