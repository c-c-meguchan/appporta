import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isStudioHost, getStudioOrigin, getMainOrigin } from '@/lib/constants';

const STUDIO_PATHS = ['/login', '/signup', '/welcome', '/settings', '/profile', '/auth'];
const STUDIO_PREFIX = '/apps';

function isStudioPath(pathname: string): boolean {
  if (STUDIO_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return true;
  if (pathname.startsWith(STUDIO_PREFIX)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const pathname = request.nextUrl.pathname;

  // /@developerID → /developer/developerID（メインのみ。URLはそのまま /@id で表示）
  if (!isStudioHost(host) && pathname.startsWith('/@')) {
    const developerId = pathname.slice(2).split('/')[0];
    if (developerId) {
      const url = request.nextUrl.clone();
      url.pathname = `/developer/${encodeURIComponent(developerId)}`;
      return NextResponse.rewrite(url);
    }
  }

  if (isStudioHost(host)) {
    // メイン専用パスに来た → メインへリダイレクト
    if (pathname === '/terms' || pathname === '/privacy' || pathname.startsWith('/developer/')) {
      const mainOrigin = getMainOrigin(request);
      return NextResponse.redirect(new URL(pathname, mainOrigin));
    }
    // ルートはこのまま（page.tsx で Studio ホームを表示）
    return NextResponse.next();
  }

  // メインサイト (appporta.com / localhost)
  // OAuth の code がメインに付いてきた場合 → Studio のコールバックへ転送
  if (!isStudioHost(host) && request.nextUrl.searchParams.has('code')) {
    const studioOrigin = getStudioOrigin(request);
    const url = new URL('/auth/callback', studioOrigin);
    request.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));
    return NextResponse.redirect(url);
  }
  // Studio 専用パスに来た → Studio へリダイレクト（クエリはそのまま渡す）
  if (isStudioPath(pathname) || pathname === '/studio' || pathname.startsWith('/studio/')) {
    const studioOrigin = getStudioOrigin(request);
    const targetPath = pathname === '/studio' || pathname.startsWith('/studio/')
      ? pathname.replace(/^\/studio\/?/, '/') || '/'
      : pathname;
    const url = new URL(targetPath, studioOrigin);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
