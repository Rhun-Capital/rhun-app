import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

const dynamodb = DynamoDBDocumentClient.from(client);

const PUBLIC_API_ROUTES = new Set([
  '/api/verify-token',
  '/api/auth/callback',
  '/api/webhooks',
  '/api/clear-access'
]);

const PUBLIC_PAGE_ROUTES = new Set([
  '/login'
]);

async function verifyNFTOwnership(userId: string): Promise<boolean> {
  try {
    const result = await dynamodb.send(new GetCommand({
      TableName: 'NFTOrders',
      Key: { userId }
    }));
    return !!result.Item && !!result.Item.isVerified;
  } catch (error) {
    console.error('DynamoDB error:', error);
    return false;
  }
}

async function verifyAccessToken(token: string): Promise<boolean> {
  try {
    const result = await dynamodb.send(new GetCommand({
      TableName: 'EarlyAccess',
      Key: { Access_key: token }
    }));
    return !!result.Item;
  } catch (error) {
    console.error('DynamoDB error:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    if (PUBLIC_API_ROUTES.has(pathname)) {
      return NextResponse.next();
    }

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

      if ((pathname === '/api/nft/order' || pathname === '/api/nft/verify') && user) {
        const headers = new Headers(request.headers);
        headers.set('x-user', JSON.stringify(user));
        return NextResponse.next({
          headers
        });
      }
      
      const accessToken = request.cookies.get('rhun_early_access_token')?.value;
      if (!accessToken || !(await verifyAccessToken(accessToken))) {
        return NextResponse.json(
          { error: 'Invalid or missing access token' },
          { status: 403 }
        );
      }

      const headers = new Headers(request.headers);
      headers.set('x-user', JSON.stringify(user));

      return NextResponse.next({
        headers
      });
    } catch (error) {
      console.error('API route error:', error);
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    }
  }

  // Handle page routes
  if (!PUBLIC_PAGE_ROUTES.has(pathname)) {
    try {
      // Check access token first
      const accessToken = request.cookies.get('rhun_early_access_token')?.value;
      const hasValidToken = accessToken ? await verifyAccessToken(accessToken) : false;

      // No access token, check NFT ownership via Privy
      const privyToken = request.cookies.get('privy-token')?.value;
      
      // If no Privy token at this point (and no access token), redirect to login
      if (!privyToken) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // If they have a valid access token, allow access immediately
      if (hasValidToken) {
        return NextResponse.next();
      }

      // Verify Privy token and check NFT ownership
      try {
        const user = await privy.verifyAuthToken(privyToken);
        const hasNFT = user?.userId ? await verifyNFTOwnership(user.userId) : false;

        if (hasNFT) {
          return NextResponse.next();
        } else if (request.nextUrl.pathname !== '/login'){
          return NextResponse.redirect(new URL('/login', request.url));
        }
      } catch (error) {
        console.error('Error verifying privy token:', error);
        if (request.nextUrl.pathname !== '/login') {
          return NextResponse.redirect(new URL('/login', request.url));
        }        
      }
    } catch (error) {
      console.error('Page route error:', error);
      if (request.nextUrl.pathname !== '/login') {
        return NextResponse.redirect(new URL('/login', request.url));
      }   
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};