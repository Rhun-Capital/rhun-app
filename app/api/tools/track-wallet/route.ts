// app/api/track-wallet/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { EventBridge } from '@aws-sdk/client-eventbridge';
import { Lambda } from '@aws-sdk/client-lambda';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, userId } = await request.json();

    if (!walletAddress || !userId) {
      return NextResponse.json(
        { error: 'Wallet address and user ID are required' },
        { status: 400 }
      );
    }

    // Initialize AWS clients
    const eventbridge = new EventBridge({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    const lambda = new Lambda({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    // Create a unique rule name with only allowed characters
    const sanitizedWallet = walletAddress.slice(0, 12).replace(/[^a-zA-Z0-9]/g, '');
    const ruleName = `wallet-track-${sanitizedWallet}`;

    // Create EventBridge rule (runs every hour)
    await eventbridge.putRule({
      Name: ruleName,
      ScheduleExpression: 'rate(1 hour)',
      State: 'ENABLED',
      Description: `Track wallet ${walletAddress} for user ${userId}`
    });

    // Set the Lambda function as the target
    await eventbridge.putTargets({
      Rule: ruleName,
      Targets: [{
        Id: ruleName,
        Arn: process.env.WALLET_TRACKER_LAMBDA_ARN!,
        Input: JSON.stringify({
          walletAddress,
          userId
        })
      }]
    });

    // Immediately invoke the Lambda function
    await lambda.invoke({
      FunctionName: process.env.WALLET_TRACKER_LAMBDA_ARN!,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        walletAddress,
        userId
      })
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error setting up wallet tracking:', error);
    return NextResponse.json(
      { error: 'Failed to set up wallet tracking' },
      { status: 500 }
    );
  }
}