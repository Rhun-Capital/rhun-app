'use server'

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import Stripe from 'stripe';

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

interface TokenSubscription {
  userId: string;
  txHash: string;
  slot: number;
  fee: number;
  status: string;
  blockTime: number;
  signer: string[];
  parsedInstructions: any[];
  programIds: string[];
  time: string;
  calculatedTokenAmount: number;
}

interface SubscriptionDetails {
  stripe?: {
    customerId?: string;
    subscriptionId?: string;
    status: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
    amount: number;
    plan?: {
      name: string;
      id: string;
    };
  };
  token?: TokenSubscription;
  combinedStatus?: 'active' | 'inactive';
}

// Get both Stripe and Token subscriptions
export async function getSubscription(userId: string): Promise<SubscriptionDetails | null> {
  try {
    // Get Stripe subscription
    const stripeCommand = new GetCommand({
      TableName: "Subscriptions",
      Key: { userId }
    });
    
    // Get Token subscription
    const tokenCommand = new QueryCommand({
      TableName: "TokenSubscriptions",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId
      },
      Limit: 1,
      ScanIndexForward: false // Get most recent first
    });

    // Execute both queries in parallel
    const [stripeResponse, tokenResponse] = await Promise.all([
      docClient.send(stripeCommand),
      docClient.send(tokenCommand)
    ]);

    const stripeSubscription = stripeResponse.Item;
    const tokenSubscription = tokenResponse.Items?.[0];

    // If neither subscription exists, return null
    if (!stripeSubscription && !tokenSubscription) {
      return null;
    }

    // Determine combined status
    const isStripeActive = stripeSubscription?.status === 'active' && !stripeSubscription?.cancelAtPeriodEnd;
    const isTokenActive = tokenSubscription ? isTokenSubscriptionActive(tokenSubscription as TokenSubscription) : false;
    return {
      stripe: stripeSubscription ? {
        customerId: stripeSubscription.stripeCustomerId,
        subscriptionId: stripeSubscription.stripeSubscriptionId,
        status: stripeSubscription.status,
        currentPeriodEnd: stripeSubscription.currentPeriodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancelAtPeriodEnd,
        amount: stripeSubscription.amount,
        plan: stripeSubscription.planId
      } : undefined,
      token: tokenSubscription as TokenSubscription | undefined,
      combinedStatus: (isStripeActive || isTokenActive) ? 'active' : 'inactive'
    };
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    throw error;
  }
}

// Helper function to check if token subscription is active
function isTokenSubscriptionActive(subscription: TokenSubscription): boolean {
  const purchaseDate = new Date(subscription.blockTime * 1000);
  const expiryDate = new Date(purchaseDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  return new Date() < expiryDate;
}

// Update Stripe subscription
export async function updateSubscription(userId: string, data: any) {
  const command = new PutCommand({
    TableName: "Subscriptions",
    Item: {
      userId,
      ...data,
      updatedAt: new Date().toISOString()
    }
  });

  return docClient.send(command);
}

// Create or update token subscription
export async function updateTokenSubscription(userId: string, data: TokenSubscription) {
  const command = new PutCommand({
    TableName: "TokenSubscriptions",
    Item: {
      ...data,
      updatedAt: new Date().toISOString()
    }
  });

  return docClient.send(command);
}

// Get token subscription details
export async function getTokenSubscription(userId: string): Promise<TokenSubscription | null> {
  const command = new QueryCommand({
    TableName: "TokenSubscriptions",
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": userId
    },
    Limit: 1,
    ScanIndexForward: false
  });

  const response = await docClient.send(command);
  return (response.Items?.[0] as TokenSubscription) || null;
}

// Create Stripe checkout session
export async function createCheckoutSession(userId: string) {
  try {
    const session = await stripe.checkout.sessions.create({
      client_reference_id: userId,
      line_items: [
        {
          price: process.env.STRIPE_MONTHLY_PRICE_ID || '',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },      
      metadata: {
        userId: userId,
      },
      success_url: 'https://beta.rhun.io/account',
    });

    return { url: session.url };
  } catch (error) {
    console.error('Checkout session creation error:', error);
    throw new Error('Failed to create checkout session');
  }
}

// Create Stripe customer portal session
export async function createCustomerPortalSession(customerId: string) {
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://beta.rhun.io/account'
    });

    return { url: portalSession.url };
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
}

// Check subscription status combining both Stripe and Token subscriptions
export async function checkSubscriptionStatus(userId: string): Promise<{
  isSubscribed: boolean;
  subscriptionType: 'none' | 'stripe' | 'token' | 'both';
  details: SubscriptionDetails;
}> {
  const subscription = await getSubscription(userId);
  
  if (!subscription) {
    return {
      isSubscribed: false,
      subscriptionType: 'none',
      details: {}
    };
  }

  const isStripeActive = subscription.stripe?.status === 'active' && !subscription.stripe?.cancelAtPeriodEnd;
  const isTokenActive = subscription.token ? isTokenSubscriptionActive(subscription.token) : false;

  let subscriptionType: 'none' | 'stripe' | 'token' = 'none';
  if (isStripeActive) subscriptionType = 'stripe';
  else if (isTokenActive) subscriptionType = 'token';

  return {
    isSubscribed: isStripeActive || isTokenActive,
    subscriptionType,
    details: subscription
  };
}