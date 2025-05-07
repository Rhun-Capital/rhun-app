import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
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

export async function GET(
  req: NextRequest,
  { params }: { params: { walletAddress: string } }
) {
  try {
    const user = await getUser(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const walletAddress = params.walletAddress;
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Missing wallet address" }, 
        { status: 400 }
      );
    }
    
    try {
      // Query strategies for this wallet from DynamoDB using primary key
      const params = {
        TableName: STRATEGIES_TABLE,
        KeyConditionExpression: 'walletAddress = :walletAddress',
        FilterExpression: 'status = :status',
        ExpressionAttributeValues: {
          ':walletAddress': walletAddress,
          ':status': 'active'
        }
      };
      
      const result = await dynamoDb.query(params).promise();
      
      return NextResponse.json({
        success: true,
        strategies: result.Items || []
      });
    } catch (dbError) {
      console.error("DynamoDB error:", dbError);
      
      // For development - return mock strategies if DynamoDB is not set up
      if (process.env.NODE_ENV === 'development') {
        // Generate a random strategy for development
        const mockStrategies = [{
          walletAddress: walletAddress, // Partition key
          id: `strategy_dev_${Math.random().toString(36).substring(2, 9)}`, // Sort key
          userId: user.id,
          strategyType: 'dca',
          name: 'Dollar Cost Averaging',
          icon: '💰',
          targetToken: 'BONK',
          amount: 0.1,
          frequency: 'daily',
          status: 'active',
          lastExecuted: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          nextExecution: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }];
        
        return NextResponse.json({
          success: true,
          strategies: mockStrategies
        });
      }
      
      // In production, return empty array if there's a DB error
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