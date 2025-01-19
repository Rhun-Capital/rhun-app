// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

// Define public API routes that don't need auth
const PUBLIC_API_ROUTES = new Set([
  '/api/auth/callback',
  '/api/webhooks'
]);

// Define public page routes
const PUBLIC_PAGE_ROUTES = new Set([
  '/',
  '/login'
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle API routes
  if (pathname.startsWith('/api/')) {

    // Check for internal requests
    if (request.headers.get('x-internal-key') === process.env.INTERNAL_API_SECRET) {
      return NextResponse.next();
    }
    
    // Skip auth for public API routes
    if (PUBLIC_API_ROUTES.has(pathname)) {
      return NextResponse.next();
    }

    // Check for Bearer token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    try {
      const token = authHeader.split(' ')[1];
      const user = await privy.verifyAuthToken(token);
      
      // Add verified user to request headers
      // This can be accessed in your route handlers
      const headers = new Headers(request.headers);
      headers.set('x-user', JSON.stringify(user));

      return NextResponse.next({
        headers
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    }
  }

  // Handle page routes
  if (!PUBLIC_PAGE_ROUTES.has(pathname)) {
    const authToken = request.cookies.get('privy-token');
    if (!authToken) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match all page routes except public ones
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};