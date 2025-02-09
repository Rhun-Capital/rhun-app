// app/api/token-subscription/route.ts
import { NextResponse } from 'next/server';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

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
