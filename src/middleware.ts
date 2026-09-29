import { NextResponse, type NextRequest, userAgent } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Skip API routes, static assets, images, etc.
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Handle explicit view preference override from query parameter ?view=desktop or ?view=mobile
  const explicitView = searchParams.get('view');
  let responseToModify: NextResponse | null = null;

  let viewPref = request.cookies.get('view_preference')?.value;

  if (explicitView === 'desktop' || explicitView === 'mobile') {
    viewPref = explicitView;
  }

  // Detect device from User-Agent
  const { device } = userAgent(request);
  const ua = request.headers.get('user-agent') || '';
  const isMobileUA =
    device.type === 'mobile' ||
    device.type === 'tablet' ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  const shouldBeMobile = viewPref ? viewPref === 'mobile' : isMobileUA;
  const isCurrentPathMobile = pathname === '/m' || pathname.startsWith('/m/');

  // If mobile view needed but currently on desktop path
  if (shouldBeMobile && !isCurrentPathMobile) {
    const targetPath = pathname === '/' ? '/m' : `/m${pathname}`;
    const url = request.nextUrl.clone();
    url.pathname = targetPath;
    if (explicitView) {
      url.searchParams.delete('view');
    }
    const res = NextResponse.redirect(url);
    if (explicitView) {
      res.cookies.set('view_preference', explicitView, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    }
    return res;
  }

  // If desktop view needed but currently on mobile path
  if (!shouldBeMobile && isCurrentPathMobile) {
    const targetPath = pathname.replace(/^\/m(?=\/|$)/, '') || '/';
    const url = request.nextUrl.clone();
    url.pathname = targetPath;
    if (explicitView) {
      url.searchParams.delete('view');
    }
    const res = NextResponse.redirect(url);
    if (explicitView) {
      res.cookies.set('view_preference', explicitView, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    }
    return res;
  }

  // If explicit query was provided on matching path, just set cookie and clean URL
  if (explicitView) {
    const url = request.nextUrl.clone();
    url.searchParams.delete('view');
    const res = NextResponse.redirect(url);
    res.cookies.set('view_preference', explicitView, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
