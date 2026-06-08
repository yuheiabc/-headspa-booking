import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbRun } from '@/lib/db';
import { deleteEventFromCalendar } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';
const noCacheHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' };

export async function POST(request: NextRequest) {
  try {
    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'リクエストデータの読み取りに失敗しました' }, { status: 400, headers: noCacheHeaders });
    }

    const ids: string[] = body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '削除する予約を選択してください' }, { status: 400, headers: noCacheHeaders });
    }

    // Google Calendar のイベントも削除
    const placeholders = ids.map(() => '?').join(',');
    const bookings = await dbAll<Record<string, unknown>>(
      `SELECT id, google_event_id FROM bookings WHERE id IN (${placeholders})`,
      ids
    );

    for (const b of bookings) {
      if (b.google_event_id) {
        try { await deleteEventFromCalendar(b.google_event_id as string); } catch { /* optional */ }
      }
    }

    await dbRun(`DELETE FROM bookings WHERE id IN (${placeholders})`, ids);

    return NextResponse.json({ success: true, deleted: ids.length }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('POST /api/bookings/batch-delete error:', err);
    return NextResponse.json({ error: '一括削除に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
