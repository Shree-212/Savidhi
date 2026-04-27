import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Forwards the current pathname as `x-pathname` so layout.tsx can build a
// per-page rel=canonical URL pointing at the savidhi.in version of the page.
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|svlogo.png|api/|.*\\.).*)'],
};
