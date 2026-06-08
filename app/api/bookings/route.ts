import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun, dbBatch } from '@/lib/db';
import { addEventToCalendar } from '@/lib/google-calendar';
import { sendBookingConfirmationEmail } from '@/lib/email';
import { sendLineBookingNotification } from '@/lib/line-notify';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
};

const bookingSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  phone: z.string().min(1, '電話番号を入力してください'),
  email: z.string().email('正しいメールアドレスを入力してください').optional().or(z.literal('')),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません'),
  time: z.string().regex(/^\d{2}:\d{2}$/, '時間の形式が正しくありません'),
  service_id: z.string().min(1, 'メニューを選択してください'),
  staff_id: z.string().optional(),
  notes: z.string().optional(),
  referral_source: z.string().optional(),
  admin_mode: z.boolean().optional(),
});

// 管理画面からの予約作成用（名前以外は任意）
const adminBookingSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  date: z.string().optional().default(''),
  time: z.string().optional().default(''),
  service_id: z.string().optional().default(''),
  service_name_custom: z.string().optional(),
  custom_price: z.number().optional(),
  custom_duration: z.number().optional(),
  staff_id: z.string().optional(),
  notes: z.string().optional(),
  referral_source: z.string().optional(),
  admin_mode: z.literal(true),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    let query = 'SELECT * FROM bookings';
    const conditions: string[] = [];
    const params: unknown[] = [];

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

    const bookings = await dbAll(query, params);
    return NextResponse.json(bookings, { headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/bookings error:', err);
    return NextResponse.json({ error: '予約の取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
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

    const isAdmin = body.admin_mode === true;
    const result = isAdmin
      ? adminBookingSchema.safeParse(body)
      : bookingSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map((e) => e.message);
      return NextResponse.json({ error: errors[0] }, { status: 400, headers: noCacheHeaders });
    }

    // メニュー取得（管理画面からは任意）
    let service: { id: string; name: string; duration: number; price: number } | undefined;
    if (result.data.service_id) {
      service = await dbGet<{
        id: string; name: string; duration: number; price: number;
      }>('SELECT * FROM services WHERE id = ? AND is_active = 1', [result.data.service_id]) ?? undefined;

      if (!isAdmin && !service) {
        return NextResponse.json({ error: '選択されたメニューは現在利用できません' }, { status: 400, headers: noCacheHeaders });
      }
    }

    // 顧客向けのバリデーション（管理画面からはスキップ）
    if (!isAdmin) {
      const rules = await dbGet<{ booking_open: number }>('SELECT * FROM booking_rules WHERE id = 1');
      if (rules && !rules.booking_open) {
        return NextResponse.json({ error: '現在予約を受け付けておりません' }, { status: 400, headers: noCacheHeaders });
      }

      const existingCount = await dbGet<{ count: number }>(
        "SELECT COUNT(*) as count FROM bookings WHERE date = ? AND time = ? AND status = 'confirmed'",
        [result.data.date, result.data.time]
      );
      const maxPerSlot = (rules as Record<string, number> | undefined)?.max_bookings_per_slot ?? 1;
      if ((existingCount?.count ?? 0) >= maxPerSlot) {
        return NextResponse.json({ error: 'この時間帯は満席です' }, { status: 400, headers: noCacheHeaders });
      }
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    // スタッフ情報の取得
    let staffName = '';
    if (result.data.staff_id) {
      const staff = await dbGet<{ name: string }>('SELECT name FROM staff WHERE id = ? AND is_active = 1', [result.data.staff_id]);
      if (staff) staffName = staff.name;
    }

    // 顧客の自動マッチング（電話番号がある場合のみ）
    let customerId = '';
    if (result.data.phone) {
      const existingCustomer = await dbGet<{ id: string }>(
        'SELECT id FROM customers WHERE phone = ?',
        [result.data.phone]
      );
      if (existingCustomer) {
        customerId = existingCustomer.id;
        await dbRun(
          'UPDATE customers SET name = ?, email = CASE WHEN ? != \'\' THEN ? ELSE email END, referral_source = CASE WHEN referral_source = \'\' AND ? != \'\' THEN ? ELSE referral_source END, visit_count = visit_count + 1, last_visit = ?, updated_at = ? WHERE id = ?',
          [result.data.name, result.data.email || '', result.data.email || '', result.data.referral_source || '', result.data.referral_source || '', result.data.date || '', now, customerId]
        );
      } else {
        customerId = uuidv4();
        await dbRun(
          'INSERT INTO customers (id, name, phone, email, referral_source, visit_count, last_visit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)',
          [customerId, result.data.name, result.data.phone, result.data.email || '', result.data.referral_source || '', result.data.date || '', now, now]
        );
      }
    }

    // 管理画面からのカスタム値（金額・所要時間・メニュー名の上書き）
    const adminData = isAdmin ? (result.data as z.infer<typeof adminBookingSchema>) : null;

    let googleEventId: string | null = null;
    if ((service || (isAdmin && adminData?.service_name_custom)) && result.data.date && result.data.time) {
      const calServiceName = adminData?.service_name_custom || service?.name || '';
      const calPrice = adminData?.custom_price ?? service?.price ?? 0;
      const calDuration = adminData?.custom_duration ?? service?.duration ?? 60;
      try {
        googleEventId = await addEventToCalendar({
          name: result.data.name,
          phone: result.data.phone || '',
          serviceName: calServiceName,
          price: calPrice,
          date: result.data.date,
          time: result.data.time,
          duration: calDuration,
          notes: result.data.notes,
        });
      } catch {
        // Google Calendar is optional
      }
    }

    const finalServiceName = adminData?.service_name_custom || service?.name || '';
    const finalPrice = adminData?.custom_price ?? service?.price ?? 0;
    const finalDuration = adminData?.custom_duration ?? service?.duration ?? 0;

    const batchResults = await dbBatch([
      {
        sql: `INSERT INTO bookings (id, name, phone, email, date, time, service_id, service_name, duration, price, status, staff_id, staff_name, customer_id, referral_source, google_event_id, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, result.data.name, result.data.phone || '', result.data.email || null, result.data.date || '', result.data.time || '', service?.id || '', finalServiceName, finalDuration, finalPrice, result.data.staff_id || '', staffName, customerId, result.data.referral_source || '', googleEventId, result.data.notes || null, now, now],
      },
      { sql: 'SELECT * FROM bookings WHERE id = ?', args: [id] },
    ]);

    const booking = batchResults[1].rows[0];

    // 予約確認メール送信
    if (result.data.email && service && result.data.date && result.data.time) {
      const salon = await dbGet<{ salon_name: string; phone: string; address: string }>(
        'SELECT salon_name, phone, address FROM salon_settings WHERE id = 1'
      );
      try {
        await sendBookingConfirmationEmail({
          customerName: result.data.name,
          customerEmail: result.data.email,
          date: result.data.date,
          time: result.data.time,
          serviceName: service.name,
          duration: service.duration,
          price: service.price,
          salonName: salon?.salon_name || 'Head Spa',
          salonPhone: salon?.phone || '',
          salonAddress: salon?.address || '',
          staffName: staffName || undefined,
        });
      } catch { /* email is optional */ }
    }

    // LINE通知送信
    if (service && result.data.date && result.data.time) {
      try {
        await sendLineBookingNotification({
          customerName: result.data.name,
          customerPhone: result.data.phone || '',
          date: result.data.date,
          time: result.data.time,
          serviceName: service.name,
          duration: service.duration,
          price: service.price,
        staffName: staffName || undefined,
        notes: result.data.notes || undefined,
      });
      } catch {
        // LINE notification is optional
      }
    }

    return NextResponse.json(booking, { status: 201, headers: noCacheHeaders });
  } catch (err) {
    console.error('POST /api/bookings error:', err);
    return NextResponse.json({ error: '予約の作成に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
