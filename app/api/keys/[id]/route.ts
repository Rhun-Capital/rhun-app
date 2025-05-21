import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

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

// DELETE /api/keys/[id] - Delete an API key
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('DELETE /api/keys/[id] - Starting request handling');
    
    const authHeader = request.headers.get('authorization');
    const origin = request.headers.get('origin');
    console.log('Request details:', {
      authHeaderPresent: !!authHeader,
      origin,
      keyId: params.id
    });
    
    if (!authHeader?.startsWith('Bearer ')) {
      return createResponse({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const userId = await verifyToken(token, origin || undefined);
    if (!userId) {
      return createResponse({ error: 'Invalid token' }, 401);
    }

    // First, verify that the key belongs to the user
    const key = await dynamodb.send(new GetCommand({
      TableName: 'ApiKeys',
      Key: {
        userId,
        id: params.id
      }
    }));

    if (!key.Item || key.Item.userId !== userId) {
      return createResponse({ error: 'API key not found' }, 404);
    }

    // Delete the key
    await dynamodb.send(new DeleteCommand({
      TableName: 'ApiKeys',
      Key: {
        userId,
        id: params.id
      }
    }));

    return createResponse({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return createResponse({ error: 'Internal server error' }, 500);
  }
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
      'origin': effectiveOrigin
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