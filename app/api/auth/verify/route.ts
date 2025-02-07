// app/api/auth/verify/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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

async function verifyNFTOwnership(userId: string): Promise<boolean> {
  try {
    const result = await dynamodb.send(new GetCommand({
      TableName: 'NFTOrders',
      Key: { userId }
    }));
    return !!result.Item?.isVerified;
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

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const privyToken = cookieStore.get('privy-token')?.value;
    const accessToken = cookieStore.get('rhun_early_access_token')?.value;

    // Check early access token first
    if (accessToken && await verifyAccessToken(accessToken)) {
      return NextResponse.json({ authorized: true });
    }

    // Verify Privy token and NFT ownership
    if (!privyToken) {
      return NextResponse.json({ error: 'No privy token' }, { status: 401 });
    }

    const user = await privy.verifyAuthToken(privyToken);
    if (!user?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const hasNFT = await verifyNFTOwnership(user.userId);
    if (!hasNFT) {
      return NextResponse.json({ error: 'No NFT ownership' }, { status: 403 });
    }

    return NextResponse.json({ authorized: true });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}