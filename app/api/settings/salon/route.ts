import { NextRequest, NextResponse } from 'next/server';
import { dbBatch } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

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

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
};

export async function GET() {
  try {
    // Use batch with 'write' mode to force reading from primary
    const batchResults = await dbBatch([
      { sql: 'SELECT * FROM salon_settings WHERE id = 1' },
    ]);
    const settings = batchResults[0].rows[0];
    return NextResponse.json(settings, { headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/settings/salon error:', err);
    return NextResponse.json({ error: 'サロン情報の取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
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

    const result = salonSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400, headers: noCacheHeaders });
    }

    const fields = Object.keys(result.data).filter((k) => result.data[k as keyof typeof result.data] !== undefined);
    if (fields.length === 0) {
      return NextResponse.json({ error: '更新するフィールドがありません' }, { status: 400, headers: noCacheHeaders });
    }

    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    const values: unknown[] = fields.map((f) => result.data[f as keyof typeof result.data]);
    const now = new Date().toISOString();
    values.push(now);

    const sql = `UPDATE salon_settings SET ${setClause}, updated_at = ? WHERE id = 1`;

    const batchResults = await dbBatch([
      { sql, args: values },
      { sql: 'SELECT * FROM salon_settings WHERE id = 1' },
    ]);

    const updated = batchResults[1].rows[0];
    return NextResponse.json(updated, { headers: noCacheHeaders });
  } catch (err) {
    console.error('PUT /api/settings/salon error:', err);
    return NextResponse.json({ error: 'サロン情報の更新に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
