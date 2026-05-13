import { NextResponse } from 'next/server';
import { getTokensFromDB, clearTokensFromDB } from '@/lib/google-calendar';

export async function GET() {
  const icalUrl = process.env.GOOGLE_ICAL_URL || '';
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

  const tokens = await getTokensFromDB();
  const hasTokens = !!(tokens && (tokens.access_token || tokens.refresh_token));

  return NextResponse.json({
    ical_connected: icalUrl.length > 0,
    ical_url_set: icalUrl.length > 0,
    api_configured: clientId.length > 0 && clientSecret.length > 0,
    api_connected: hasTokens,
    connected_email: tokens?.connected_email || '',
  });
}

export async function DELETE() {
  await clearTokensFromDB();
  return NextResponse.json({ success: true });
}
