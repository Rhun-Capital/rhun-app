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

// Utility functions for DynamoDB operations
export async function getSubscription(userId: string) {
  const command = new GetCommand({
    TableName: "Subscriptions",
    Key: { userId }
  });

  const response = await docClient.send(command);
  return response.Item;
}

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

export async function createCheckoutSession(userId: string) {
  console.log(userId)
  try {
    const session = await stripe.checkout.sessions.create({
      client_reference_id: userId,
      line_items: [
        {
          price: process.env.STRIPE_MONTHLY_PRICE_ID || '',
          quantity: 1,
        },
      ],
      mode: 'subscription', // Use 'subscription' for recurring payments
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },      
      metadata: {
        userId: userId, // Add userId to metadata
      },
      success_url: `${process.env.NEXT_PUBLIC_URL}/settings`,
      // cancel_url: `${process.env.NEXT_PUBLIC_URL}`,
    });

    return { url: session.url };
  } catch (error) {
    console.error('Checkout session creation error:', error);
    throw new Error('Failed to create checkout session');
  }
}

export async function createCustomerPortalSession(customerId: string) {
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_URL}/settings`
    });

    return { url: portalSession.url };
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
}