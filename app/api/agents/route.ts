import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const agentData = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...body
    };

    await dynamodb.put({
      TableName: 'Agents',
      Item: agentData
    }).promise();

    return NextResponse.json({
      message: 'Agent created successfully',
      agentId: agentData.id
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }

}
