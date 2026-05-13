import { NextRequest, NextResponse } from 'next/server';
import { getCalendarEvents } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: '日付を指定してください' }, { status: 400 });
    }

    const events = await getCalendarEvents(date);
    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ error: 'Googleカレンダーの取得に失敗しました' }, { status: 500 });
  }
}
