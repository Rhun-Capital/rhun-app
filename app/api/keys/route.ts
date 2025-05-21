import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

// Initialize DynamoDB client with v3 SDK
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

const dynamodb = DynamoDBDocumentClient.from(client);

// Cache for user IDs to reduce Privy API calls
const userCache = new Map<string, { userId: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to generate API key
function generateApiKey(): string {
  const randomBytes = createHash('sha256')
    .update(uuidv4())
    .digest('hex');
  return `rhun_${randomBytes}`;
}

// Helper function to verify the token and get user ID
async function verifyToken(token: string, requestOrigin?: string): Promise<string | null> {
  try {
    // Check cache first
    const cached = userCache.get(token);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Using cached user ID');
      return cached.userId;
    }

    const privyUrl = 'https://auth.privy.io/api/v1/users/me';
    const effectiveOrigin = requestOrigin || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    
    console.log('Token verification context:', {
      effectiveOrigin,
      requestOrigin,
      configuredAppUrl: process.env.NEXT_PUBLIC_URL,
      isProduction: process.env.NODE_ENV === 'production',
      host: process.env.VERCEL_URL || 'localhost'
    });

    const headers = {
      'Authorization': `Bearer ${token}`,
      'privy-app-id': process.env.NEXT_PUBLIC_PRIVY_APP_ID as string,
      'origin': effectiveOrigin,
      'host': 'auth.privy.io'
    };

    console.log('Making Privy request:', {
      url: privyUrl,
      headers: {
        ...headers,
        'Authorization': `Bearer ${token.substring(0, 10)}...` // Log partial token for security
      }
    });

    const response = await fetch(privyUrl, {
      method: 'GET',
      headers
    });

    console.log('Privy response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Privy verification failed:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorData,
        effectiveOrigin,
        isProduction: process.env.NODE_ENV === 'production'
      });
      return null;
    }

    const data = await response.json();
    console.log('Privy response data:', {
      hasUser: !!data.user,
      userId: data.user?.id,
      responseKeys: Object.keys(data)
    });
    
    const userId = data.user?.id;
    if (!userId) {
      console.error('No user ID found in Privy response:', {
        dataKeys: Object.keys(data),
        userKeys: data.user ? Object.keys(data.user) : null
      });
      return null;
    }

    // Cache the user ID
    userCache.set(token, { userId, timestamp: Date.now() });
    console.log('Privy verification successful, userId:', userId);
    return userId;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

// Helper function to add CORS and standard headers
function createResponse(data: any, status: number = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_URL || '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: Request) {
  return createResponse(null, 204);
}

// GET /api/keys - List all API keys for the user
export async function GET(request: Request) {
  try {
    console.log('GET /api/keys - Starting request handling');
    console.log('Environment:', {
      NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
      hasPrivyAppId: !!process.env.NEXT_PUBLIC_PRIVY_APP_ID,
      NODE_ENV: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    });
    
    const authHeader = request.headers.get('authorization');
    const origin = request.headers.get('origin');
    console.log('Request details:', {
      authHeaderPresent: !!authHeader,
      origin,
      host: request.headers.get('host'),
      referer: request.headers.get('referer')
    });
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Invalid auth header format');
      return createResponse({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.split(' ')[1];
    console.log('Token received, length:', token.length);
    
    const userId = await verifyToken(token, origin || undefined);
    console.log('Token verification result - userId:', userId);
    
    if (!userId) {
      console.log('Token verification failed - no userId returned');
      return createResponse({ error: 'Invalid token' }, 401);
    }

    console.log('Querying DynamoDB for userId:', userId);
    const result = await dynamodb.send(new QueryCommand({
      TableName: 'ApiKeys',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }));
    console.log('DynamoDB query result - items found:', result.Items?.length || 0);

    return createResponse(result.Items || []);
  } catch (error) {
    console.error('Error in GET /api/keys:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return createResponse({ error: 'Internal server error' }, 500);
  }
}

// POST /api/keys - Create a new API key
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const origin = request.headers.get('origin');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return createResponse({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const userId = await verifyToken(token, origin || undefined);
    if (!userId) {
      return createResponse({ error: 'Invalid token' }, 401);
    }

    const { name } = await request.json();
    if (!name) {
      return createResponse({ error: 'Name is required' }, 400);
    }

    const apiKey = generateApiKey();
    const keyId = uuidv4();
    const now = new Date().toISOString();

    await dynamodb.send(new PutCommand({
      TableName: 'ApiKeys',
      Item: {
        userId,
        id: keyId,
        name,
        key: apiKey,
        createdAt: now,
        lastUsed: null
      }
    }));

    return createResponse({
      id: keyId,
      name,
      key: apiKey,
      createdAt: now
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return createResponse({ error: 'Internal server error' }, 500);
  }
} 