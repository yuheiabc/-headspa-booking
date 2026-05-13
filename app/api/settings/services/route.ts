import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const serviceSchema = z.object({
  name: z.string().min(1, 'メニュー名を入力してください').max(50, 'メニュー名は50文字以内で入力してください'),
  duration: z.number().int().min(15, '所要時間は15分以上を指定してください').max(480, '所要時間は480分以内で指定してください'),
  price: z.number().int().min(0, '料金は0以上を指定してください'),
  description: z.string().max(50, '説明は50文字以内で入力してください').optional().default(''),
  detail: z.string().optional().default(''),
  is_active: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    const db = getDB();
    const services = db.prepare('SELECT * FROM services ORDER BY sort_order ASC').all();
    const mapped = (services as Array<Record<string, unknown>>).map((s) => ({
      ...s,
      is_active: Boolean(s.is_active),
    }));
    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json({ error: 'メニューの取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = serviceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const db = getDB();
    const id = uuidv4();
    const now = new Date().toISOString();

    const maxOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM services').get() as { max_order: number | null };
    const sortOrder = (maxOrder.max_order ?? 0) + 1;

    db.prepare(`
      INSERT INTO services (id, name, duration, price, description, detail, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      result.data.name,
      result.data.duration,
      result.data.price,
      result.data.description,
      result.data.detail,
      result.data.is_active ? 1 : 0,
      sortOrder,
      now,
      now
    );

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(id) as Record<string, unknown>;
    return NextResponse.json({ ...service, is_active: Boolean(service.is_active) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'メニューの追加に失敗しました' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.orders)) {
      return NextResponse.json({ error: '並び順データが不正です' }, { status: 400 });
    }

    const db = getDB();
    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE services SET sort_order = ?, updated_at = ? WHERE id = ?');

    const updateAll = db.transaction((orders: Array<{ id: string; sort_order: number }>) => {
      for (const order of orders) {
        stmt.run(order.sort_order, now, order.id);
      }
    });

    updateAll(body.orders);

    const services = db.prepare('SELECT * FROM services ORDER BY sort_order ASC').all();
    const mapped = (services as Array<Record<string, unknown>>).map((s) => ({
      ...s,
      is_active: Boolean(s.is_active),
    }));
    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json({ error: '並び順の更新に失敗しました' }, { status: 500 });
  }
}
