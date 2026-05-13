import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-calendar';

export async function GET() {
  const url = getAuthUrl();
  if (!url) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET を .env.local に設定してください' },
      { status: 400 }
    );
  }
  return NextResponse.json({ url });
}
