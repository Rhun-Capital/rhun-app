import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { sendSOL, sendSPLToken } from "@/utils/server-wallet";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const data = await req.json();
    const { fromAddress, toAddress, amount, tokenAddress, tokenDecimals } = data;
    
    if (!fromAddress || !toAddress || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: fromAddress, toAddress, amount" }, 
        { status: 400 }
      );
    }
    
    // Check if we're sending native SOL or an SPL token
    if (tokenAddress && tokenAddress !== "SOL") {
      // SPL Token transfer
      if (!tokenDecimals) {
        return NextResponse.json(
          { error: "Token decimals required for SPL token transfers" }, 
          { status: 400 }
        );
      }
      
      const result = await sendSPLToken({
        from: fromAddress,
        to: toAddress,
        amount,
        userId: user.id,
        tokenAddress,
        tokenDecimals
      });
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to send SPL token" }, 
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        transactionHash: result.transactionHash
      });
    } else {
      // Native SOL transfer
      const result = await sendSOL({
        from: fromAddress,
        to: toAddress,
        amount,
        userId: user.id
      });
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to send SOL" }, 
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        transactionHash: result.transactionHash
      });
    }
  } catch (error) {
    console.error("Error processing transaction:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" }, 
      { status: 500 }
    );
  }
} 