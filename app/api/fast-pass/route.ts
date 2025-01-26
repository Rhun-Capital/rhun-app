import { DynamoDB } from 'aws-sdk';
import { NextResponse } from 'next/server';

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function POST(request: Request) {
  try {
    const { id, order } = await request.json();

    await dynamodb.put({
      TableName: process.env.DYNAMODB_TABLE_NAME!,
      Item: {
        id,
        order,
        createdAt: new Date().toISOString(),
      },
    }).promise();

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error saving to DynamoDB:", error);
    return NextResponse.json({ error: "Failed to save order" }, { status: 500 });
  }
}