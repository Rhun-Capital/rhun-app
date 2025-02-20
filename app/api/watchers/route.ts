import { NextResponse, NextRequest } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridge, ResourceNotFoundException } from '@aws-sdk/client-eventbridge';
import crypto from 'crypto';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION
});
const dynamoDb = DynamoDBDocumentClient.from(client);
const eventbridge = new EventBridge({
  region: process.env.AWS_REGION
});

interface UpdateMetadataRequest {
  name?: string | null;
  tags?: string[] | null;
}

function createFilterHash(filters: any = {}) {
  const normalizedFilters = {
    minAmount: filters.minAmount || 0,
    specificToken: filters.specificToken || '',
    activityTypes: (filters.activityTypes || ['ACTIVITY_TOKEN_SWAP', 'ACTIVITY_AGG_TOKEN_SWAP']).sort(),
    platform: (filters.platform || []).sort()
  };
  
  const filterString = JSON.stringify(normalizedFilters);
  return crypto.createHash('sha256').update(filterString).digest('hex').slice(0, 6);
}

function createRuleName(userId: string, walletAddress: string, filterHash: string) {
  const shortUserId = userId.split(':').pop() || userId;
  const shortWallet = walletAddress.slice(0, 8);
  const ruleName = `wt-${shortUserId}-${shortWallet}-${filterHash}`
    .toLowerCase()
    .replace(/[^a-z0-9\-_\.]/g, '');
  
  return ruleName.slice(0, 64);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
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

      // Fetch latest activities
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
      const activities = activityResult.Items || [];

      // Create a properly structured lastActivity wrapper
      const lastActivity = activities.length > 0 ? [{
        metadata: {
          tokens: activities.reduce((acc, activity) => {
            // Extract token metadata from routers
            const router = activity.routers;
            if (router) {
              // Token 1
              if (router.token1) {
                acc[router.token1] = {
                  token_address: router.token1,
                  token_name: 'Unknown', // You might want to fetch this from somewhere
                  token_symbol: 'Unknown',
                  token_icon: '' // You might want to fetch this from somewhere
                };
              }
              // Token 2
              if (router.token2) {
                acc[router.token2] = {
                  token_address: router.token2,
                  token_name: 'Unknown',
                  token_symbol: 'Unknown',
                  token_icon: ''
                };
              }
            }
            return acc;
          }, {})
        },
        latestActivity: activities.map(activity => ({
          block_time: activity.block_time,
          activity_type: activity.type || 'ACTIVITY_TOKEN_SWAP',
          trans_id: activity.transactionId,
          time: activity.timestamp,
          from_address: activity.fromAddress,
          to_address: activity.toAddress,
          value: activity.value || 0,
          routers: activity.routers,
          platform: activity.platform,
          sources: activity.sources || []
        })),
        userId,
        timestamp: activities[0].timestamp,
        sk: activities[0].sk,
        pk: activities[0].pk,
        walletAddress: watcher.walletAddress,
        type: 'activityWrapper'
      }] : [];

      return {
        walletAddress: watcher.walletAddress,
        ...watcher,
        lastDataPoint: latestDataPoint ? {
          solBalance: latestDataPoint.lamports / 1e9,
          timestamp: latestDataPoint.timestamp,
        } : undefined,
        lastActivity
      };
    }));
    
      watchersWithData.map(w => ({
        address: w.walletAddress,
        activityCount: w.lastActivity?.[0]?.latestActivity?.length || 0
      }))
    

    return NextResponse.json({ watchers: watchersWithData });
  } catch (error) {
    console.error('Error fetching watchers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watchers' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const walletAddress = searchParams.get('walletAddress');
    const queryString = searchParams.get('queryString');
    
    if (!userId || !walletAddress) {
      return NextResponse.json({ error: 'User ID and wallet address are required' }, { status: 400 });
    }

    if (!queryString) {
      return NextResponse.json({ error: 'Query string is required' }, { status: 400 });
    }

    // Parse queryString back into filters object
    const filters = queryString.split('&').reduce((acc: any, param) => {
      const [key, value] = param.split('=');
      if (key === 'activityTypes') {
        acc[key] = value.split(',');
      } else if (key === 'minAmount') {
        acc[key] = parseFloat(value);
      } else if (key === 'specificToken') {
        acc[key] = value === 'null' ? null : value;
      } else if (key === 'platform') {
        acc[key] = value ? value.split(',') : [];
      }
      return acc;
    }, {});

    // Create rule name using the same format as in creation
    const filterHash = createFilterHash(filters);
    const ruleName = createRuleName(userId, walletAddress, filterHash);

    // Delete EventBridge rule and its targets
    try {
      await eventbridge.removeTargets({
        Rule: ruleName,
        Ids: [ruleName]
      });

      await eventbridge.deleteRule({
        Name: ruleName
      });
    } catch (error) {
      if (!(error instanceof ResourceNotFoundException)) {
        console.error('Error deleting EventBridge rule:', error);
      }
    }

    // Delete watcher record from DynamoDB
    const deleteWatcherCommand = new DeleteCommand({
      TableName: "SolanaMonitoring",
      Key: {
        pk: `USER#${userId}`,
        sk: `WATCHER#${walletAddress}#${decodeURIComponent(queryString)}`
      }
    });

    await dynamoDb.send(deleteWatcherCommand);


    /// Delete activities associated with this watcher
    const deleteActivitiesCommand = new QueryCommand({
      TableName: "SolanaMonitoring",
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `ACTIVITY#${walletAddress}#${decodeURIComponent(queryString)}#`
      }
    });

    const activitiesResult = await dynamoDb.send(deleteActivitiesCommand);

    // Delete all found activities
    const deletePromises = (activitiesResult.Items || []).map(item => 
      dynamoDb.send(new DeleteCommand({
        TableName: "SolanaMonitoring",
        Key: {
          pk: item.pk,
          sk: item.sk
        }
      }))
    );

    // Delete summary records if they exist
    const deleteSummaryCommand = new QueryCommand({
      TableName: "SolanaMonitoring",
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `SUMMARY#${walletAddress}#${decodeURIComponent(queryString)}`
      }
    });

    const summaryResult = await dynamoDb.send(deleteSummaryCommand);
    await Promise.all(deletePromises);
    // Add summary deletes to our promises
    deletePromises.push(
      ...(summaryResult.Items || []).map(item => 
        dynamoDb.send(new DeleteCommand({
          TableName: "SolanaMonitoring",
          Key: {
            pk: item.pk,
            sk: item.sk
          }
        }))
      )
    );

    await Promise.all(deletePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting watcher:', error);
    return NextResponse.json(
      { error: 'Failed to delete watcher' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization token' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const walletAddress = searchParams.get('walletAddress');
    const queryString = searchParams.get('queryString');
    
    if (!userId || !walletAddress) {
      return NextResponse.json(
        { error: 'User ID and wallet address are required' },
        { status: 400 }
      );
    }

    const { name, tags }: UpdateMetadataRequest = await request.json();
    console.log(`Updating watcher for userId=${userId}, walletAddress=${walletAddress}, queryString=${queryString}`);
    console.log(`Update payload:`, { name, tags });

    // First, try to find the watcher regardless of the approach
    let watcherKey;
    let existingWatcher;
    
    // Option 1: Try to find with exact queryString if provided
    if (queryString) {
      const exactQueryCommand = new QueryCommand({
        TableName: process.env.DYNAMODB_TABLE || "SolanaMonitoring",
        KeyConditionExpression: 'pk = :pk AND sk = :sk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': `WATCHER#${walletAddress}#${decodeURIComponent(queryString)}`
        }
      });
      
      console.log('Trying to find watcher with exact query string...');
      const exactResult = await dynamoDb.send(exactQueryCommand);
      
      if (exactResult.Items && exactResult.Items.length > 0) {
        console.log('Found watcher with exact query string');
        existingWatcher = exactResult.Items[0];
        watcherKey = {
          pk: existingWatcher.pk,
          sk: existingWatcher.sk
        };
      }
    }
    
    // Option 2: If not found with exact query, try prefix search
    if (!existingWatcher) {
      const prefixCommand = new QueryCommand({
        TableName: process.env.DYNAMODB_TABLE || "SolanaMonitoring",
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': `WATCHER#${walletAddress}#`
        },
        Limit: 10 // Get multiple results to better understand what's available
      });
      
      console.log('Trying to find watcher with prefix search...');
      const prefixResult = await dynamoDb.send(prefixCommand);
      
      if (prefixResult.Items && prefixResult.Items.length > 0) {
        console.log(`Found ${prefixResult.Items.length} watchers with prefix search`);
        console.log('Available watcher SKs:', prefixResult.Items.map(item => item.sk));
        
        // Use the first one if multiple found
        existingWatcher = prefixResult.Items[0];
        watcherKey = {
          pk: existingWatcher.pk,
          sk: existingWatcher.sk
        };
      }
    }
    
    // If still not found, return 404
    if (!existingWatcher) {
      console.log('No watcher found for the given parameters');
      return NextResponse.json(
        { error: 'Watcher not found' },
        { status: 404 }
      );
    }
    
    console.log('Found watcher:', { pk: existingWatcher.pk, sk: existingWatcher.sk });
    
    // Handle the update - only update the specific fields requested
    // Use a simple update expression for those specific fields only
    const updateExpressionParts = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    if (name !== undefined) {
      updateExpressionParts.push("#n = :name");
      expressionAttributeNames["#n"] = "name";
      expressionAttributeValues[":name"] = name === null ? null : name;
    }
    
    if (tags !== undefined) {
      updateExpressionParts.push("#t = :tags");
      expressionAttributeNames["#t"] = "tags";
      expressionAttributeValues[":tags"] = tags === null ? null : tags;
    }
    
    // If nothing to update, return early
    if (updateExpressionParts.length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    const updateExpression = "set " + updateExpressionParts.join(", ");
    console.log('Update expression:', updateExpression);
    console.log('Expression attribute names:', expressionAttributeNames);
    console.log('Expression attribute values:', expressionAttributeValues);

    // Update the watcher
    const updateCommand = new UpdateCommand({
      TableName: process.env.DYNAMODB_TABLE || "SolanaMonitoring",
      Key: watcherKey,
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW"
    });
    
    const updatedWatcher = await dynamoDb.send(updateCommand);
    
    return NextResponse.json({
      success: true,
      watcher: updatedWatcher.Attributes
    });
  } catch (error) {
    console.error('Error updating watcher metadata:', error);
    return NextResponse.json(
      { error: `Failed to update watcher metadata: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
