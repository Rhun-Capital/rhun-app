import React, { useState, useEffect } from 'react';
import { useSolanaWallets } from '@privy-io/react-auth';
import { ProxyConnection } from '@/utils/solana';
import { executeSwap, getQuote } from '@/utils/solana';
import type { ToolInvocation as AIToolInvocation } from '@ai-sdk/ui-utils';
import { usePrivy } from '@privy-io/react-auth';
import { useParams, useSearchParams, usePathname } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { CrossmintNFTCollectionView } from '@crossmint/client-sdk-react-ui';

// Add constant for localStorage key
const SELECTED_WALLET_KEY = 'rhun_selected_wallet_address';

const JUPITER_TOKEN_LIST_URL = 'https://tokens.jup.ag/tokens?tags=community';
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

interface Token {
  token_address: string;
  token_icon: string;
  token_name: string;
  token_symbol: string;
  token_decimals: number;
  usd_price: number;
  usd_value: number;
  formatted_amount: number;
}

interface UpdateToolInvocationParams {
  chatId: string;
  toolCallId: string;
  status: 'success' | 'error';
  result: {
    transactionHash: string;
    status: 'success' | 'error';
    error?: any;
    fromToken?: string;
    toToken?: string;
    amount?: string;
    slippage?: number;
  };
}

