import { NextResponse, NextRequest } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

// Use AWS SDK V3 credential chain
const client = new DynamoDBClient({
  region: process.env.AWS_REGION
});
const dynamoDb = DynamoDBDocumentClient.from(client);

// GET /api/watchers - List all watchers for a user
export async function GET(request: NextRequest) {
  try {
    // Extract userId from query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    console.log(userId)
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Query DynamoDB for all watchers
    const watchersCommand = new QueryCommand({
      TableName: "SolanaMonitoring",
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'WATCHER#'
      }
    });
    
    const watchersResult = await dynamoDb.send(watchersCommand);
    const watchers = watchersResult.Items || [];
    
    const watchersWithData = await Promise.all(watchers.map(async (watcher) => {
      // Fetch latest balance data point
      const latestDataPointCommand = new QueryCommand({
        TableName: "SolanaMonitoring",
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': `WALLET#${watcher.walletAddress}#`
        },
        Limit: 1,
        ScanIndexForward: false // Get most recent first
      });
      
      const dataPointsResult = await dynamoDb.send(latestDataPointCommand);
      const latestDataPoint = dataPointsResult.Items?.[0];

      // Fetch latest activity
      const latestActivityCommand = new QueryCommand({
        TableName: "SolanaMonitoring",
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': `ACTIVITY#${watcher.walletAddress}#`
        },
        Limit: 10,
        ScanIndexForward: false // Get most recent first
      });
      
      const activityResult = await dynamoDb.send(latestActivityCommand);
      const lastActivity = activityResult.Items;

      return {
        ...watcher,
        lastDataPoint: latestDataPoint ? {
          solBalance: latestDataPoint.lamports / 1e9,
          timestamp: latestDataPoint.timestamp,
        } : undefined,
        lastActivity
      };
    }));
    
    return NextResponse.json({ watchers: watchersWithData });
  } catch (error) {
    console.error('Error fetching watchers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watchers' },
      { status: 500 }
    );
  }
}