import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { sendSOL, swapTokens, isDelegated } from "@/utils/server-wallet";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const data = await req.json();
    const { walletAddress, signal } = data;
    
    if (!walletAddress || !signal) {
      return NextResponse.json(
        { error: "Missing required fields: walletAddress, signal" }, 
        { status: 400 }
      );
    }
    
    // Check if the wallet is delegated
    const delegated = await isDelegated(user.id, walletAddress);
    
    if (!delegated) {
      return NextResponse.json(
        { error: "Wallet not delegated. User must delegate wallet for automated trading." }, 
        { status: 403 }
      );
    }
    
    // Process the trading signal
    let result;
    
    switch(signal.type) {
      case 'swap':
        if (!signal.fromToken || !signal.toToken || !signal.amount) {
          return NextResponse.json(
            { error: "Missing swap parameters" }, 
            { status: 400 }
          );
        }
        
        result = await swapTokens({
          userId: user.id,
          walletAddress,
          fromTokenAddress: signal.fromToken,
          toTokenAddress: signal.toToken,
          amountIn: signal.amount
        });
        break;
        
      case 'buy':
        // Simplified example for demonstration
        if (!signal.token || !signal.amount) {
          return NextResponse.json(
            { error: "Missing buy parameters" }, 
            { status: 400 }
          );
        }
        
        // This would need to connect to a real DEX API
        result = await swapTokens({
          userId: user.id,
          walletAddress,
          fromTokenAddress: "SOL", // Using SOL as base currency
          toTokenAddress: signal.token,
          amountIn: signal.amount
        });
        break;
        
      case 'sell':
        // Simplified example for demonstration
        if (!signal.token || !signal.amount) {
          return NextResponse.json(
            { error: "Missing sell parameters" }, 
            { status: 400 }
          );
        }
        
        // This would need to connect to a real DEX API
        result = await swapTokens({
          userId: user.id,
          walletAddress,
          fromTokenAddress: signal.token,
          toTokenAddress: "SOL", // Converting back to SOL
          amountIn: signal.amount
        });
        break;
        
      default:
        return NextResponse.json(
          { error: "Unsupported signal type" }, 
          { status: 400 }
        );
    }
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to execute trading signal" }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      transactionHash: result.transactionHash,
      signal: signal.type
    });
    
  } catch (error) {
    console.error("Error processing trading signal:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" }, 
      { status: 500 }
    );
  }
} 