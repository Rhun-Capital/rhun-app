import { NextRequest, NextResponse } from 'next/server';
import { DynamoDB } from 'aws-sdk';
const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function GET(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const agent = await getAgent('template', params.agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return NextResponse.json(agent);
  } catch (error) {
    console.error('Error getting agent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 

async function getAgent(userId: string, agentId: string) {
  try {
    const result = await dynamodb.get({
      TableName: 'Agents',
      Key: {
        id: agentId,
        userId: userId
      }
    }).promise();

    return result.Item || null;
  } catch (error) {
    console.error('Error getting agent:', error);
    return null;
  }
}