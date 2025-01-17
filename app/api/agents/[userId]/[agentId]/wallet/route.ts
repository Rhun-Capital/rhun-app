

import { NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function PUT(
  request: Request,
  { params }: { params: { userId: string, agentId: string } }
) {
  try {
    const body = await request.json();
    
    const result = await dynamodb.update({
      TableName: 'Agents',
      Key: {
        id: params.agentId,
        userId: params.userId
      },
      UpdateExpression: `SET 
        wallets = :wallets,
        updatedAt = :updatedAt`,
      
      ExpressionAttributeValues: {
        ':wallets': body.wallets,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }).promise();

    return NextResponse.json({
      message: 'Agent wallets updated successfully',
      agent: result.Attributes
    });

  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent wallets' },
      { status: 500 }
    );
  }
}