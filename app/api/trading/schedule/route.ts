import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { isDelegated } from "@/utils/server-wallet";
import { DynamoDB } from "aws-sdk";

export const runtime = 'nodejs';

// Initialize DynamoDB client
const dynamoDb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const STRATEGIES_TABLE = "RhunTradingStrategies";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const data = await req.json();
    const { walletAddress, strategy, config } = data;
    
    if (!walletAddress || !strategy || !config) {
      return NextResponse.json(
        { error: "Missing required fields: walletAddress, strategy, config" }, 
        { status: 400 }
      );
    }
    
    // Check if the wallet is delegated
    const delegated = await isDelegated(user.id, walletAddress);
    
    if (!delegated) {
      return NextResponse.json(
        { error: "Wallet not delegated. User must delegate wallet before scheduling trades." }, 
        { status: 403 }
      );
    }
    
    // Generate a unique ID for the strategy
    const strategyId = `strategy_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Define strategy details based on type
    const strategyDetails = {
      dca: {
        name: 'Dollar Cost Averaging',
        icon: '💰',
        targetToken: config.targetToken,
        amount: config.amount,
        frequency: config.frequency
      },
      momentum: {
        name: 'Momentum Trading',
        icon: '📈',
        targetToken: config.targetToken,
        amount: config.amount,
        frequency: config.frequency
      },
      limit: {
        name: 'Limit Orders',
        icon: '🎯',
        targetToken: config.targetToken,
        amount: config.amount,
        frequency: config.frequency,
        limitPrice: config.limitPrice || null
      },
      rebalance: {
        name: 'Portfolio Rebalancing',
        icon: '⚖️',
        targetToken: config.targetToken,
        amount: config.amount,
        frequency: config.frequency
      }
    };
    
    // Save the strategy to DynamoDB - Updated to use composite key
    const params = {
      TableName: STRATEGIES_TABLE,
      Item: {
        // Primary key components
        walletAddress, // Partition key
        id: strategyId, // Sort key
        
        // Other attributes
        userId: user.id,
        strategyType: strategy,
        ...strategyDetails[strategy as keyof typeof strategyDetails],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        lastExecuted: null,
        nextExecution: calculateNextExecution(config.frequency)
      }
    };
    
    await dynamoDb.put(params).promise();
    
    // Create AWS EventBridge rule for scheduled execution
    // This would typically be done through AWS SDK's EventBridge.putRule
    // Here we just simulate success of rule creation
    
    return NextResponse.json({
      success: true,
      strategy: {
        id: strategyId,
        type: strategy,
        ...strategyDetails[strategy as keyof typeof strategyDetails]
      }
    });
    
  } catch (error) {
    console.error("Error setting up trading strategy:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" }, 
      { status: 500 }
    );
  }
}

// Helper function to get active strategies for a wallet
export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get the wallet address from the path
    const url = new URL(req.url);
    const walletAddress = url.pathname.split('/').pop();
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Missing wallet address" }, 
        { status: 400 }
      );
    }
    
    // Query strategies for this wallet from DynamoDB - Updated to use primary key directly
    const params = {
      TableName: STRATEGIES_TABLE,
      KeyConditionExpression: 'walletAddress = :walletAddress',
      FilterExpression: 'status = :status',
      ExpressionAttributeValues: {
        ':walletAddress': walletAddress,
        ':status': 'active'
      }
    };
    
    try {
      const result = await dynamoDb.query(params).promise();
      
      return NextResponse.json({
        success: true,
        strategies: result.Items || []
      });
    } catch (dbError) {
      console.error("DynamoDB error:", dbError);
      
      // If DynamoDB isn't set up yet, return empty strategies for development
      return NextResponse.json({
        success: true,
        strategies: []
      });
    }
    
  } catch (error) {
    console.error("Error getting trading strategies:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" }, 
      { status: 500 }
    );
  }
}

// Helper function to calculate next execution time based on frequency
function calculateNextExecution(frequency: string): string {
  const now = new Date();
  
  switch (frequency) {
    case 'hourly':
      now.setHours(now.getHours() + 1);
      break;
    case 'daily':
      now.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      now.setDate(now.getDate() + 7);
      break;
    default:
      now.setDate(now.getDate() + 1); // Default to daily
  }
  
  return now.toISOString();
} 