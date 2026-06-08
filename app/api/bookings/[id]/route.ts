import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun, dbBatch } from '@/lib/db';
import { deleteEventFromCalendar } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!booking) {
      return NextResponse.json({ error: '予約が見つかりません' }, { status: 404, headers: noCacheHeaders });
    }
    return NextResponse.json(booking, { headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/bookings/[id] error:', err);
    return NextResponse.json({ error: '予約の取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const booking = await dbGet<Record<string, unknown>>('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!booking) {
      return NextResponse.json({ error: '予約が見つかりません' }, { status: 404, headers: noCacheHeaders });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'リクエストデータの読み取りに失敗しました' }, { status: 400, headers: noCacheHeaders });
    }

    const now = new Date().toISOString();

    const updates: Array<{ sql: string; args: unknown[] }> = [];

    // ステータス変更
    if (body.status) {
      updates.push({ sql: 'UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?', args: [body.status, now, id] });

      if (body.status === 'cancelled' && booking.google_event_id) {
        try {
          await deleteEventFromCalendar(booking.google_event_id as string);
        } catch {
          // Google Calendar deletion is optional
        }
      }
    }

    // 各フィールドの更新
    if (body.name !== undefined) {
      updates.push({ sql: 'UPDATE bookings SET name = ?, updated_at = ? WHERE id = ?', args: [body.name, now, id] });
    }
    if (body.phone !== undefined) {
      updates.push({ sql: 'UPDATE bookings SET phone = ?, updated_at = ? WHERE id = ?', args: [body.phone, now, id] });
    }
    if (body.email !== undefined) {
      updates.push({ sql: 'UPDATE bookings SET email = ?, updated_at = ? WHERE id = ?', args: [body.email, now, id] });
    }
    if (body.date !== undefined) {
      updates.push({ sql: 'UPDATE bookings SET date = ?, updated_at = ? WHERE id = ?', args: [body.date, now, id] });
    }
    if (body.time !== undefined) {
      updates.push({ sql: 'UPDATE bookings SET time = ?, updated_at = ? WHERE id = ?', args: [body.time, now, id] });
    }
    if (body.service_id !== undefined && body.service_name !== undefined) {
      updates.push({ sql: 'UPDATE bookings SET service_id = ?, service_name = ?, duration = ?, price = ?, updated_at = ? WHERE id = ?',
        args: [body.service_id, body.service_name, body.duration || booking.duration, body.price || booking.price, now, id] });
    }
    if (body.staff_id !== undefined) {
      updates.push({ sql: 'UPDATE bookings SET staff_id = ?, staff_name = ?, updated_at = ? WHERE id = ?',
        args: [body.staff_id, body.staff_name || '', now, id] });
    }
    if (body.notes !== undefined) {
      updates.push({ sql: 'UPDATE bookings SET notes = ?, updated_at = ? WHERE id = ?', args: [body.notes, now, id] });
    }

    updates.push({ sql: 'SELECT * FROM bookings WHERE id = ?', args: [id] });
    const batchResults = await dbBatch(updates);
    const updated = batchResults[batchResults.length - 1].rows[0];
    return NextResponse.json(updated, { headers: noCacheHeaders });
  } catch (err) {
    console.error('PUT /api/bookings/[id] error:', err);
    return NextResponse.json({ error: '予約の更新に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const booking = await dbGet<Record<string, unknown>>('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!booking) {
      return NextResponse.json({ error: '予約が見つかりません' }, { status: 404, headers: noCacheHeaders });
    }

    if (booking.google_event_id) {
      try {
        await deleteEventFromCalendar(booking.google_event_id as string);
      } catch {
        // Google Calendar deletion is optional
      }
    }

    await dbRun('DELETE FROM bookings WHERE id = ?', [id]);
    return NextResponse.json({ success: true }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('DELETE /api/bookings/[id] error:', err);
    return NextResponse.json({ error: '予約の削除に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
