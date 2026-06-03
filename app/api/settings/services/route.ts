import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun, dbBatch } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const serviceSchema = z.object({
  name: z.string().min(1, 'メニュー名を入力してください').max(50, 'メニュー名は50文字以内で入力してください'),
  duration: z.number().int().min(15, '所要時間は15分以上を指定してください').max(480, '所要時間は480分以内で指定してください'),
  price: z.number().int().min(0, '料金は0以上を指定してください'),
  description: z.string().max(50, '説明は50文字以内で入力してください').optional().default(''),
  detail: z.string().optional().default(''),
  image_url: z.string().optional().default(''),
  is_active: z.boolean().optional().default(true),
});

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
};

export async function GET() {
  try {
    const services = await dbAll('SELECT * FROM services ORDER BY sort_order ASC');
    const mapped = (services as Array<Record<string, unknown>>).map((s) => ({
      ...s,
      is_active: Boolean(s.is_active),
    }));
    return NextResponse.json(mapped, { headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/settings/services error:', err);
    return NextResponse.json({ error: 'メニューの取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'リクエストデータの読み取りに失敗しました' }, { status: 400, headers: noCacheHeaders });
    }

    const result = serviceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400, headers: noCacheHeaders });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const maxOrder = await dbGet<{ max_order: number | null }>('SELECT MAX(sort_order) as max_order FROM services');
    const sortOrder = (maxOrder?.max_order ?? 0) + 1;

    const batchResults = await dbBatch([
      {
        sql: `INSERT INTO services (id, name, duration, price, description, detail, image_url, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, result.data.name, result.data.duration, result.data.price, result.data.description, result.data.detail, result.data.image_url, result.data.is_active ? 1 : 0, sortOrder, now, now],
      },
      { sql: 'SELECT * FROM services WHERE id = ?', args: [id] },
    ]);

    const service = batchResults[1].rows[0] as Record<string, unknown>;
    return NextResponse.json({ ...service, is_active: Boolean(service.is_active) }, { status: 201, headers: noCacheHeaders });
  } catch (err) {
    console.error('POST /api/settings/services error:', err);
    return NextResponse.json({ error: 'メニューの追加に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function PUT(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'リクエストデータの読み取りに失敗しました' }, { status: 400, headers: noCacheHeaders });
    }

    if (!Array.isArray(body.orders)) {
      return NextResponse.json({ error: '並び順データが不正です' }, { status: 400, headers: noCacheHeaders });
    }

    const now = new Date().toISOString();

    const statements = (body.orders as Array<{ id: string; sort_order: number }>).map((order) => ({
      sql: 'UPDATE services SET sort_order = ?, updated_at = ? WHERE id = ?',
      args: [order.sort_order, now, order.id] as unknown[],
    }));
    statements.push({ sql: 'SELECT * FROM services ORDER BY sort_order ASC', args: [] });

    const batchResults = await dbBatch(statements);
    const selectResult = batchResults[batchResults.length - 1];
    const mapped = (selectResult.rows as Array<Record<string, unknown>>).map((s) => ({
      ...s,
      is_active: Boolean(s.is_active),
    }));
    return NextResponse.json(mapped, { headers: noCacheHeaders });
  } catch (err) {
    console.error('PUT /api/settings/services error:', err);
    return NextResponse.json({ error: '並び順の更新に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
