import { NextResponse } from 'next/server';
import { getPrivyToken } from '@/utils/privy';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const token = await getPrivyToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.HELIUS_API_KEY) {
      throw new Error('HELIUS_API_KEY is required in environment variables');
    }

    // Basic validation for Solana address format
    if (!params.address || params.address.length !== 44 || !/^[1-9A-HJ-NP-Za-km-z]{44}$/.test(params.address)) {
      throw new Error(`Invalid token address format: ${params.address}`);
    }

    const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
    
    // First fetch token metadata to get decimals
    const metadataResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'helius-fetch-token-metadata',
        method: 'getAccountInfo',
        params: [params.address, { encoding: 'jsonParsed' }]
      }),
    });
    
    if (!metadataResponse.ok) {
      throw new Error('Failed to fetch token metadata');
    }
    
    const metadataData = await metadataResponse.json();
    const decimals = metadataData.result?.value?.data?.parsed?.info?.decimals || 0;
    
    // Fetch token accounts (holders)
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'helius-fetch-token-holders',
        method: 'getTokenLargestAccounts',
        params: [params.address]
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch token holders');
    }

    const responseData = await response.json();
    
    if (responseData.error) {
      throw new Error(`RPC Error: ${responseData.error.message || JSON.stringify(responseData.error)}`);
    }
    
    const accounts = responseData.result?.value || [];
    
    if (accounts.length === 0) {
      return NextResponse.json([]);
    }
    
    // Get owner addresses for these accounts
    const ownerPromises = accounts.slice(0, 10).map(async (account: any) => {
      try {
        const accountResponse = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: `helius-fetch-account-${account.address}`,
            method: 'getAccountInfo',
            params: [account.address, { encoding: 'jsonParsed' }]
          }),
        });
        
        if (!accountResponse.ok) {
          return { address: account.address, amount: account.amount };
        }
        
        const accountData = await accountResponse.json();
        const owner = accountData.result?.value?.data?.parsed?.info?.owner || account.address;
        
        return {
          address: owner,
          amount: parseFloat(account.amount) / Math.pow(10, decimals)
        };
      } catch (error) {
        console.error(`Error fetching owner for account ${account.address}:`, error);
        return { address: account.address, amount: parseFloat(account.amount) / Math.pow(10, decimals) };
      }
    });
    
    const holders = await Promise.all(ownerPromises);
    return NextResponse.json(holders);
  } catch (error: any) {
    console.error('Error fetching token holders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch token holders' },
      { status: 500 }
    );
  }
} 