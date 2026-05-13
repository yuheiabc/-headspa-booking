import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { addEventToCalendar } from '@/lib/google-calendar';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const bookingSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  phone: z.string().min(1, '電話番号を入力してください'),
  email: z.string().email('正しいメールアドレスを入力してください').optional().or(z.literal('')),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません'),
  time: z.string().regex(/^\d{2}:\d{2}$/, '時間の形式が正しくありません'),
  service_id: z.string().min(1, 'メニューを選択してください'),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const db = getDB();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    let query = 'SELECT * FROM bookings';
    const conditions: string[] = [];
    const params: string[] = [];

    if (date) {
      conditions.push('date = ?');
      params.push(date);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY date ASC, time ASC';

    const bookings = db.prepare(query).all(...params);
    return NextResponse.json(bookings);
  } catch {
    return NextResponse.json({ error: '予約の取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = bookingSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map((e) => e.message);
      return NextResponse.json({ error: errors[0] }, { status: 400 });
    }

    const db = getDB();
    const service = db.prepare('SELECT * FROM services WHERE id = ? AND is_active = 1').get(result.data.service_id) as {
      id: string; name: string; duration: number; price: number;
    } | undefined;

    if (!service) {
      return NextResponse.json({ error: '選択されたメニューは現在利用できません' }, { status: 400 });
    }

    const rules = db.prepare('SELECT * FROM booking_rules WHERE id = 1').get() as { booking_open: number } | undefined;
    if (rules && !rules.booking_open) {
      return NextResponse.json({ error: '現在予約を受け付けておりません' }, { status: 400 });
    }

    const existingCount = db.prepare(
      'SELECT COUNT(*) as count FROM bookings WHERE date = ? AND time = ? AND status = ?'
    ).get(result.data.date, result.data.time, 'confirmed') as { count: number };

    const maxPerSlot = (rules as Record<string, number> | undefined)?.max_bookings_per_slot ?? 1;
    if (existingCount.count >= maxPerSlot) {
      return NextResponse.json({ error: 'この時間帯は満席です' }, { status: 400 });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    let googleEventId: string | null = null;
    try {
      googleEventId = await addEventToCalendar({
        name: result.data.name,
        phone: result.data.phone,
        serviceName: service.name,
        price: service.price,
        date: result.data.date,
        time: result.data.time,
        duration: service.duration,
        notes: result.data.notes,
      });
    } catch {
      // Google Calendar is optional
    }

    db.prepare(`
      INSERT INTO bookings (id, name, phone, email, date, time, service_id, service_name, duration, price, status, google_event_id, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?)
    `).run(
      id,
      result.data.name,
      result.data.phone,
      result.data.email || null,
      result.data.date,
      result.data.time,
      service.id,
      service.name,
      service.duration,
      service.price,
      googleEventId,
      result.data.notes || null,
      now,
      now
    );

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    return NextResponse.json(booking, { status: 201 });
  } catch {
    return NextResponse.json({ error: '予約の作成に失敗しました' }, { status: 500 });
  }
}
