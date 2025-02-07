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
  '/api/clear-access',
  '/api/auth/verify',
  '/api/auth/token',
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

  // Handle public routes first
  if (pathname.startsWith('/api/') && PUBLIC_API_ROUTES.has(pathname)) {
    return NextResponse.next();
  }
  if (PUBLIC_PAGE_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Unified auth checking function
  async function checkAuthorization() {

    // Then check Privy token
    const privyToken = request.cookies.get('privy-token')?.value;
    if (!privyToken) {
      return false;
    }    

    // Check early access token first
    const accessToken = request.cookies.get('rhun_early_access_token')?.value;
    if (accessToken && await verifyAccessToken(accessToken)) {
      return true;
    }

    try {
      const user = await privy.verifyAuthToken(privyToken);
      if (!user?.userId) return false;
      
      // Check NFT ownership
      return await verifyNFTOwnership(user.userId);
    } catch (error) {
      console.error('Auth verification error:', error);
      return false;
    }
  }

  try {
    const isAuthorized = await checkAuthorization();
    
    if (!isAuthorized) {
      // For API routes
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Unauthorized access' },
          { status: 403 }
        );
      }
      // For page routes
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // if authorized and on /login, redirect to home
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};