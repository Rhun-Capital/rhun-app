// app/api/auth/webhooks/route.ts
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// Ensure we're using raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia'
});

const client = new DynamoDBClient({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  },
  region: process.env.AWS_REGION
});

const docClient = DynamoDBDocumentClient.from(client);

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    console.log('Received webhook - Body length:', rawBody.length);
    console.log('Stripe signature:', signature);

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature header' },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('Missing STRIPE_WEBHOOK_SECRET');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      const error = err as Error;
      console.error('⚠️ Webhook signature verification failed:', error.message);
      console.log('Raw body:', rawBody);
      console.log('Signature:', signature);
      console.log('Secret starts with:', process.env.STRIPE_WEBHOOK_SECRET.slice(0, 6));
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.log('✓ Webhook signature verified');
    console.log('Processing event type:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        
        if (!userId) {
          console.error('No userId found in session');
          return NextResponse.json(
            { error: 'No userId found' },
            { status: 400 }
          );
        }

        await docClient.send(new PutCommand({
          TableName: "Subscriptions",
          Item: {
            userId: userId,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            email: session.customer_details?.email,
            planId: session.metadata?.planId,
          }
        }));

        console.log('✓ Subscription created for user:', userId);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        await docClient.send(new PutCommand({
          TableName: "Subscriptions",
          Item: {
            userId: subscription.metadata.userId,
            stripeCustomerId: subscription.customer,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            updatedAt: new Date().toISOString(),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
          }
        }));

        console.log('✓ Subscription updated:', subscription.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        await docClient.send(new PutCommand({
          TableName: "Subscriptions",
          Item: {
            userId: subscription.metadata.userId,
            stripeCustomerId: subscription.customer,
            stripeSubscriptionId: subscription.id,
            status: 'canceled',
            updatedAt: new Date().toISOString(),
            canceledAt: new Date().toISOString()
          }
        }));

        console.log('✓ Subscription canceled:', subscription.id);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook handler failed' },
      { status: 500 }
    );
  }
}