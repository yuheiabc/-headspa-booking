import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbBatch } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
};

const staffSchema = z.object({
  name: z.string().min(1, 'スタッフ名を入力してください'),
  role: z.string().optional(),
  color: z.string().optional(),
  sort_order: z.number().int().optional(),
});

export async function GET() {
  try {
    const staff = await dbAll('SELECT * FROM staff ORDER BY sort_order ASC, created_at ASC');
    const mapped = (staff as Record<string, unknown>[]).map((s) => ({
      ...s,
      is_active: Boolean(s.is_active),
    }));
    return NextResponse.json(mapped, { headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/staff error:', err);
    return NextResponse.json({ error: 'スタッフの取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'リクエストデータの読み取りに失敗しました' }, { status: 400, headers: noCacheHeaders });
    }

    const result = staffSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400, headers: noCacheHeaders });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const batchResults = await dbBatch([
      {
        sql: 'INSERT INTO staff (id, name, role, color, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [id, result.data.name, result.data.role || '', result.data.color || '#C9A96E', result.data.sort_order || 0, now, now],
      },
      { sql: 'SELECT * FROM staff WHERE id = ?', args: [id] },
    ]);

    const staff = batchResults[1].rows[0] as Record<string, unknown>;
    return NextResponse.json({ ...staff, is_active: Boolean(staff.is_active) }, { status: 201, headers: noCacheHeaders });
  } catch (err) {
    console.error('POST /api/staff error:', err);
    return NextResponse.json({ error: 'スタッフの作成に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
