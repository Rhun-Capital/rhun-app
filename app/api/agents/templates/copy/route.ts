// app/api/agents/copy-template/route.ts
import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const dynamoDB = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

export async function POST(request: Request) {
  try {
    const { templateId, userId } = await request.json();

    if (!templateId || !userId) {
      return NextResponse.json(
        { error: 'templateId and userId are required' },
        { status: 400 }
      );
    }

    // Get the template agent
    const getParams = {
      TableName: 'Agents',
      Key: {
        userId: 'template',
        id: templateId
      }
    };

    const { Item: templateAgent } = await dynamoDB.get(getParams).promise();

    if (!templateAgent) {
      return NextResponse.json(
        { error: 'Template agent not found' },
        { status: 404 }
      );
    }

    // Create a new agent for the user based on the template
    const newAgent = {
      ...templateAgent,
      id: uuidv4(), // Generate a new ID for the copy
      userId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFromTemplate: templateId // Track which template it was created from
    };

    const putParams = {
      TableName: 'Agents',
      Item: newAgent
    };

    await dynamoDB.put(putParams).promise();

    return NextResponse.json({
      success: true,
      agent: newAgent
    });

  } catch (error) {
    console.error('Error copying template agent:', error);
    return NextResponse.json(
      { error: 'Failed to copy template agent' },
      { status: 500 }
    );
  }
}