import { NextRequest, NextResponse } from 'next/server';
import { dbRun } from '@/lib/db';

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
      return NextResponse.json({ error: '削除する顧客を選択してください' }, { status: 400, headers: noCacheHeaders });
    }

    const placeholders = ids.map(() => '?').join(',');

    // 関連するカルテ（メモ）も削除
    await dbRun(`DELETE FROM customer_notes WHERE customer_id IN (${placeholders})`, ids);
    // 関連する回数券も削除
    await dbRun(`DELETE FROM customer_tickets WHERE customer_id IN (${placeholders})`, ids);
    // 顧客を削除
    await dbRun(`DELETE FROM customers WHERE id IN (${placeholders})`, ids);

    return NextResponse.json({ success: true, deleted: ids.length }, { headers: noCacheHeaders });
  } catch (err) {
    console.error('POST /api/customers/batch-delete error:', err);
    return NextResponse.json({ error: '一括削除に失敗しました' }, { status: 500, headers: noCacheHeaders });
  }
}
