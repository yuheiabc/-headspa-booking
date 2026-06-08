import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet } from '@/lib/db';

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

    // その他収入の合計を取得
    const otherIncomeTotal = await dbGet<{ total: number }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM other_income WHERE date >= ? AND date <= ?',
      [startDate, endDate]
    );

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

      // 日別のその他収入を取得してマージ
      const otherDaily = await dbAll(
        `SELECT date, SUM(amount) as other_income FROM other_income WHERE date >= ? AND date <= ? GROUP BY date`,
        [startDate, endDate]
      );
      const otherMap = new Map(otherDaily.map((d: Record<string, unknown>) => [String(d.date), Number(d.other_income)]));

      const merged: Record<string, unknown>[] = rows.map((r: Record<string, unknown>) => ({
        ...r,
        other_income: otherMap.get(String(r.date)) || 0,
      }));

      // その他収入しかない日付を追加
      otherDaily.forEach((d: Record<string, unknown>) => {
        const dt = String(d.date);
        if (!rows.find((r: Record<string, unknown>) => String(r.date) === dt)) {
          merged.push({ date: dt, booking_count: 0, revenue: 0, cancelled_count: 0, other_income: Number(d.other_income) });
        }
      });
      merged.sort((a, b) => String(a.date).localeCompare(String(b.date)));

      return NextResponse.json({ data: merged, other_income_total: otherIncomeTotal?.total || 0 }, { headers: noCacheHeaders });
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

      const otherMonthly = await dbAll(
        `SELECT substr(date, 1, 7) as month, SUM(amount) as other_income FROM other_income WHERE date >= ? AND date <= ? GROUP BY substr(date, 1, 7)`,
        [startDate, endDate]
      );
      const otherMap = new Map(otherMonthly.map((d: Record<string, unknown>) => [String(d.month), Number(d.other_income)]));

      const merged: Record<string, unknown>[] = rows.map((r: Record<string, unknown>) => ({
        ...r,
        other_income: otherMap.get(String(r.month)) || 0,
      }));

      otherMonthly.forEach((d: Record<string, unknown>) => {
        const m = String(d.month);
        if (!rows.find((r: Record<string, unknown>) => String(r.month) === m)) {
          merged.push({ month: m, booking_count: 0, revenue: 0, cancelled_count: 0, avg_price: 0, other_income: Number(d.other_income) });
        }
      });
      merged.sort((a, b) => String(a.month).localeCompare(String(b.month)));

      return NextResponse.json({ data: merged, other_income_total: otherIncomeTotal?.total || 0 }, { headers: noCacheHeaders });
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
      return NextResponse.json({ data: rows, other_income_total: otherIncomeTotal?.total || 0 }, { headers: noCacheHeaders });
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
      return NextResponse.json({ data: rows, other_income_total: otherIncomeTotal?.total || 0 }, { headers: noCacheHeaders });
    }

    return NextResponse.json({ error: '不明なレポートタイプです' }, { status: 400, headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/reports error:', err);
    return NextResponse.json({ error: 'レポートの取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
