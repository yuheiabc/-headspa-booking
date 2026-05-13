import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, saveTokensToDB, getOAuth2Client } from '@/lib/google-calendar';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL('/admin/settings/google?error=access_denied', request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/admin/settings/google?error=no_code', request.url)
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    // 接続されたGoogleアカウントのメールアドレスを取得
    let email = '';
    try {
      const oauth2Client = getOAuth2Client();
      if (oauth2Client) {
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        email = userInfo.data.email || '';
      }
    } catch {
      // メール取得は任意
    }

    await saveTokensToDB({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
    }, email);

    return NextResponse.redirect(
      new URL('/admin/settings/google?success=connected', request.url)
    );
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/admin/settings/google?error=token_exchange_failed', request.url)
    );
  }
}
