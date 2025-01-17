import { Connection, PublicKey } from '@solana/web3.js';

export async function getSolanaBalance(
  walletAddress: string, 
  heliusApiKey: string
): Promise<number> {
  try {
    const connection = new Connection(
      `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`, 
      'confirmed'
    );
    
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    
    // Convert lamports to SOL
    return balance / 10**9;
  } catch (error) {
    console.error('Error fetching Solana balance:', error);
    throw error;
  }
}