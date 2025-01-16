import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Add paths that should be public
  const publicPaths = ['/', '/login'];
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname === path
  );

  // Get the Privy auth token from the cookies
  const authToken = request.cookies.get('privy-token');

  // If not authenticated and trying to access protected route, redirect to home
  if (!authToken && !isPublicPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/agents/:path*',
    '/research/:path*',
    '/settings/:path*',
  ],
};