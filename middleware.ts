import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // OAuthコールバックは認証不要
  if (pathname.startsWith('/api/auth/callback/google')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/settings')) {
    if (pathname.startsWith('/api/settings') && request.method === 'GET') {
      return NextResponse.next();
    }

    if (pathname.startsWith('/api/admin/auth')) {
      return NextResponse.next();
    }

    const token = request.cookies.get('admin_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
      }
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const [, payloadBase64] = token.split('.');
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error('Token expired');
      }
    } catch {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: '認証が無効です' }, { status: 401 });
      }
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/settings/:path*', '/api/admin/:path*'],
};
