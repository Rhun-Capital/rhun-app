// app/api/subscription/token-subscription/route.ts
import { NextResponse } from 'next/server';
import { DynamoDBClient, PutItemCommand, QueryCommand, QueryCommandInput } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// Create a DynamoDB client.
// Ensure your AWS_REGION and credentials are configured in your environment.
const client = new DynamoDBClient({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    },
    region: process.env.AWS_REGION
  });

interface ConfirmedTx {
  tx_hash: string;
  slot: number;
  fee: number;
  status: string;
  block_time: number;
  signer: string[];
  parsed_instructions: any[];
  program_ids: string[];
  time: string; // ISO string (or any string representation of the time)
  calculatedTokenAmount: number;
}

export async function GET(request: Request, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;

    // Prepare the DynamoDB query parameters
    const queryParams: QueryCommandInput = {
      TableName: 'TokenSubscriptions',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': { S: userId }
      },
      // Optional: limit to the most recent subscription if needed
      Limit: 1,
      // Sort in descending order to get the most recent subscription first
      ScanIndexForward: false
    };

    // Execute the query
    const command = new QueryCommand(queryParams);
    const response = await client.send(command);

    // If no items found, return null
    if (!response.Items || response.Items.length === 0) {
      return NextResponse.json(null);
    }

    // Unmarshall the DynamoDB item to a more readable format
    const tokenSubscription = unmarshall(response.Items[0]);

    // Parse stringified JSON fields
    return NextResponse.json({
      ...tokenSubscription,
      signer: JSON.parse(tokenSubscription.signer),
      parsedInstructions: JSON.parse(tokenSubscription.parsedInstructions),
      programIds: JSON.parse(tokenSubscription.programIds)
    });
  } catch (error: any) {
    console.error('Error retrieving token subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;
    const confirmedTx: ConfirmedTx = await request.json();

    // Basic validation: ensure required fields exist
    if (!confirmedTx.tx_hash || confirmedTx.slot == null) {
      return NextResponse.json(
        { error: 'Missing required transaction fields' },
        { status: 400 }
      );
    }

    // Prepare the DynamoDB item.
    const dynamoParams = {
      TableName: 'TokenSubscriptions',
      Item: {
        userId: { S: userId },
        txHash: { S: confirmedTx.tx_hash },
        slot: { N: confirmedTx.slot.toString() },
        fee: { N: confirmedTx.fee.toString() },
        status: { S: confirmedTx.status },
        blockTime: { N: confirmedTx.block_time.toString() },
        signer: { S: JSON.stringify(confirmedTx.signer) },
        parsedInstructions: { S: JSON.stringify(confirmedTx.parsed_instructions) },
        programIds: { S: JSON.stringify(confirmedTx.program_ids) },
        time: { S: confirmedTx.time },
        calculatedTokenAmount: { N: confirmedTx.calculatedTokenAmount.toString() }
      },
    };

    const command = new PutItemCommand(dynamoParams);
    await client.send(command);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error storing confirmed transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