const ExecuteSwap: React.FC<{ 
  toolCallId: string; 
  toolInvocation: AIToolInvocation;
}> = ({ toolCallId, toolInvocation }) => {
  const { user, getAccessToken} = usePrivy();
  const { wallets: solanaWallets } = useSolanaWallets();
  const [agent, setAgent] = useState<any>();
  const [activeWallet, setActiveWallet] = useState<any>();
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const connection = new ProxyConnection({ commitment: 'confirmed' });
  const params = useParams();
  const searchParams = useSearchParams(); 
  const chatId = decodeURIComponent(searchParams.get('chatId') || '');  
  const pathname = usePathname();
  
  const existingResult = 'result' in toolInvocation ? toolInvocation.result : null;
  const existingStatus = 'status' in toolInvocation ? toolInvocation.status : null;    
  // Set initial status based on existing result
  const getInitialStatus = () => {
    if (existingStatus === 'success') return 'success';
    if (existingStatus === 'error') return 'error';
    return 'searching';
  };
  const [status, setStatus] = useState<'searching' | 'swapping' | 'confirming' | 'success' | 'error'>(getInitialStatus());
  const [hasExecuted, setHasExecuted] = useState(!!existingResult);

  // Get parameters from the tool invocation result
  const toolParams = 'result' in toolInvocation ? toolInvocation.result : {
    fromToken: '',
    toToken: '',
    amount: '',
    slippage: 1.0
  };

  const { fromToken: fromTokenName, toToken: toTokenName, amount, slippage = 1.0 } = toolParams;

  useEffect(() => {
    // get agent and set agent name
    if (!user) return;
    getAgent().then((agent) => {

      setAgent(agent);
  
      // Determine active wallet with proper checks
      let wallet = localStorage.getItem(SELECTED_WALLET_KEY);
      let activeWallet = null;
      
      if (wallet && solanaWallets.find(w => w.address.toLowerCase() === wallet.toLowerCase())) {
        activeWallet = solanaWallets.find(w => w.address.toLowerCase() === wallet.toLowerCase())
      } else if (agent?.wallets?.solana && solanaWallets.find(w => w.address.toLowerCase() === agent.wallets.solana.toLowerCase())) {
        activeWallet = solanaWallets.find(w => w.address.toLowerCase() === agent.wallets.solana.toLowerCase())
      } else {
        activeWallet = solanaWallets[0] || null
      }

      setActiveWallet(activeWallet)
      


    });
  }, [user]);

  const getAgent = async () => {

    if (params.userId === 'template' || pathname === '/template') {
      return null;
    }

    const accessToken = await getAccessToken();
    const response = await fetch(
      `/api/agents/${decodeURIComponent(params.userId as string || 'template')}/${params.agentId || 'cc425065-b039-48b0-be14-f8afa0704357'} `,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch agent configuration");
    }
    return response.json();
  }  

  useEffect(() => {
    if (activeWallet && !hasExecuted) {
      executeTokenSwap();
    }
  }, [activeWallet]);

  const getPrice = async (id: string) => {
      const accessToken = await getAccessToken();
      // fetch token details from coingecko using the extensions.coingeckoId 
      const coin = await fetch('/api/coingecko/coins/' + id, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
      });
      const coinItem = await coin.json()    
      return coinItem.market_data.current_price.usd
  }

  const findToken = async (tokenIdentifier: string): Promise<Token | null> => {
    try {
      // Handle SOL case
      if (tokenIdentifier.toUpperCase() === 'SOL') {
        const price = await getPrice('solana')
        return {
          token_address: 'SOL',
          token_icon: '',
          token_name: 'Solana',
          token_symbol: 'SOL',
          token_decimals: 9,
          usd_price: price,
          usd_value: 0,
          formatted_amount: 0
        };
      }

      const response = await fetch(JUPITER_TOKEN_LIST_URL);
      if (!response.ok) throw new Error('Failed to fetch token list');
      
      const tokens = await response.json();
      
      // Determine search strategy based on input format
      const isAddress = SOLANA_ADDRESS_REGEX.test(tokenIdentifier);
      let token;

      if (isAddress) {
        // If input matches address format, only search by address
        token = tokens.find((t: any) => 
          t.address.toLowerCase() === tokenIdentifier.toLowerCase()
        );
      } else {
        // If input doesn't match address format, search by name/symbol
        const searchTerm = tokenIdentifier.toLowerCase();
        token = tokens.find((t: any) => 
          t.name.toLowerCase() === searchTerm ||
          t.symbol.toLowerCase() === searchTerm
        );
      }

      // If token is not found in the list but is a valid Solana address, create a dummy token object
      if (!token && isAddress) {
        console.log(`Token not found in list, using address directly: ${tokenIdentifier}`);
        return {
          token_address: tokenIdentifier,
          token_icon: '',
          token_name: `Token ${tokenIdentifier.substring(0, 8)}...`,
          token_symbol: `UNK`,
          token_decimals: 9, // Default to 9 decimals (same as SOL)
          usd_price: 0,
          usd_value: 0,
          formatted_amount: 0
        };
      }

      if (!token) return null;

      // Get price using CoinGecko ID if available
      let price = 0;
      try {
        if (token.extensions?.coingeckoId) {
          price = await getPrice(token.extensions.coingeckoId);
        }
      } catch (priceError) {
        console.warn('Could not fetch price for token:', tokenIdentifier, priceError);
      }

      return {
        token_address: token.address,
        token_icon: token.logoURI || '',
        token_name: token.name,
        token_symbol: token.symbol,
        token_decimals: token.decimals,
        usd_price: price,
        usd_value: 0,
        formatted_amount: 0
      };
    } catch (error) {
      console.error('Error finding token:', error);
      
      // If we can't find the token but the input is a valid Solana address, 
      // try to use it directly as a last resort
      if (SOLANA_ADDRESS_REGEX.test(tokenIdentifier)) {
        console.log(`Falling back to using address directly after error: ${tokenIdentifier}`);
        return {
          token_address: tokenIdentifier,
          token_icon: '',
          token_name: `Token ${tokenIdentifier.substring(0, 8)}...`,
          token_symbol: `UNK`,
          token_decimals: 9, // Default to 9 decimals (same as SOL)
          usd_price: 0,
          usd_value: 0,
          formatted_amount: 0
        };
      }
      
      return null;
    }
  };

  const updateToolInvocation = async ({
    chatId,
    toolCallId,
    status,
    result
  }: UpdateToolInvocationParams) => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/chat/tool-invocation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          chatId,
          toolCallId,
          status,
          result
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to update tool invocation');
      }
  
      return await response.json();
    } catch (error) {
      console.error('Error updating tool invocation:', error);
      throw error;
    }
  };  

  const checkTransactionStatus = async (signature: string) => {
    try {
      const status = await connection.getSignatureStatus(signature);
      if (status.value && Array.isArray(status.value) && status.value[0]?.confirmationStatus === 'finalized') {
        setStatus('success');
        setTransactionHash(signature);
        // Update tool invocation with success status
        await updateToolInvocation({
          chatId,
          toolCallId,
          status: 'success',
          result: {
            transactionHash: signature,
            status: 'success',
            fromToken: fromTokenName,
            toToken: toTokenName,
            amount,
            slippage
          }
        });        

        return true;
      }

      if (status?.value?.err) {
        setStatus('error');
        setErrorMessage(`Transaction failed: ${JSON.stringify(status.value.err)}`);
        await updateToolInvocation({
          chatId,
          toolCallId,
          status: 'error',
          result: {
            transactionHash: signature,
            status: 'error',
            fromToken: fromTokenName,
            toToken: toTokenName,
            amount,
            slippage
          }
        });           
        return false;
      }

      return null;
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return null;
    }
  };

  const executeTokenSwap = async () => {
    try {
      if (!activeWallet) {
        throw new Error('No wallet connected');
      }
      
      // Find tokens
      setStatus('searching');
      const fromToken = await findToken(fromTokenName);
      const toToken = await findToken(toTokenName);
  
      if (!fromToken || !toToken) {
        throw new Error(`Could not find ${!fromToken ? fromTokenName : toTokenName}`);
      }
  
      // Validate amount and balance
      const amountToSwap = parseFloat(amount);
      if (amountToSwap <= 0) {
        throw new Error('Invalid swap amount');
      }
  
      // Execute swap
      setStatus('swapping');
      let signature;
      try {
        // Add warning for direct contract address usage
        if (fromToken.token_symbol === 'UNK') {
          console.warn(`Using unknown token with address ${fromToken.token_address}. Make sure you have this token in your wallet.`);
        }
        
        signature = await executeSwap({
          fromToken,
          toToken,
          amount: amount.toString(),
          slippage,
          wallet: activeWallet
        });
      } catch (swapError: any) {
        console.error('Swap Execution Error:', swapError);
        
        // Handle specific Solana errors with better error messages
        if (swapError.message?.includes('Attempt to debit an account but found no record of a prior credit')) {
          throw new Error(`You don't have any ${fromToken.token_symbol} tokens in your wallet. The token account may not exist.`);
        } else if (swapError.message?.includes('insufficient funds')) {
          throw new Error(`Insufficient ${fromToken.token_symbol} tokens in your wallet.`);
        } else {
          throw swapError;
        }
      }
  
      // Validate signature
      if (!signature) {
        throw new Error('No transaction signature received');
      }
  
      // Check status
      setStatus('confirming');
  
      // Initial check
      const initialStatus = await checkTransactionStatus(signature);
      if (initialStatus !== null) return;
  
      // Poll for status
      let retries = 0;
      const maxRetries = 45; // 90 seconds total
      const intervalId = setInterval(async () => {
        retries++;
        try {
          const status = await checkTransactionStatus(signature);

          if (status === true) {
            clearInterval(intervalId);
            return
          } 
          
          if (status !== null || retries >= maxRetries) {
            clearInterval(intervalId);
            if (status === null && retries >= maxRetries) {
              setStatus('error');
              setErrorMessage('Transaction confirmation timed out');
              console.error('Transaction confirmation timed out');
            }
          }
        } catch (statusError: unknown) {
          clearInterval(intervalId);
          setStatus('error');
          setErrorMessage(`Status check error: ${(statusError as Error).message}`);
          console.error('Error checking transaction status:', statusError);
        }
      }, 2000);
  
      return () => clearInterval(intervalId);
      
  
    } catch (error: any) {
      // Comprehensive error handling
      setStatus('error');
      setErrorMessage(error.message || 'Unknown error occurred');
      console.error('Swap process error:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });

      await updateToolInvocation({
        chatId,
        toolCallId,
        status: 'error',
        result: {
          transactionHash: '',
          status: 'error',
          error: error.message,
          fromToken: fromTokenName,
          toToken: toTokenName,
          amount,
          slippage
        }
      });          
      
      setHasExecuted(true);
    }

    setHasExecuted(true);
  };

  // Render a simple status indicator
  return (
    <div className="p-4 bg-zinc-800 rounded-lg">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {status === 'searching' && (
            <>
              <div className="w-4 h-4 rounded-full bg-yellow-500/20 animate-pulse" />
              <span className="text-sm text-zinc-400">Looking up tokens...</span>
            </>
          )}
          {status === 'swapping' && (
            <>
              <div className="w-4 h-4 rounded-full bg-blue-500/20 animate-pulse" />
              <span className="text-sm text-zinc-400">Executing swap...</span>
            </>
          )}
          {status === 'confirming' && (
            <>
              <div className="w-4 h-4 rounded-full bg-purple-500/20 animate-pulse" />
              <span className="text-sm text-zinc-400">Waiting for confirmation...</span>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-4 h-4 rounded-full bg-green-500/20" />
              <span className="text-sm text-green-400">Swap completed successfully!</span>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-4 h-4 rounded-full bg-red-500/20" />
              <span className="text-sm text-red-400">Swap failed</span>
              {errorMessage && (
                <span className="text-sm text-red-300 ml-2">({errorMessage})</span>
              )}
            </>
          )}
        </div>

        {/* Show transaction hash if set */}
        {transactionHash && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span>Transaction:</span>
            <Link 
              href={`https://solscan.io/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              {transactionHash.slice(0, 8)}...{transactionHash.slice(-8)}
              <ExternalLink size={12} />
            </Link>
          </div>
        )}

        {/* Show transaction details if available */}
        {existingResult && existingResult.transactionHash && (
          <div className="mt-2 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <span>Transaction:</span>
              <Link 
                href={`https://solscan.io/tx/${existingResult.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                {existingResult.transactionHash.slice(0, 8)}...{existingResult.transactionHash.slice(-8)}
                <ExternalLink size={12} />
              </Link>
            </div>
            <div className="flex flex-col gap-1 text-zinc-400">
              <div>From: {existingResult.fromToken} ({existingResult.amount})</div>
              <div>To: {existingResult.toToken}</div>
              {existingResult.error && (
                <div className="text-red-300">Error: {existingResult.error}</div>
              )}
              <div className="text-xs">
                Updated: {new Date(existingResult.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecuteSwap;