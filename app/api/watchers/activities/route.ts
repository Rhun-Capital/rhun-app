// app/api/watchers/activities/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamoDb = DynamoDBDocumentClient.from(client);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const activityTypes = searchParams.getAll('activityTypes');
    const platform = searchParams.get('platform');
    const specificToken = searchParams.get('specificToken');
    const minAmount = parseFloat(searchParams.get('minAmount') || '0');

    const queryString = `activityTypes=${activityTypes}&platform=${platform}&specificToken=${specificToken}&minAmount=${minAmount}`;

    if (!walletAddress || !userId) {
      return NextResponse.json(
        { error: 'Wallet address and user ID are required' },
        { status: 400 }
      );
    }

    // Query activities for the wallet
    const queryCommand = new QueryCommand({
      TableName: 'SolanaMonitoring',
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `ACTIVITY#${walletAddress}#${queryString}`
      },
      Limit: pageSize,
      ScanIndexForward: false, // Get newest first
      // If this isn't the first page, start from the last evaluated key
      ...(searchParams.get('lastKey') && {
        ExclusiveStartKey: JSON.parse(decodeURIComponent(searchParams.get('lastKey') || ''))
      })
    });

    const result = await dynamoDb.send(queryCommand);

    return NextResponse.json({
      activities: result.Items || [],
      lastKey: result.LastEvaluatedKey 
        ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
        : null
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}