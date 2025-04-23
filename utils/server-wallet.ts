import { PrivyClient } from '@privy-io/server-auth';

// Initialize the Privy client for server-side operations
const privyClient = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
  process.env.PRIVY_APP_SECRET || '',
  {
    walletApi: {
      authorizationPrivateKey: process.env.PRIVY_WALLET_AUTH_KEY || undefined
    }
  }
);

// Execute an action on behalf of a user with a delegated wallet
export async function executeWithDelegatedWallet(
  userId: string,
  walletAddress: string,
  action: (accessToken: string) => Promise<any>
) {
  try {
    // Get a session token for the wallet using the Privy REST API
    // This would be implemented based on Privy's server session API
    const response = await fetch(`https://auth.privy.io/api/v1/users/${userId}/wallets/${walletAddress}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.NEXT_PUBLIC_PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`).toString('base64')}`,
        'privy-app-id': process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''
      },
      body: JSON.stringify({
        chain_type: 'solana'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get wallet session');
    }

    const session = await response.json();
    
    if (!session || !session.access_token) {
      throw new Error('No delegated session available for this wallet');
    }

    // Execute the action using the session access token
    return await action(session.access_token);
  } catch (error) {
    console.error('Server wallet operation failed:', error);
    throw error;
  }
}

// Example: Send tokens from a delegated wallet
export async function sendTokensFromDelegatedWallet(
  userId: string,
  walletAddress: string,
  recipient: string,
  tokenAddress: string, // 'SOL' for native SOL
  amount: string
) {
  return executeWithDelegatedWallet(userId, walletAddress, async (accessToken) => {
    const response = await fetch('/api/transactions/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        walletAddress,
        recipient,
        tokenAddress,
        amount,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send tokens');
    }

    return response.json();
  });
}

// Example: Swap tokens using a delegated wallet
export async function swapTokensWithDelegatedWallet(
  userId: string,
  walletAddress: string,
  fromToken: string,
  toToken: string,
  amount: string,
  slippage: number
) {
  return executeWithDelegatedWallet(userId, walletAddress, async (accessToken) => {
    const response = await fetch('/api/transactions/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        walletAddress,
        fromToken,
        toToken,
        amount,
        slippage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to swap tokens');
    }

    return response.json();
  });
} 