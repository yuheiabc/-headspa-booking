import { NextRequest, NextResponse } from 'next/server';
import { dbAll } from '@/lib/db';

export const dynamic = 'force-dynamic';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily'; // daily, monthly, service, staff
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start_dateとend_dateが必要です' }, { status: 400, headers: noCacheHeaders });
    }

    if (type === 'daily') {
      const rows = await dbAll(
        `SELECT
          date,
          COUNT(*) as booking_count,
          SUM(CASE WHEN status != 'cancelled' THEN price ELSE 0 END) as revenue,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count
        FROM bookings
        WHERE date >= ? AND date <= ?
        GROUP BY date
        ORDER BY date ASC`,
        [startDate, endDate]
      );
      return NextResponse.json(rows, { headers: noCacheHeaders });
    }

    if (type === 'monthly') {
      const rows = await dbAll(
        `SELECT
          substr(date, 1, 7) as month,
          COUNT(*) as booking_count,
          SUM(CASE WHEN status != 'cancelled' THEN price ELSE 0 END) as revenue,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
          ROUND(AVG(CASE WHEN status != 'cancelled' THEN price ELSE NULL END)) as avg_price
        FROM bookings
        WHERE date >= ? AND date <= ?
        GROUP BY substr(date, 1, 7)
        ORDER BY month ASC`,
        [startDate, endDate]
      );
      return NextResponse.json(rows, { headers: noCacheHeaders });
    }

    if (type === 'service') {
      const rows = await dbAll(
        `SELECT
          service_name,
          COUNT(*) as booking_count,
          SUM(CASE WHEN status != 'cancelled' THEN price ELSE 0 END) as revenue
        FROM bookings
        WHERE date >= ? AND date <= ? AND status != 'cancelled'
        GROUP BY service_name
        ORDER BY revenue DESC`,
        [startDate, endDate]
      );
      return NextResponse.json(rows, { headers: noCacheHeaders });
    }

    if (type === 'staff') {
      const rows = await dbAll(
        `SELECT
          COALESCE(NULLIF(staff_name, ''), '未指定') as staff_name,
          COUNT(*) as booking_count,
          SUM(CASE WHEN status != 'cancelled' THEN price ELSE 0 END) as revenue
        FROM bookings
        WHERE date >= ? AND date <= ? AND status != 'cancelled'
        GROUP BY staff_name
        ORDER BY revenue DESC`,
        [startDate, endDate]
      );
      return NextResponse.json(rows, { headers: noCacheHeaders });
    }

    return NextResponse.json({ error: '不明なレポートタイプです' }, { status: 400, headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/reports error:', err);
    return NextResponse.json({ error: 'レポートの取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
