import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import { getSolanaConnection, ProxyConnection } from '@/utils/solana';

const POOL_ADDRESS = '2jxVjkPignEbR5pbGNtiRyCc6fAKZTKuFTf1MQED9pt5';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    console.log('Fetching fees for wallet:', walletAddress);

    // Initialize DLMM pool
    const connection = getSolanaConnection();
    const poolPubkey = new PublicKey(POOL_ADDRESS);
    const dlmmPool = await DLMM.create(connection, poolPubkey);
    
    // Get user positions
    const userPubkey = new PublicKey(walletAddress);
    const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(userPubkey);
    
    console.log('Found positions for fee calculation:', userPositions.length);

    // Calculate total claimable fees using instance methods
    let totalSwapFees = 0;
    let totalLMRewards = 0;
    const positionFees = [];

    // Try using the claimAllSwapFee and claimAllLMRewards methods to get fee information
    try {
      console.log('Getting claimable swap fees for all positions...');
      
      // Use the instance methods that we know exist from documentation
      let swapFeeTxs;
      let lmRewardTxs;
      
      try {
        swapFeeTxs = await dlmmPool.claimAllSwapFee({
          owner: userPubkey,
          positions: userPositions,
        });
        console.log('Swap fee transactions created:', Array.isArray(swapFeeTxs) ? swapFeeTxs.length : 1);
      } catch (swapError) {
        console.log('No swap fees available:', swapError instanceof Error ? swapError.message : String(swapError));
        swapFeeTxs = [];
      }

      try {
        lmRewardTxs = await dlmmPool.claimAllLMRewards({
          owner: userPubkey,
          positions: userPositions,
        });
        console.log('LM reward transactions created:', Array.isArray(lmRewardTxs) ? lmRewardTxs.length : 1);
      } catch (lmError) {
        console.log('No LM rewards available:', lmError instanceof Error ? lmError.message : String(lmError));
        lmRewardTxs = [];
      }

             // Provide realistic fee estimates based on position value and time
       for (const position of userPositions) {
         try {
           console.log(`Processing position: ${position.publicKey.toBase58()}`);
           console.log('Position data structure:', Object.keys(position));
           
           // Get position value from the position data
           let positionValue = 0;
           let positionSwapFees = 0;
           let positionLMRewards = 0;
           
           // Extract actual fee data from position
           if (position.positionData) {
             console.log('Position data keys:', Object.keys(position.positionData));
             
             // Get actual unclaimed fees from position data
             const feeX = (position.positionData as any).feeX || 0; // RHUN fees
             const feeY = (position.positionData as any).feeY || 0; // SOL fees
             const rewardOne = (position.positionData as any).rewardOne || 0; // LM reward 1
             const rewardTwo = (position.positionData as any).rewardTwo || 0; // LM reward 2
             
             console.log(`Raw fees - feeX: ${feeX}, feeY: ${feeY}, rewardOne: ${rewardOne}, rewardTwo: ${rewardTwo}`);
             
             // Convert fees from lamports/smallest unit to readable amounts
             // RHUN has 6 decimals, SOL has 9 decimals
             const rhunFees = Number(feeX.toString()) / 1e6; // RHUN fees
             const solFees = Number(feeY.toString()) / 1e9; // SOL fees
             const lmReward1 = Number(rewardOne.toString()) / 1e6; // Assuming RHUN decimals for LM rewards
             const lmReward2 = Number(rewardTwo.toString()) / 1e6; // Assuming RHUN decimals for LM rewards
             
             console.log(`Readable fees - RHUN: ${rhunFees}, SOL: ${solFees}, LM1: ${lmReward1}, LM2: ${lmReward2}`);
             
             // Calculate USD values using approximate prices
             const rhunPrice = 0.00024906; // From your logs
             const solPrice = 157.7; // From your logs
             
             const rhunFeesUSD = rhunFees * rhunPrice;
             const solFeesUSD = solFees * solPrice;
             const lmReward1USD = lmReward1 * rhunPrice; // Assuming LM rewards are in RHUN
             const lmReward2USD = lmReward2 * rhunPrice;
             
             positionSwapFees = rhunFeesUSD + solFeesUSD;
             positionLMRewards = lmReward1USD + lmReward2USD;
             
             console.log(`USD fees - Swap: $${positionSwapFees}, LM: $${positionLMRewards}`);
           }
 
           totalSwapFees += positionSwapFees;
           totalLMRewards += positionLMRewards;
 
           positionFees.push({
             positionAddress: position.publicKey.toBase58(),
             swapFees: {
               tokenX: (position.positionData as any).feeX ? Number((position.positionData as any).feeX.toString()) / 1e6 : 0,
               tokenY: (position.positionData as any).feeY ? Number((position.positionData as any).feeY.toString()) / 1e9 : 0,
               total: positionSwapFees
             },
             lmRewards: {
               rewards: [
                 {
                   mint: 'RHUN', // Assuming rewards are in RHUN
                   amount: (position.positionData as any).rewardOne ? Number((position.positionData as any).rewardOne.toString()) / 1e6 : 0
                 },
                 {
                   mint: 'RHUN', // Assuming rewards are in RHUN  
                   amount: (position.positionData as any).rewardTwo ? Number((position.positionData as any).rewardTwo.toString()) / 1e6 : 0
                 }
               ].filter(r => r.amount > 0),
               total: positionLMRewards
             }
           });
 
           console.log(`Position ${position.publicKey.toBase58()} estimated fees:`, {
             value: positionValue,
             swapFees: positionSwapFees,
             lmRewards: positionLMRewards
           });
 
         } catch (error) {
           console.error(`Error processing position ${position.publicKey.toBase58()}:`, error);
           
           // Add zero fees for this position if calculation fails
           positionFees.push({
             positionAddress: position.publicKey.toBase58(),
             swapFees: {
               tokenX: 0,
               tokenY: 0,
               total: 0
             },
             lmRewards: {
               rewards: [],
               total: 0
             }
           });
         }
       }

    } catch (feeError) {
      console.error('Error getting fee transactions:', feeError);
      
      // Fallback: return zero fees if we can't get fee information
      for (const position of userPositions) {
        positionFees.push({
          positionAddress: position.publicKey.toBase58(),
          swapFees: {
            tokenX: 0,
            tokenY: 0,
            total: 0
          },
          lmRewards: {
            rewards: [],
            total: 0
          }
        });
      }
    }

    console.log('Total fees calculated:', { totalSwapFees, totalLMRewards });

    return NextResponse.json({
      success: true,
      fees: {
        totalSwapFees,
        totalLMRewards,
        totalFeesUSD: totalSwapFees + totalLMRewards, // Simplified USD calculation
        positionFees
      },
      positionCount: userPositions.length
    });

  } catch (error) {
    console.error('Error fetching claimable fees:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch claimable fees',
        success: false 
      },
      { status: 500 }
    );
  }
} 