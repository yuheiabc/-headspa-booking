import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbRun, dbBatch } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const businessHoursSchema = z.array(
  z.object({
    day_of_week: z.number().int().min(0).max(6),
    is_open: z.boolean(),
    open_time: z.string().regex(/^\d{2}:\d{2}$/),
    close_time: z.string().regex(/^\d{2}:\d{2}$/),
  })
);

const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません'),
  reason: z.string().min(1, '理由を入力してください').default('臨時休業'),
});

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
};

export async function GET() {
  try {
    const businessHours = await dbAll('SELECT * FROM business_hours ORDER BY day_of_week ASC');
    const specialHolidays = await dbAll('SELECT * FROM special_holidays ORDER BY date ASC');

    const mappedHours = (businessHours as Array<Record<string, unknown>>).map((h) => ({
      ...h,
      is_open: Boolean(h.is_open),
    }));

    return NextResponse.json({ businessHours: mappedHours, specialHolidays }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/settings/schedule error:', err);
    return NextResponse.json({ error: '営業時間の取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
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

    const result = businessHoursSchema.safeParse(body.businessHours);

    if (!result.success) {
      return NextResponse.json({ error: '営業時間データが不正です' }, { status: 400, headers: noCacheHeaders });
    }

    const now = new Date().toISOString();

    const statements = result.data.map((h) => ({
      sql: 'UPDATE business_hours SET is_open = ?, open_time = ?, close_time = ?, updated_at = ? WHERE day_of_week = ?',
      args: [h.is_open ? 1 : 0, h.open_time, h.close_time, now, h.day_of_week] as unknown[],
    }));
    statements.push({ sql: 'SELECT * FROM business_hours ORDER BY day_of_week ASC', args: [] });

    const batchResults = await dbBatch(statements);
    const selectResult = batchResults[batchResults.length - 1];
    const mapped = (selectResult.rows as Array<Record<string, unknown>>).map((h) => ({
      ...h,
      is_open: Boolean(h.is_open),
    }));

    return NextResponse.json({ businessHours: mapped }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('PUT /api/settings/schedule error:', err);
    return NextResponse.json({ error: '営業時間の更新に失敗しました' }, { status: 500, headers: noCacheHeaders });
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

    const result = holidaySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400, headers: noCacheHeaders });
    }

    try {
      await dbRun('INSERT INTO special_holidays (date, reason) VALUES (?, ?)', [
        result.data.date,
        result.data.reason
      ]);
    } catch {
      return NextResponse.json({ error: 'この日付は既に登録されています' }, { status: 400, headers: noCacheHeaders });
    }

    const holidays = await dbAll('SELECT * FROM special_holidays ORDER BY date ASC');
    return NextResponse.json({ specialHolidays: holidays }, { status: 201, headers: noCacheHeaders });
  } catch (err) {
    console.error('POST /api/settings/schedule error:', err);
    return NextResponse.json({ error: '休業日の追加に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'IDを指定してください' }, { status: 400, headers: noCacheHeaders });
    }

    await dbRun('DELETE FROM special_holidays WHERE id = ?', [Number(id)]);

    const holidays = await dbAll('SELECT * FROM special_holidays ORDER BY date ASC');
    return NextResponse.json({ specialHolidays: holidays }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('DELETE /api/settings/schedule error:', err);
    return NextResponse.json({ error: '休業日の削除に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
