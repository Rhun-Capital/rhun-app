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

    console.log('Verifying token with Privy...');
    const response = await fetch('https://auth.privy.io/api/v1/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'privy-app-id': process.env.NEXT_PUBLIC_PRIVY_APP_ID as string,
        'origin': requestOrigin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      }
    });

    console.log('Privy response status:', response.status);
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Privy verification failed:', errorData);
      return null;
    }

    const data = await response.json();
    console.log('Privy response data:', data);
    
    const userId = data.user?.id;
    if (!userId) {
      console.error('No user ID found in Privy response:', data);
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

// GET /api/keys - List all API keys for the user
export async function GET(request: Request) {
  try {
    console.log('GET /api/keys - Starting request handling');
    
    const authHeader = request.headers.get('authorization');
    const origin = request.headers.get('origin');
    console.log('Auth header present:', !!authHeader);
    console.log('Request origin:', origin);
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Invalid auth header format');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token received, length:', token.length);
    
    const userId = await verifyToken(token, origin || undefined);
    console.log('Token verification result - userId:', userId);
    
    if (!userId) {
      console.log('Token verification failed - no userId returned');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
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

    return NextResponse.json(result.Items || []);
  } catch (error) {
    console.error('Error in GET /api/keys:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/keys - Create a new API key
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const origin = request.headers.get('origin');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const userId = await verifyToken(token, origin || undefined);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
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

    return NextResponse.json({
      id: keyId,
      name,
      key: apiKey,
      createdAt: now
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 