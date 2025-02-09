import { NextRequest, NextResponse } from 'next/server';
import { getSubscription } from '@/utils/subscriptions';


// GET handler to retrieve user subscription
export async function GET(
  request: NextRequest, 
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    // Validate userId
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' }, 
        { status: 400 }
      );
    }

    // Fetch subscription
    const subscription = await getSubscription(userId);

    // Handle case where no subscription is found
    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found for this user' }, 
        { status: 404 }
      );
    }

    // Return subscription details
    return NextResponse.json(subscription, { status: 200 });
  } catch (error) {
    console.error('Error fetching subscription:', error);

    // Handle different types of errors
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Failed to retrieve subscription', 
          details: error.message 
        }, 
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unknown error occurred' }, 
      { status: 500 }
    );
  }
}