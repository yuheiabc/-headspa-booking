import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun, dbBatch } from '@/lib/db';

export const dynamic = 'force-dynamic';
const noCacheHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' };

// 回数券を1回消化
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    let body;
    try { body = await request.json(); } catch { body = {}; }

    const ticket = await dbGet<Record<string, unknown>>('SELECT * FROM customer_tickets WHERE id = ?', [id]);
    if (!ticket) return NextResponse.json({ error: '回数券が見つかりません' }, { status: 404, headers: noCacheHeaders });

    if (body.action === 'use') {
      // 消化
      const remaining = Number(ticket.remaining_count);
      if (remaining <= 0) return NextResponse.json({ error: '残り回数がありません' }, { status: 400, headers: noCacheHeaders });

      const batchResults = await dbBatch([
        {
          sql: 'UPDATE customer_tickets SET used_count = used_count + 1, remaining_count = remaining_count - 1 WHERE id = ?',
          args: [id],
        },
        { sql: 'SELECT * FROM customer_tickets WHERE id = ?', args: [id] },
      ]);
      return NextResponse.json(batchResults[1].rows[0], { headers: noCacheHeaders });
    }

    if (body.action === 'undo') {
      // 消化取り消し
      const used = Number(ticket.used_count);
      if (used <= 0) return NextResponse.json({ error: '消化履歴がありません' }, { status: 400, headers: noCacheHeaders });

      const batchResults = await dbBatch([
        {
          sql: 'UPDATE customer_tickets SET used_count = used_count - 1, remaining_count = remaining_count + 1 WHERE id = ?',
          args: [id],
        },
        { sql: 'SELECT * FROM customer_tickets WHERE id = ?', args: [id] },
      ]);
      return NextResponse.json(batchResults[1].rows[0], { headers: noCacheHeaders });
    }

    // その他の更新（メモなど）
    if (body.memo !== undefined) {
      await dbRun('UPDATE customer_tickets SET memo = ? WHERE id = ?', [body.memo, id]);
    }
    if (body.expires_at !== undefined) {
      await dbRun('UPDATE customer_tickets SET expires_at = ? WHERE id = ?', [body.expires_at, id]);
    }

    const updated = await dbGet('SELECT * FROM customer_tickets WHERE id = ?', [id]);
    return NextResponse.json(updated, { headers: noCacheHeaders });
  } catch (err) {
    console.error('PUT /api/tickets/[id] error:', err);
    return NextResponse.json({ error: '回数券の更新に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    await dbRun('DELETE FROM customer_tickets WHERE id = ?', [id]);
    return NextResponse.json({ success: true }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('DELETE /api/tickets/[id] error:', err);
    return NextResponse.json({ error: '回数券の削除に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
