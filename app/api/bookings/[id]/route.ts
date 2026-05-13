import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { deleteEventFromCalendar } from '@/lib/google-calendar';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDB();
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) {
      return NextResponse.json({ error: '予約が見つかりません' }, { status: 404 });
    }
    return NextResponse.json(booking);
  } catch {
    return NextResponse.json({ error: '予約の取得に失敗しました' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDB();
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id) as Record<string, unknown> | undefined;
    if (!booking) {
      return NextResponse.json({ error: '予約が見つかりません' }, { status: 404 });
    }

    const body = await request.json();
    const now = new Date().toISOString();

    if (body.status) {
      db.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?')
        .run(body.status, now, params.id);

      if (body.status === 'cancelled' && booking.google_event_id) {
        try {
          await deleteEventFromCalendar(booking.google_event_id as string);
        } catch {
          // Google Calendar deletion is optional
        }
      }
    }

    if (body.notes !== undefined) {
      db.prepare('UPDATE bookings SET notes = ?, updated_at = ? WHERE id = ?')
        .run(body.notes, now, params.id);
    }

    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: '予約の更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDB();
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id) as Record<string, unknown> | undefined;
    if (!booking) {
      return NextResponse.json({ error: '予約が見つかりません' }, { status: 404 });
    }

    if (booking.google_event_id) {
      try {
        await deleteEventFromCalendar(booking.google_event_id as string);
      } catch {
        // Google Calendar deletion is optional
      }
    }

    db.prepare('DELETE FROM bookings WHERE id = ?').run(params.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '予約の削除に失敗しました' }, { status: 500 });
  }
}
