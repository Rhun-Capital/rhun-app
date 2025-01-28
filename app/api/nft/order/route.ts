import { NextResponse, NextRequest } from 'next/server';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient({
 region: process.env.AWS_REGION,
 credentials: {
   accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
 }
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { order, userId } = body;

        if (!order) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        const params = {
            TableName: 'NFTOrders',
            Item: {
                order,
                userId
            },
        };

        await dynamodb.put(params).promise();

        return NextResponse.json({ message: 'Order ID saved successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error saving Order ID:', error);
        return NextResponse.json(
            { error: 'Failed to save Order ID' },
            { status: 500 }
        );
    }
}
