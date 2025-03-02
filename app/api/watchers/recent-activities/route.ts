// app/api/watchers/recent-activities/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamoDb = DynamoDBDocumentClient.from(client);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const walletAddress = searchParams.get('walletAddress');
    const queryString = searchParams.get('queryString');
    const limit = searchParams.get('limit') || '10';

    if (!userId || !walletAddress || !queryString) {
      return NextResponse.json(
        { message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get the read status
    const readStatusResponse = await dynamoDb.send(new QueryCommand({
      TableName: 'SolanaMonitoring',
      KeyConditionExpression: 'pk = :pk AND sk = :sk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `READSTATUS#${walletAddress}#${queryString}`
      }
    }));
    
    const readStatus = readStatusResponse.Items?.[0];
    const lastReadTimestamp = readStatus?.lastReadTimestamp || 0;
    
    // Get recent activities
    const activitiesResponse = await dynamoDb.send(new QueryCommand({
      TableName: 'SolanaMonitoring',
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `ACTIVITY#${walletAddress}#${queryString}`
      },
      ScanIndexForward: false, // Most recent first
      Limit: Number(limit)
    }));
    
    const activities = activitiesResponse.Items || [];
    
    // Mark each activity as read or unread
    const activitiesWithReadStatus = activities.map(activity => ({
      ...activity,
      isUnread: activity.timestamp > lastReadTimestamp
    }));
    
    return NextResponse.json({ 
      activities: activitiesWithReadStatus,
      lastReadTimestamp
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return NextResponse.json(
      { message: 'Failed to fetch recent activities' },
      { status: 500 }
    );
  }
}