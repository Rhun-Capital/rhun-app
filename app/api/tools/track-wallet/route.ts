import { NextResponse, NextRequest } from 'next/server';
import { EventBridge } from '@aws-sdk/client-eventbridge';
import { Lambda } from '@aws-sdk/client-lambda';
import crypto from 'crypto';

function createFilterHash(filters: TrackWalletRequest['filters'] = {}) {
  const normalizedFilters = {
    minAmount: filters.minAmount || 0,
    specificToken: filters.specificToken || '',
    activityTypes: (filters.activityTypes || ['ACTIVITY_TOKEN_SWAP', 'ACTIVITY_AGG_TOKEN_SWAP']).sort(),
    platform: (filters.platform || []).sort()
  };
  
  const filterString = JSON.stringify(normalizedFilters);
  // Create a shorter hash (6 characters should still provide enough uniqueness)
  return crypto.createHash('sha256').update(filterString).digest('hex').slice(0, 6);
}

function createRuleName(userId: string, walletAddress: string, filterHash: string) {
  // Take only the last part of the Privy ID after the last colon
  const shortUserId = userId.split(':').pop() || userId;
  // Take first 8 chars of wallet address
  const shortWallet = walletAddress.slice(0, 8);
  // Combine with filter hash and ensure only valid characters
  const ruleName = `wt-${shortUserId}-${shortWallet}-${filterHash}`
    .toLowerCase()
    .replace(/[^a-z0-9\-_\.]/g, ''); // Remove any invalid characters

  // Ensure we don't exceed 64 chars
  return ruleName.slice(0, 64);
}

interface TrackWalletRequest {
  walletAddress: string;
  userId: string;
  filters?: {
    minAmount?: number;
    specificToken?: string;
    platform?: string[];
    activityTypes?: Array<
      | 'ACTIVITY_TOKEN_SWAP'
      | 'ACTIVITY_AGG_TOKEN_SWAP'
      | 'ACTIVITY_TOKEN_ADD_LIQ'
      | 'ACTIVITY_TOKEN_REMOVE_LIQ'
      | 'ACTIVITY_SPL_TOKEN_STAKE'
      | 'ACTIVITY_SPL_TOKEN_UNSTAKE'
    >;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, userId, filters = {} }: TrackWalletRequest = await request.json();

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

    // Create a unique rule name
    const filterHash = createFilterHash(filters);
    const ruleName = createRuleName(userId, walletAddress, filterHash);

    // Create EventBridge rule
    await eventbridge.putRule({
      Name: ruleName,
      ScheduleExpression: 'rate(1 hour)',
      State: 'ENABLED',
      Description: `Track wallet ${walletAddress} for user ${userId}`
    });

    // Prepare Lambda input with filters
    const lambdaInput = {
      walletAddress,
      userId,
      // Default to swap activities if not specified
      activityTypes: filters.activityTypes || ['ACTIVITY_TOKEN_SWAP', 'ACTIVITY_AGG_TOKEN_SWAP'],
      // Add optional filters if they exist
      ...(filters.minAmount && { minAmount: filters.minAmount }),
      ...(filters.specificToken && { specificToken: filters.specificToken }),
      ...(filters.platform && { platform: filters.platform })
    };

    // Set Lambda as target with filters
    await eventbridge.putTargets({
      Rule: ruleName,
      Targets: [{
        Id: ruleName,
        Arn: process.env.WALLET_TRACKER_LAMBDA_ARN!,
        Input: JSON.stringify(lambdaInput)
      }]
    });

    // Immediately invoke Lambda with filters
    await lambda.invoke({
      FunctionName: process.env.WALLET_TRACKER_LAMBDA_ARN!,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(lambdaInput)
    });

    return NextResponse.json({ 
      success: true,
      filters: lambdaInput 
    });

  } catch (error) {
    console.error('Error setting up wallet tracking:', error);
    return NextResponse.json(
      { error: 'Failed to set up wallet tracking' },
      { status: 500 }
    );
  }
}