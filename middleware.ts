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

// Define public routes that don't require subscription
const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/account',
  '/api/auth/verify',
  '/api/auth/token',
  '/api/auth/webhooks',
  '/api/subscriptions/create-checkout',
  '/api/subscriptions/create-portal',
]);

// Define routes that require active subscription
// const SUBSCRIPTION_REQUIRED_ROUTES = new Set([
//   '/watchers',
// ]);

// Default template agent that's accessible without subscription
// const DEFAULT_TEMPLATE_AGENT = 'cc425065-b039-48b0-be14-f8afa0704357';

interface StripeSubscription {
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface TokenSubscription {
  blockTime: number;
  status: string;
  time: string;
}

async function checkStripeSubscription(userId: string): Promise<boolean> {
  try {
    const result = await dynamodb.send(new GetCommand({
      TableName: 'Subscriptions',
      Key: { userId }
    }));

    if (!result.Item) return false;

    const subscription = result.Item as StripeSubscription;
    
    // Check if subscription is active and not expired
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    // const isExpired = new Date(subscription.currentPeriodEnd) < new Date();
    // const willCancel = subscription.cancelAtPeriodEnd;

    return isActive // && !isExpired && !willCancel;
  } catch (error) {
    console.error('DynamoDB Stripe subscription error:', error);
    return false;
  }
}

async function checkTokenSubscription(userId: string): Promise<boolean> {
  try {
    const result = await dynamodb.send(new GetCommand({
      TableName: 'TokenSubscriptions',
      Key: { userId }
    }));

    if (!result.Item) return false;

    const subscription = result.Item as TokenSubscription;
    
    // Check if transaction was successful
    if (subscription.status !== 'Success') return false;

    // Calculate if the subscription is still valid (1 year from purchase)
    const purchaseDate = new Date(subscription.blockTime * 1000); // Convert Unix timestamp to milliseconds
    const expirationDate = new Date(purchaseDate.setFullYear(purchaseDate.getFullYear() + 1));
    const isExpired = expirationDate < new Date();

    return !isExpired;
  } catch (error) {
    console.error('DynamoDB Token subscription error:', error);
    return false;
  }
}

async function hasActiveSubscription(userId: string): Promise<boolean> {
  // Check both subscription types
  const [hasStripeSubscription, hasTokenSubscription] = await Promise.all([
    checkStripeSubscription(userId),
    checkTokenSubscription(userId)
  ]);

  // Return true if either subscription is active
  return hasStripeSubscription || hasTokenSubscription;
}

// function isAgentRoute(pathname: string): boolean {
//   return pathname.startsWith('/agents/');
// }

// function parseAgentPath(pathname: string): { 
//   isTemplateAgent: boolean; 
//   agentId: string | null;
//   isEditPage: boolean;
// } {
//   const parts = pathname.split('/');
  
//   // Handle template agent paths: /agents/template/<agentId>
//   if (parts[2] === 'template' && parts[3]) {
//     return {
//       isTemplateAgent: true,
//       agentId: parts[3],
//       isEditPage: parts[4] === 'edit'
//     };
//   }
  
//   // Handle user agent paths: /agents/<userId>/<agentId>
//   if (parts[2] && parts[3]) {
//     return {
//       isTemplateAgent: false,
//       agentId: parts[3],
//       isEditPage: parts[4] === 'edit'
//     };
//   }

//   return {
//     isTemplateAgent: false,
//     agentId: null,
//     isEditPage: false
//   };
// }

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Verify Privy authentication
  const privyToken = request.cookies.get('privy-token')?.value;
  if (!privyToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const user = await privy.verifyAuthToken(privyToken);
    if (!user?.userId) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check if subscription is required
    // let requiresSubscription = SUBSCRIPTION_REQUIRED_ROUTES.has(pathname);

    // Special handling for agent routes
    // if (isAgentRoute(pathname)) {
    //   const { isTemplateAgent, agentId, isEditPage } = parseAgentPath(pathname);
      
    //   // Require subscription for:
    //   // 1. Chatting with any template agent except the default one
    //   // 2. All non-template agents
    //   requiresSubscription = (!isEditPage && isTemplateAgent && agentId !== DEFAULT_TEMPLATE_AGENT) || 
    //     (!isTemplateAgent);
    // }

    // Check subscription if required
    // if (requiresSubscription) {
    //   const isSubscribed = await hasActiveSubscription(user.userId);
      
    //   if (!isSubscribed) {
    //     // For API routes
    //     if (pathname.startsWith('/api/')) {
    //       return NextResponse.json(
    //         { error: 'Active subscription required' },
    //         { status: 403 }
    //       );
    //     }
    //     // For page routes, redirect to pricing
    //     return NextResponse.redirect(new URL('/account?requiresSub=true', request.url));
    //   }
    // }

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