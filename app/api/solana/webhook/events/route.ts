import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { HOLDERS_ACTIVITY_TABLE_NAME, TOKEN_HOLDERS_MAPPING_TABLE_NAME } from '@/utils/aws-config';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

export const dynamic = 'force-dynamic';

// Helper function to ensure address is a string
function normalizeAddress(address: any): string | null {
  if (typeof address === 'string') {
    return address;
  }
  if (typeof address === 'object' && address !== null) {
    // Try to extract a string property if possible
    if (typeof address.address === 'string') return address.address;
    if (typeof address.toBase58 === 'function') return address.toBase58();
    // Otherwise, try JSON.stringify as a last resort
    try {
      return JSON.stringify(address);
    } catch {
      return null;
    }
  }
  return null;
}

// Helper function to get timestamp for 24 hours ago
function get24HoursAgoTimestamp(): number {
  // Use seconds since epoch, not milliseconds
  return Math.floor(Date.now() / 1000) - (24 * 60 * 60);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');

  if (type === 'whale-leaderboard') {
    return getWhaleLeaderboard();
  }

  return getRecentEvents();
}

async function getWhaleLeaderboard() {
  try {
    const twentyFourHoursAgo = get24HoursAgoTimestamp();

    // Get all events from the last 24 hours
    const eventsResponse = await docClient.send(
      new ScanCommand({
        TableName: HOLDERS_ACTIVITY_TABLE_NAME,
        FilterExpression: '#ts >= :timestamp',
        ExpressionAttributeNames: { '#ts': 'timestamp' },
        ExpressionAttributeValues: {
          ':timestamp': twentyFourHoursAgo
        }
      })
    );

    // Aggregate trades by holder address
    const whaleActivity: Record<string, {
      totalTrades: number;
      holder_address: string;
      last_trade_timestamp: number;
    }> = {};

    (eventsResponse.Items || []).forEach(event => {
      const normalizedAddress = normalizeAddress(event.holder_address);
      if (!normalizedAddress) return;

      if (!whaleActivity[normalizedAddress]) {
        whaleActivity[normalizedAddress] = {
          totalTrades: 0,
          holder_address: normalizedAddress,
          last_trade_timestamp: event.timestamp
        };
      }

      whaleActivity[normalizedAddress].totalTrades++;
      whaleActivity[normalizedAddress].last_trade_timestamp = Math.max(
        whaleActivity[normalizedAddress].last_trade_timestamp,
        event.timestamp
      );
    });

    // Convert to array and sort by total trades
    const whaleLeaderboard = Object.values(whaleActivity)
      .sort((a, b) => b.totalTrades - a.totalTrades)
      .slice(0, 10); // Get top 10 whales

    // Get token holder mappings for the top whales
    const holderMappings: Record<string, any> = {};
    const mappingPromises = whaleLeaderboard.map(async (whale) => {
      try {
        const response = await docClient.send(
          new QueryCommand({
            TableName: TOKEN_HOLDERS_MAPPING_TABLE_NAME,
            KeyConditionExpression: 'holder_address = :address',
            ExpressionAttributeValues: {
              ':address': whale.holder_address
            }
          })
        );
        if (response.Items && response.Items.length > 0) {
          const mapping = response.Items[0];
          holderMappings[whale.holder_address] = {
            token_address: mapping.token_address,
            token_symbol: mapping.token_symbol,
            token_name: mapping.token_name,
            webhook_id: mapping.webhook_id,
            token_logo_uri: mapping.token_logo_uri,
            token_decimals: mapping.token_decimals
          };
        }
      } catch (error) {
        console.error(`Error fetching mapping for address ${whale.holder_address}:`, error);
      }
    });

    await Promise.all(mappingPromises);

    // Enrich whale data with token holder mapping info
    const enrichedWhales = whaleLeaderboard.map(whale => ({
      ...whale,
      holder_mapping: holderMappings[whale.holder_address] || null
    }));

    return NextResponse.json({
      whales: enrichedWhales,
      count: enrichedWhales.length,
      timeRange: '24h'
    });
  } catch (error: any) {
    console.error('Error fetching whale leaderboard:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch whale leaderboard' },
      { status: 500 }
    );
  }
}

async function getRecentEvents() {
  try {
    // Get events from holders activity table
    const eventsResponse = await docClient.send(
      new ScanCommand({
        TableName: HOLDERS_ACTIVITY_TABLE_NAME,
        Limit: 50 // Get the 50 most recent events
      })
    );

    // Sort items by timestamp in descending order
    const sortedItems = (eventsResponse.Items || []).sort((a, b) => 
      (b.timestamp || 0) - (a.timestamp || 0)
    );


    // Get token holder mappings for all holder addresses in the events
    const holderAddresses = [...new Set(sortedItems.map(item => {
      const normalizedAddress = normalizeAddress(item.holder_address);
      if (!normalizedAddress) {
        console.error('Invalid holder address format:', item.holder_address);
        return null;
      }
      return normalizedAddress;
    }).filter(Boolean))];

    const holderMappings: Record<string, any> = {};

    if (holderAddresses.length > 0) {
      // Query each holder address individually since DynamoDB doesn't support IN with multiple values
      const mappingPromises = holderAddresses.map(async (address) => {
        if (!address) return; // Skip if address is null
        
        try {
          const response = await docClient.send(
            new QueryCommand({
              TableName: TOKEN_HOLDERS_MAPPING_TABLE_NAME,
              KeyConditionExpression: 'holder_address = :address',
              ExpressionAttributeValues: {
                ':address': address
              }
            })
          );
          if (response.Items && response.Items.length > 0) {
            const mapping = response.Items[0];
            console.log('mapping', mapping);
            holderMappings[address] = {
              token_address: mapping.token_address,
              token_symbol: mapping.token_symbol,
              token_name: mapping.token_name,
              webhook_id: mapping.webhook_id,
              token_logo_uri: mapping.token_logo_uri,
              token_decimals: mapping.token_decimals
            };
          }
        } catch (error) {
          console.error(`Error fetching mapping for address ${address}:`, error);
        }
      });

      // Wait for all queries to complete
      await Promise.all(mappingPromises);
    }

    // Enrich events with token holder mapping info
    const enrichedEvents = sortedItems.map(event => {
      const normalizedAddress = normalizeAddress(event.holder_address);
      return {
        ...event,
        holder_mapping: normalizedAddress ? holderMappings[normalizedAddress] || null : null
      };
    });

    return NextResponse.json({
      events: enrichedEvents,
      count: enrichedEvents.length
    });
  } catch (error: any) {
    console.error('Error fetching webhook events:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch webhook events' },
      { status: 500 }
    );
  }
} 