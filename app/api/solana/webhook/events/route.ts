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

export async function GET() {
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
    const holderAddresses = [...new Set(sortedItems.map(item => item.holder_address))];
    const holderMappings: Record<string, any> = {};

    if (holderAddresses.length > 0) {
      // Query each holder address individually since DynamoDB doesn't support IN with multiple values
      const mappingPromises = holderAddresses.map(async (address) => {
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
            holderMappings[address] = {
              token_address: mapping.token_address,
              token_symbol: mapping.token_symbol,
              token_name: mapping.token_name,
              webhook_id: mapping.webhook_id
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
    const enrichedEvents = sortedItems.map(event => ({
      ...event,
      holder_mapping: holderMappings[event.holder_address] || null
    }));

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