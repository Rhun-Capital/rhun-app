import { DynamoDB } from 'aws-sdk';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export async function POST(request: Request) {
  try {
    const { id, order } = await request.json();

    // Verify order with Crossmint
    const response = await fetch(`https://api.crossmint.com/api/v1-alpha1/orders/${order.id}`, {
      headers: {
        'x-api-key': process.env.CROSSMINT_API_KEY as string
      }
    });
    
    const orderData = await response.json();
    if (!orderData.buyer?.walletAddress) {
      return NextResponse.json({ error: "Invalid order" }, { status: 400 });
    }

    await dynamodb.put({
      TableName: 'FastPassOrders',
      Item: {
        id,
        order,
        walletAddress: orderData.buyer.walletAddress,
        createdAt: new Date().toISOString(),
      },
    }).promise();

    cookies().set('crossmint_order_id', order.id, {
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error saving to DynamoDB:", error);
    return NextResponse.json({ error: "Failed to save order" }, { status: 500 });
  }
}