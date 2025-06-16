import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getSolanaConnection } from '@/utils/solana';
import { getStablePool } from '@/utils/meteora-dynamic';

export const runtime = 'nodejs';

// Hardcoded RHUN-SOL pool address and tokenA (RHUN)
const RHUN_SOL_POOL = '2jxVjkPignEbR5pbGNtiRyCc6fAKZTKuFTf1MQED9pt5';
const RHUN_MINT = 'Gh8yeA9vH5Fun7J6esFH3mV65cQTBpxk9Z5XpzU7pump';
const DLMM_PROGRAM_ID = 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo';

export async function GET(request: Request) {
  try {
    const connection = getSolanaConnection();
    const poolPubkey = new PublicKey(RHUN_SOL_POOL);
    const accountInfo = await connection.getAccountInfo(poolPubkey);
    if (!accountInfo) {
      console.error('Pool account not found');
      return NextResponse.json({ error: 'Pool account not found' }, { status: 404 });
    }
    console.log('Pool account owner:', accountInfo.owner.toBase58());
    console.log('Pool account data length:', accountInfo.data.length);
    if (accountInfo.owner.toBase58() !== DLMM_PROGRAM_ID) {
      return NextResponse.json({
        error: 'Pool account is not owned by DLMM program',
        owner: accountInfo.owner.toBase58(),
        expected: DLMM_PROGRAM_ID
      }, { status: 400 });
    }
    const pool = getStablePool(RHUN_SOL_POOL);
    await pool.initialize(RHUN_MINT);
    const info = await pool.getPoolInfo();
    return NextResponse.json(info);
  } catch (error) {
    console.error('Error fetching pool info:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 