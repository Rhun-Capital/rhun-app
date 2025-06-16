import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import { getSolanaConnection } from '@/utils/solana';

const POOL_ADDRESS = '2jxVjkPignEbR5pbGNtiRyCc6fAKZTKuFTf1MQED9pt5';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing DLMM SDK connection...');

    // Initialize DLMM pool
    const connection = getSolanaConnection();
    const poolPubkey = new PublicKey(POOL_ADDRESS);
    
    console.log('Creating DLMM instance...');
    const dlmmPool = await DLMM.create(connection, poolPubkey);
    
    console.log('DLMM instance created successfully');

    // Test basic pool information
    const activeBin = await dlmmPool.getActiveBin();
    console.log('Active bin:', activeBin);

    // Test pool state
    console.log('Pool address:', dlmmPool.pubkey.toBase58());
    console.log('Token X:', dlmmPool.tokenX.publicKey.toBase58());
    console.log('Token Y:', dlmmPool.tokenY.publicKey.toBase58());

    // Test fee info
    const feeInfo = dlmmPool.getFeeInfo();
    console.log('Fee info:', feeInfo);

    // Test dynamic fee
    const dynamicFee = dlmmPool.getDynamicFee();
    console.log('Dynamic fee:', dynamicFee);

    return NextResponse.json({
      success: true,
      message: 'DLMM SDK is working correctly',
      poolInfo: {
        address: dlmmPool.pubkey.toBase58(),
        tokenX: dlmmPool.tokenX.publicKey.toBase58(),
        tokenY: dlmmPool.tokenY.publicKey.toBase58(),
        activeBin: {
          binId: activeBin.binId,
          price: activeBin.price
        },
        feeInfo: {
          baseFee: feeInfo.baseFeeRatePercentage,
          maxFee: feeInfo.maxFeeRatePercentage,
          protocolFee: feeInfo.protocolFeePercentage
        },
        dynamicFee: dynamicFee.toString()
      }
    });

  } catch (error) {
    console.error('Error testing DLMM SDK:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to test DLMM SDK',
        success: false 
      },
      { status: 500 }
    );
  }
} 