import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { z } from 'zod';

const salonSchema = z.object({
  salon_name: z.string().min(1, 'サロン名を入力してください').optional(),
  salon_name_sub: z.string().optional(),
  catch_copy: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  line_url: z.string().optional(),
  instagram_url: z.string().optional(),
  hero_color: z.string().optional(),
  logo_text: z.string().optional(),
  primary_color: z.string().optional(),
});

export async function GET() {
  try {
    const db = getDB();
    const settings = db.prepare('SELECT * FROM salon_settings WHERE id = 1').get();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: 'サロン情報の取得に失敗しました' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const result = salonSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const db = getDB();
    const fields = Object.keys(result.data).filter((k) => result.data[k as keyof typeof result.data] !== undefined);
    if (fields.length === 0) {
      return NextResponse.json({ error: '更新するフィールドがありません' }, { status: 400 });
    }

    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    const values = fields.map((f) => result.data[f as keyof typeof result.data]);
    const now = new Date().toISOString();

    db.prepare(`UPDATE salon_settings SET ${setClause}, updated_at = ? WHERE id = 1`)
      .run(...values, now);

    const updated = db.prepare('SELECT * FROM salon_settings WHERE id = 1').get();
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'サロン情報の更新に失敗しました' }, { status: 500 });
  }
}
