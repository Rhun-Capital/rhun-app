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
  '/api/webhooks'
]);

const PUBLIC_PAGE_ROUTES = new Set([
  '/login',
  '/fast-pass'
]);

async function verifyAccessToken(token: string): Promise<boolean> {
  try {
    const result = await dynamodb.send(new GetCommand({
      TableName: 'EarlyAccess',
      Key: { Access_key: token }
    }));
    return !!result.Item && result.Item.verified === true;
  } catch (error) {
    console.error('DynamoDB error:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    if (request.headers.get('x-internal-key') === process.env.INTERNAL_API_SECRET) {
      return NextResponse.next();
    }
    
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
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    }
  }

  if (!PUBLIC_PAGE_ROUTES.has(pathname)) {    
    
    const accessToken = request.cookies.get('rhun_early_access_token')?.value;
    console.log('Access token:', accessToken);
    if (!accessToken || !(await verifyAccessToken(accessToken))) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const authToken = request.cookies.get('privy-token');
    if (!authToken) {
      return NextResponse.redirect(new URL('/', request.url));
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