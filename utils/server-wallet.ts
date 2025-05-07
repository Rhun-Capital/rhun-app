import { PrivyClient } from '@privy-io/server-auth';

// Initialize the Privy client for server operations
const privyClient = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

interface TransactionParams {
  from: string;
  to: string;
  amount: string;
  userId: string;
}

interface TokenTransactionParams extends TransactionParams {
  tokenAddress: string;
  tokenDecimals: number;
}

interface SwapParams {
  userId: string;
  walletAddress: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amountIn: string;
}

/**
 * Executes a Solana transaction using a delegated wallet
 */
export async function sendSOL({ from, to, amount, userId }: TransactionParams) {
  try {
    // Convert amount to lamports (1 SOL = 1,000,000,000 lamports)
    const amountLamports = Math.floor(parseFloat(amount) * 1_000_000_000).toString();
    
    // Use the Privy API to send native SOL
    const response = await fetch(`https://auth.privy.io/api/v1/siws/solana/sign-and-send-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.NEXT_PUBLIC_PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({
        user_id: userId,
        wallet_address: from,
        instructions: [
          {
            program_id: '11111111111111111111111111111111', // System program
            accounts: [
              { pubkey: from, is_signer: true, is_writable: true },
              { pubkey: to, is_signer: false, is_writable: true }
            ],
            data: `0x02000000${amountLamports}` // Transfer instruction with amount
          }
        ],
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send SOL: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      transactionHash: result.signature
    };
  } catch (error) {
    console.error('Error sending SOL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Executes a Solana SPL token transaction using a delegated wallet
 */
export async function sendSPLToken({ 
  from, 
  to, 
  amount, 
  userId, 
  tokenAddress, 
  tokenDecimals 
}: TokenTransactionParams) {
  try {
    // Calculate token amount with proper decimals
    const tokenAmount = (parseFloat(amount) * Math.pow(10, tokenDecimals)).toString();
    
    // This would need to be implemented with the actual SPL token program instructions
    // This is a simplified example that would need to be completed with actual transaction building
    const response = await fetch(`https://auth.privy.io/api/v1/siws/solana/sign-and-send-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.NEXT_PUBLIC_PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({
        user_id: userId,
        wallet_address: from,
        // SPL token transfer instructions would be added here
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send SPL token: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      transactionHash: result.signature
    };
  } catch (error) {
    console.error('Error sending SPL token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Executes a token swap using a delegated wallet
 */
export async function swapTokens({
  userId,
  walletAddress,
  fromTokenAddress,
  toTokenAddress,
  amountIn
}: SwapParams) {
  try {
    // This would need to integrate with a DEX API like Jupiter
    // For demonstration purposes - signature would be obtained from a proper swap transaction
    const response = await fetch(`https://auth.privy.io/api/v1/siws/solana/sign-and-send-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.NEXT_PUBLIC_PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({
        user_id: userId,
        wallet_address: walletAddress,
        // Swap transaction instructions would be added here
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to swap tokens: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      transactionHash: result.signature
    };
  } catch (error) {
    console.error('Error swapping tokens:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Check if a user has delegated a specific wallet
 */
export async function isDelegated(userId: string, walletAddress: string): Promise<boolean> {
  try {
    const user = await privyClient.getUser(userId);
    
    // Find the wallet in the user's linked accounts
    const delegatedWallet = user.linkedAccounts.find(account => 
      account.type === 'wallet' && 
      account.address.toLowerCase() === walletAddress.toLowerCase() && 
      account.delegated === true
    );
    
    return !!delegatedWallet;
  } catch (error) {
    console.error('Error checking delegation status:', error);
    return false;
  }
} 