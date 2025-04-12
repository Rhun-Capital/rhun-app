// app/api/agents/route.ts
import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { uploadToS3 } from '@/utils/s3';

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as Blob | null;
    const agentData = JSON.parse(formData.get('data') as string);
    
    const agentId = uuidv4();
    let imageUrl = '';

    if (image) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const key = `agents/${agentId}/profile.jpg`;
      imageUrl = await uploadToS3(buffer, key);
    }

    const finalAgentData = {
      id: agentId,
      imageUrl,
      timestamp: new Date().toISOString(),
      ...agentData
    };

    await dynamodb.put({
      TableName: 'Agents',
      Item: finalAgentData
    }).promise();

    return NextResponse.json({
      message: 'Agent created successfully',
      agentId: finalAgentData.id,
      imageUrl: finalAgentData.imageUrl
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}

