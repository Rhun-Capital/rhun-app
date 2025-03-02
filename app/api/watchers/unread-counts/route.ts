// app/api/watchers/unread-counts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamoDb = DynamoDBDocumentClient.from(client);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { message: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Get all watchers for this user
    const watchersResponse = await dynamoDb.send(new QueryCommand({
      TableName: 'SolanaMonitoring',
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'WATCHER#'
      }
    }));

    const watchers = watchersResponse.Items || [];
    
    // For each watcher, check if there are unread activities
    const watcherUnreadCounts = await Promise.all(
      watchers.map(async (watcher) => {
        // Extract the queryString from the watcher sk
        const watcherParts = watcher.sk.split('#');
        const walletAddress = watcherParts[1];
        const queryString = watcherParts.slice(2).join('#');
        
        // Get the read status for this watcher
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
        
        // Get the most recent activity for this watcher
        const activitiesResponse = await dynamoDb.send(new QueryCommand({
          TableName: 'SolanaMonitoring',
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':sk': `ACTIVITY#${walletAddress}#${queryString}`
          },
          ScanIndexForward: false, // Most recent first
          Limit: 1
        }));
        
        const mostRecentActivity = activitiesResponse.Items?.[0];
        
        // If there's a recent activity and it's newer than last read, this watcher has unread activities
        const hasUnread = mostRecentActivity && 
        (typeof mostRecentActivity.timestamp === 'string' 
          ? new Date(mostRecentActivity.timestamp).getTime() > lastReadTimestamp
          : mostRecentActivity.timestamp > lastReadTimestamp);
        
        return {
          walletAddress,
          queryString,
          hasUnread,
          watcher: {
            ...watcher,
            lastReadTimestamp
          }
        };
      })
    );
    
    // Count the watchers with unread activities
    const totalUnreadWatchers = watcherUnreadCounts.filter(w => w.hasUnread).length;
    
    // Return the data needed for UI display
    return NextResponse.json({
      unreadCount: totalUnreadWatchers,
      watcherDetails: watcherUnreadCounts.map(w => ({
        walletAddress: w.walletAddress,
        queryString: w.queryString,
        hasUnread: w.hasUnread,
        lastReadTimestamp: w.watcher.lastReadTimestamp
      }))
    });
  } catch (error) {
    console.error('Error getting unread counts:', error);
    return NextResponse.json(
      { message: 'Failed to get unread counts' },
      { status: 500 }
    );
  }
}