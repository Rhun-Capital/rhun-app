import { NextRequest } from "next/server";
import { PrivyClient } from '@privy-io/server-auth';

// Initialize Privy client
const privyClient = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export interface User {
  id: string;
  wallets: Array<{
    address: string;
    chainType: string;
    delegated?: boolean;
  }>;
}

/**
 * Get authenticated user from request headers
 */
export async function getUser(req: NextRequest): Promise<User | null> {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token
    const privy = await privyClient.verifyAuthToken(token);
    
    if (!privy || !privy.userId) {
      return null;
    }
    
    // Get full user data from Privy
    const userData = await privyClient.getUser(privy.userId);
    
    // Extract wallets
    const wallets = userData.linkedAccounts
      .filter((account) => account.type === 'wallet')
      .map((wallet) => ({
        address: wallet.address,
        chainType: wallet.chainType || 'unknown',
        delegated: wallet.delegated || false
      }));
    
    return {
      id: privy.userId,
      wallets
    };
  } catch (error) {
    console.error('Error authenticating user:', error);
    return null;
  }
} 