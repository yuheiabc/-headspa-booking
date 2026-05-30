import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbBatch, dbRun } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
};

const shiftSchema = z.object({
  staff_id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  is_off: z.boolean().optional(),
  note: z.string().optional(),
});

const bulkShiftSchema = z.object({
  shifts: z.array(shiftSchema),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staff_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = 'SELECT ss.*, s.name as staff_name, s.color as staff_color FROM staff_shifts ss JOIN staff s ON ss.staff_id = s.id';
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (staffId) {
      conditions.push('ss.staff_id = ?');
      params.push(staffId);
    }
    if (startDate) {
      conditions.push('ss.date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('ss.date <= ?');
      params.push(endDate);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY ss.date ASC, ss.start_time ASC';

    const shifts = await dbAll(query, params);
    const mapped = (shifts as Record<string, unknown>[]).map((s) => ({
      ...s,
      is_off: Boolean(s.is_off),
    }));
    return NextResponse.json(mapped, { headers: noCacheHeaders });
  } catch (err) {
    console.error('GET /api/staff/shifts error:', err);
    return NextResponse.json({ error: 'シフトの取得に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'リクエストデータの読み取りに失敗しました' }, { status: 400, headers: noCacheHeaders });
    }

    // Support both single shift and bulk shifts
    if (body.shifts) {
      const result = bulkShiftSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json({ error: result.error.errors[0].message }, { status: 400, headers: noCacheHeaders });
      }

      const stmts = result.data.shifts.map((shift) => ({
        sql: `INSERT OR REPLACE INTO staff_shifts (staff_id, date, start_time, end_time, is_off, note, created_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [
          shift.staff_id,
          shift.date,
          shift.start_time || '10:00',
          shift.end_time || '20:00',
          shift.is_off ? 1 : 0,
          shift.note || '',
        ] as unknown[],
      }));

      await dbBatch(stmts);
      return NextResponse.json({ success: true, count: stmts.length }, { status: 201, headers: noCacheHeaders });
    } else {
      const result = shiftSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json({ error: result.error.errors[0].message }, { status: 400, headers: noCacheHeaders });
      }

      await dbRun(
        `INSERT OR REPLACE INTO staff_shifts (staff_id, date, start_time, end_time, is_off, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          result.data.staff_id,
          result.data.date,
          result.data.start_time || '10:00',
          result.data.end_time || '20:00',
          result.data.is_off ? 1 : 0,
          result.data.note || '',
        ]
      );

      return NextResponse.json({ success: true }, { status: 201, headers: noCacheHeaders });
    }
  } catch (err) {
    console.error('POST /api/staff/shifts error:', err);
    return NextResponse.json({ error: 'シフトの保存に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staff_id');
    const date = searchParams.get('date');

    if (!staffId || !date) {
      return NextResponse.json({ error: 'staff_idとdateが必要です' }, { status: 400, headers: noCacheHeaders });
    }

    await dbRun('DELETE FROM staff_shifts WHERE staff_id = ? AND date = ?', [staffId, date]);
    return NextResponse.json({ success: true }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('DELETE /api/staff/shifts error:', err);
    return NextResponse.json({ error: 'シフトの削除に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
