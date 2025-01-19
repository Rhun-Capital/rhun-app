import { Connection, PublicKey } from '@solana/web3.js';

export function getSolanaConnection(
  heliusApiKey: string
): Connection {
  const rpcUrl = process.env.HELIUS_RPC_URL;
  
  if (!rpcUrl) {
    throw new Error('HELIUS_RPC_URL is not defined in environment variables');
  }

  return new Connection(`${rpcUrl}/?api-key=${heliusApiKey}`, 'confirmed');
}

export async function getSolanaBalance(
  walletAddress: string, 
  heliusApiKey: string
): Promise<number> {
  const rpcUrl = process.env.HELIUS_RPC_URL;
  try {
    const connection = new Connection(
      `${rpcUrl}/?api-key=${heliusApiKey}`, 
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