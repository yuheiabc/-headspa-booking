import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { z } from 'zod';

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

export async function GET() {
  try {
    const db = getDB();
    const businessHours = db.prepare('SELECT * FROM business_hours ORDER BY day_of_week ASC').all();
    const specialHolidays = db.prepare('SELECT * FROM special_holidays ORDER BY date ASC').all();

    const mappedHours = (businessHours as Array<Record<string, unknown>>).map((h) => ({
      ...h,
      is_open: Boolean(h.is_open),
    }));

    return NextResponse.json({ businessHours: mappedHours, specialHolidays });
  } catch {
    return NextResponse.json({ error: '営業時間の取得に失敗しました' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const result = businessHoursSchema.safeParse(body.businessHours);

    if (!result.success) {
      return NextResponse.json({ error: '営業時間データが不正です' }, { status: 400 });
    }

    const db = getDB();
    const now = new Date().toISOString();

    const updateStmt = db.prepare(
      'UPDATE business_hours SET is_open = ?, open_time = ?, close_time = ?, updated_at = ? WHERE day_of_week = ?'
    );

    const updateAll = db.transaction((hours: typeof result.data) => {
      for (const h of hours) {
        updateStmt.run(h.is_open ? 1 : 0, h.open_time, h.close_time, now, h.day_of_week);
      }
    });

    updateAll(result.data);

    const updated = db.prepare('SELECT * FROM business_hours ORDER BY day_of_week ASC').all();
    const mapped = (updated as Array<Record<string, unknown>>).map((h) => ({
      ...h,
      is_open: Boolean(h.is_open),
    }));

    return NextResponse.json({ businessHours: mapped });
  } catch {
    return NextResponse.json({ error: '営業時間の更新に失敗しました' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = holidaySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const db = getDB();
    try {
      db.prepare('INSERT INTO special_holidays (date, reason) VALUES (?, ?)').run(
        result.data.date,
        result.data.reason
      );
    } catch {
      return NextResponse.json({ error: 'この日付は既に登録されています' }, { status: 400 });
    }

    const holidays = db.prepare('SELECT * FROM special_holidays ORDER BY date ASC').all();
    return NextResponse.json({ specialHolidays: holidays }, { status: 201 });
  } catch {
    return NextResponse.json({ error: '休業日の追加に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'IDを指定してください' }, { status: 400 });
    }

    const db = getDB();
    db.prepare('DELETE FROM special_holidays WHERE id = ?').run(Number(id));

    const holidays = db.prepare('SELECT * FROM special_holidays ORDER BY date ASC').all();
    return NextResponse.json({ specialHolidays: holidays });
  } catch {
    return NextResponse.json({ error: '休業日の削除に失敗しました' }, { status: 500 });
  }
}
