import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

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

// Define public routes that don't require authentication
const PUBLIC_ROUTES = new Set([
  '/',
  '/api/chat',
  '/api/auth/verify',
  '/api/auth/token',
]);

// Define protected routes that require authentication
const PROTECTED_ROUTES = new Set([
  '/account',
  '/portfolio',
  '/watchers',
  '/agents'
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

// Rate limit configuration
const RATE_LIMIT = {
  UNAUTHENTICATED: {
    MAX_REQUESTS: 100,      // 30 requests
    TIME_WINDOW: 3600000,  // per hour (in milliseconds)
  },
  AUTHENTICATED: {
    MAX_REQUESTS: 100,     // 100 requests
    TIME_WINDOW: 3600000,  // per hour (in milliseconds)
  }
};

// Function to check and update rate limit
async function checkRateLimit(ip: string, isAuthenticated: boolean): Promise<boolean> {
  try {
    const now = Date.now();
    const config = isAuthenticated ? RATE_LIMIT.AUTHENTICATED : RATE_LIMIT.UNAUTHENTICATED;
    
    // Get current rate limit data
    const result = await dynamodb.send(new GetCommand({
      TableName: 'RateLimits',
      Key: { ip }
    }));

    const record = result.Item;
    
    if (!record) {
      // First request from this IP, create new record
      await dynamodb.send(new PutCommand({
        TableName: 'RateLimits',
        Item: {
          ip,
          count: 1,
          firstRequest: now,
          lastRequest: now
        }
      }));
      return true; // Allow the request
    }
    
    // Reset counter if outside time window
    if (now - record.firstRequest > config.TIME_WINDOW) {
      await dynamodb.send(new UpdateCommand({
        TableName: 'RateLimits',
        Key: { ip },
        UpdateExpression: 'SET #count = :count, #firstRequest = :firstRequest, #lastRequest = :lastRequest',
        ExpressionAttributeNames: {
          '#count': 'count',
          '#firstRequest': 'firstRequest',
          '#lastRequest': 'lastRequest'
        },
        ExpressionAttributeValues: {
          ':count': 1,
          ':firstRequest': now,
          ':lastRequest': now
        }
      }));
      return true; // Allow the request
    }
    
    // Check if rate limit exceeded
    if (record.count >= config.MAX_REQUESTS) {
      return false; // Rate limit exceeded
    }
    
    // Increment counter
    await dynamodb.send(new UpdateCommand({
      TableName: 'RateLimits',
      Key: { ip },
      UpdateExpression: 'SET #count = #count + :increment, #lastRequest = :lastRequest',
      ExpressionAttributeNames: {
        '#count': 'count',
        '#lastRequest': 'lastRequest'
      },
      ExpressionAttributeValues: {
        ':increment': 1,
        ':lastRequest': now
      }
    }));
    
    return true; // Allow the request
  } catch (error) {
    console.error('Rate limit check error:', error);
    return true; // On error, allow the request to avoid blocking legitimate users
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get client IP address
  const ip = request.ip || 
             request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') ||
             '127.0.0.1';

  // Check if it's the chat endpoint that needs rate limiting
  if (pathname === '/api/chat') {
    // Check if authenticated
    const privyToken = request.cookies.get('privy-token')?.value;
    const isAuthenticated = !!privyToken;
    
    if (!isAuthenticated) {
      // Apply rate limiting for unauthenticated requests
      const withinRateLimit = await checkRateLimit(ip, false);
      
      if (!withinRateLimit) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later or log in for higher limits.' },
          { status: 429 }
        );
      }
    } else {
      // For authenticated users, still apply rate limiting but with higher thresholds
      try {
        const user = await privy.verifyAuthToken(privyToken, process.env.PRIVY_VERIFICATION_KEY);
        if (user?.userId) {
          const withinRateLimit = await checkRateLimit(ip, true);
          
          if (!withinRateLimit) {
            return NextResponse.json(
              { error: 'Rate limit exceeded. Please try again later.' },
              { status: 429 }
            );
          }
        }
      } catch (error) {
        // If token verification fails, treat as unauthenticated
        const withinRateLimit = await checkRateLimit(ip, false);
        
        if (!withinRateLimit) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later or log in for higher limits.' },
            { status: 429 }
          );
        }
      }
    }
  }

  // Allow public routes without authentication
  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Check if the route requires authentication
  const requiresAuth = Array.from(PROTECTED_ROUTES).some(route => 
    pathname.startsWith(route)
  );

  if (requiresAuth) {
    // Verify Privy authentication for protected routes
    const privyToken = request.cookies.get('privy-token')?.value;
    if (!privyToken) {
      // Instead of redirecting to login, return a 401 status
      // The client will handle showing the Privy dialog
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
      const user = await privy.verifyAuthToken(privyToken, process.env.PRIVY_VERIFICATION_KEY);
      if (!user?.userId) {
        return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
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
      if (error instanceof Error) {
        console.error('Middleware error:', error.message);
      } else {
        console.error('Middleware error:', error);
      }
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
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