import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import { getSolanaConnection } from '@/utils/solana';
import { fetchTokenPrices } from '@/utils/coingecko';

const POOL_ADDRESS = '2jxVjkPignEbR5pbGNtiRyCc6fAKZTKuFTf1MQED9pt5';
const RHUN_MINT = 'Gh8yeA9vH5Fun7J6esFH3mV65cQTBpxk9Z5XpzU7pump';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    console.log('Fetching positions for wallet:', walletAddress);

    // Initialize DLMM pool with direct connection (server-side)
    const connection = getSolanaConnection();
    const poolPubkey = new PublicKey(POOL_ADDRESS);
    const dlmmPool = await DLMM.create(connection, poolPubkey);
    
    // Get user positions
    const userPubkey = new PublicKey(walletAddress);
    const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(userPubkey);
    
    console.log('Found positions:', userPositions.length);

    // Fetch real token prices from CoinGecko
    console.log('Fetching token prices...');
    const tokenPrices = await fetchTokenPrices([RHUN_MINT, SOL_MINT]);
    const rhunPrice = tokenPrices[RHUN_MINT] || 0;
    const solPrice = tokenPrices[SOL_MINT] || 0;
    
    console.log('Token prices:', { rhunPrice, solPrice });

    // Transform positions to our format
    const positions = userPositions.map((position, index) => {
      const positionData = position.positionData;
      const binData = positionData.positionBinData || [];
      
      // Calculate total amounts from bin data
      let totalTokenX = 0;
      let totalTokenY = 0;
      let minBinId = Infinity;
      let maxBinId = -Infinity;
      
      binData.forEach(bin => {
        totalTokenX += Number(bin.positionXAmount || 0);
        totalTokenY += Number(bin.positionYAmount || 0);
        minBinId = Math.min(minBinId, bin.binId);
        maxBinId = Math.max(maxBinId, bin.binId);
      });

      // Convert to human-readable amounts
      const tokenXAmount = totalTokenX / Math.pow(10, 6); // RHUN has 6 decimals
      const tokenYAmount = totalTokenY / Math.pow(10, 9); // SOL has 9 decimals
      
      // Calculate position value in USD
      const positionValue = (tokenXAmount * rhunPrice) + (tokenYAmount * solPrice);

      return {
        id: position.publicKey.toString(),
        tokenXAmount,
        tokenYAmount,
        minPrice: 0, // TODO: Calculate actual price from bin ID
        maxPrice: 0, // TODO: Calculate actual price from bin ID
        binRange: `${minBinId === Infinity ? 'N/A' : minBinId} - ${maxBinId === -Infinity ? 'N/A' : maxBinId}`,
        feeEarned: 0, // TODO: Calculate actual fees earned
        isActive: binData.length > 0,
        createdAt: new Date().toISOString(), // TODO: Get actual creation date
        positionValue, // Add individual position value
      };
    });

    // Calculate portfolio summary with real prices
    const totalPositions = positions.length;
    const activePositions = positions.filter(p => p.isActive).length;
    const totalRhunAmount = positions.reduce((sum, p) => sum + p.tokenXAmount, 0);
    const totalSolAmount = positions.reduce((sum, p) => sum + p.tokenYAmount, 0);
    
    // Calculate real portfolio value
    const portfolioValue = (totalRhunAmount * rhunPrice) + (totalSolAmount * solPrice);

    const response = {
      positions,
      summary: {
        totalPositions,
        activePositions,
        portfolioValue,
        totalRhunAmount,
        totalSolAmount,
      },
      prices: {
        rhun: rhunPrice,
        sol: solPrice,
        timestamp: new Date().toISOString(),
      }
    };

    console.log('Portfolio summary:', {
      totalRhunAmount,
      totalSolAmount,
      rhunPrice,
      solPrice,
      portfolioValue
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 