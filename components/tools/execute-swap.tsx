import React, { useState, useEffect, useMemo } from 'react';
import { useSolanaWallets } from '@privy-io/react-auth';
import { ProxyConnection } from '@/utils/solana';
import { executeSwap, getQuote } from '@/utils/solana';
import type { ToolInvocation as AIToolInvocation } from '@ai-sdk/ui-utils';
import { usePrivy } from '@privy-io/react-auth';
import { useParams, useSearchParams, usePathname } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { SwapToken, UpdateToolInvocationParams, SwapToolResult, SwapToolInvocation } from '../../types/tool-components';

// Add constant for localStorage key
const SELECTED_WALLET_KEY = 'rhun_selected_wallet_address';
const SWAP_HISTORY_KEY = 'swapHistory';

const JUPITER_TOKEN_LIST_URL = 'https://tokens.jup.ag/tokens?tags=community';
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const ExecuteSwapComponent: React.FC<{ 
  toolCallId: string; 
  toolInvocation: SwapToolInvocation;
}> = ({ toolCallId, toolInvocation }) => {
  const renderCount = React.useRef(0);
  React.useEffect(() => {
    renderCount.current += 1;
    console.log('Render count:', renderCount.current);
  });

  const initRef = React.useRef(false);

  const { user, getAccessToken } = usePrivy();
  const { wallets: solanaWallets, ready } = useSolanaWallets();
  const [status, setStatus] = useState<'searching' | 'ready' | 'executing' | 'success' | 'error'>('searching');
  const [error, setError] = useState<string | null>(null);
  const [fromToken, setFromToken] = useState<SwapToken | null>(null);
  const [toToken, setToToken] = useState<SwapToken | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const chatId = searchParams?.get('chatId');
  const [isHistoricalSuccess, setIsHistoricalSuccess] = useState(false);
  const [userRejected, setUserRejected] = useState(false);
  const [attemptedExecution, setAttemptedExecution] = useState(false);

  // Check if this is a historical tool invocation with a result
  useEffect(() => {
    if ('result' in toolInvocation) {
      const result = toolInvocation.result as any;
      // Check both result and status fields
      if (result?.status === 'success') {
        setTransactionHash(result.transactionHash || null);
        setStatus('success');
        setIsHistoricalSuccess(true);
        return;
      } else if (result?.status === 'error') {
        setError(result.error || 'An error occurred');
        setStatus('error');
        return;
      }
    }
  }, [toolInvocation]);

  // Extract swap parameters from tool invocation
  const toolParams = useMemo(() => {
    console.log('Recalculating tool params');
    if ('args' in toolInvocation) {
      return toolInvocation.args as {
        fromToken: string;
        toToken: string;
        amount: string;
        slippage: number;
      };
    }
    return {
      fromToken: '',
      toToken: '',
      amount: '',
      slippage: 1.0
    };
  }, [toolInvocation]);

  const { fromToken: fromTokenName, toToken: toTokenName, amount, slippage = 1.0 } = toolParams;

  // Get the active wallet with improved logic
  const activeWallet = useMemo(() => {
    console.log('Recalculating active wallet');
    if (!solanaWallets || solanaWallets.length === 0) return null;
    
    const storedWallet = localStorage.getItem(SELECTED_WALLET_KEY);
    
    let selectedWallet = null;
    if (storedWallet) {
      selectedWallet = solanaWallets.find(w => w.address.toLowerCase() === storedWallet.toLowerCase());
    }
    if (!selectedWallet) {
      selectedWallet = solanaWallets.find(w => w.connectedAt) || solanaWallets[0];
      if (selectedWallet) {
        localStorage.setItem(SELECTED_WALLET_KEY, selectedWallet.address);
      }
    }
    
    return selectedWallet;
  }, [solanaWallets]);

  // Add wallet connection effect
  useEffect(() => {
    if (!activeWallet) {
      setError('No wallet connected. Please connect a wallet first.');
      setStatus('error');
      return;
    }
  }, [activeWallet]);

  // Add user authentication effect
  useEffect(() => {
    if (!user) {
      setError('Please sign in to use the swap feature');
      setStatus('error');
      return;
    }
  }, [user]);

  // Add detailed logging for wallet state
  useEffect(() => {
    if (initRef.current) return;
    console.log('Wallet connection state:', {
      isUserAuthenticated: !!user,
      privyReady: ready,
      numberOfWallets: solanaWallets?.length || 0,
      walletDetails: solanaWallets?.map(w => ({
        address: w.address,
        connectedAt: w.connectedAt,
        type: w.type
      }))
    });
  }, [user, solanaWallets, ready]);

  // Function to find a token
  const findToken = async (tokenIdentifier: string): Promise<SwapToken | null> => {
    console.log('Finding token:', tokenIdentifier);
    try {
      // Handle SOL case
      if (tokenIdentifier.toUpperCase() === 'SOL') {
        console.log('Handling SOL token case');
        try {
          const accessToken = await getAccessToken();
          console.log('Got access token for SOL lookup');
          const coin = await fetch('/api/coingecko/coins/solana', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            },
          });
          console.log('Fetched SOL price data, status:', coin.status);
          const coinItem = await coin.json();
          console.log('Parsed SOL price data:', coinItem);
          
          const solToken = {
            token_address: 'So11111111111111111111111111111111111111112', // Wrapped SOL address
            token_icon: '',
            token_name: 'Solana',
            token_symbol: 'SOL',
            token_decimals: 9,
            usd_price: coinItem.market_data?.current_price?.usd || 0,
            usd_value: 0,
            formatted_amount: 0
          };
          console.log('Returning SOL token:', solToken);
          return solToken;
        } catch (error) {
          console.error('Error fetching SOL price:', error);
          // Don't throw here, return basic SOL token info
          const basicSolToken = {
            token_address: 'So11111111111111111111111111111111111111112',
            token_icon: '',
            token_name: 'Solana',
            token_symbol: 'SOL',
            token_decimals: 9,
            usd_price: 0,
            usd_value: 0,
            formatted_amount: 0
          };
          console.log('Returning basic SOL token:', basicSolToken);
          return basicSolToken;
        }
      }

      // If tokenIdentifier is a valid Solana address, try to get its metadata directly
      if (SOLANA_ADDRESS_REGEX.test(tokenIdentifier)) {
        console.log('Looking up token by address:', tokenIdentifier);
        const accessToken = await getAccessToken();
        try {
          console.log('Got access token for token lookup');
          const metadataResponse = await fetch(`/api/solana/token/${tokenIdentifier}/metadata`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          console.log('Metadata response status:', metadataResponse.status);
          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json();
            console.log('Found token metadata:', metadata);
            return {
              token_address: tokenIdentifier,
              token_icon: metadata.logoURI || '',
              token_name: metadata.name || 'Unknown Token',
              token_symbol: metadata.symbol || 'UNKNOWN',
              token_decimals: metadata.decimals || 9,
              usd_price: metadata.price || 0,
              usd_value: 0,
              formatted_amount: 0
            };
          } else {
            const errorText = await metadataResponse.text();
            console.log('Metadata fetch failed, status:', metadataResponse.status, 'error:', errorText);
            console.log('Falling back to Jupiter list');
          }
        } catch (error) {
          console.error('Error fetching token metadata:', error);
        }
      }

      // Try Jupiter token list as fallback
      console.log('Fetching Jupiter token list');
      const response = await fetch(JUPITER_TOKEN_LIST_URL);
      console.log('Jupiter list response status:', response.status);
      if (!response.ok) {
        throw new Error('Failed to fetch Jupiter token list');
      }
      const tokens = await response.json();
      console.log('Got Jupiter tokens:', tokens.length);

      let foundToken = null;

      // Try to find by address first
      if (SOLANA_ADDRESS_REGEX.test(tokenIdentifier)) {
        foundToken = tokens.find((t: any) => t.address === tokenIdentifier);
        console.log('Looked up by address in Jupiter list, found:', !!foundToken);
      }
      
      // If not found by address, try symbol/name
      if (!foundToken) {
        foundToken = tokens.find((t: any) => 
          t.symbol.toLowerCase() === tokenIdentifier.toLowerCase() ||
          t.name.toLowerCase() === tokenIdentifier.toLowerCase()
        );
        console.log('Looked up by symbol/name in Jupiter list, found:', !!foundToken);
      }

      if (foundToken) {
        console.log('Found token in Jupiter list:', foundToken);
        return {
          token_address: foundToken.address,
          token_icon: foundToken.logoURI || '',
          token_name: foundToken.name,
          token_symbol: foundToken.symbol,
          token_decimals: foundToken.decimals,
          usd_price: 0,
          usd_value: 0,
          formatted_amount: 0
        };
      }

      console.log('Token not found:', tokenIdentifier);
      throw new Error(`Token not found: ${tokenIdentifier}`);
    } catch (error) {
      console.error('Error finding token:', error);
      throw error;
    }
  };

  // Effect to find tokens and execute swap
  useEffect(() => {
    // Don't initialize if we don't have the required parameters
    // or if we already have a transaction hash or success status
    // or if this is a successful historical invocation
    // or if user rejected the transaction
    // or if we've already attempted execution
    if (!fromTokenName || !toTokenName || !amount || transactionHash || status === 'success' || isHistoricalSuccess || userRejected || attemptedExecution) {
      return;
    }

    // Reset init ref when parameters change
    initRef.current = false;
    
    if (initRef.current) {
      return;
    }
    initRef.current = true;

    let mounted = true;
    
    const init = async () => {
      if (!mounted) return;

      try {
        // Find fromToken
        let from: SwapToken | null = null;
        try {
          from = await findToken(fromTokenName);
          if (!mounted) return;
          
          if (!from) {
            throw new Error(`Could not find token: ${fromTokenName}`);
          }
          
          setFromToken(from);
          
          let to: SwapToken | null = null;
          try {
            to = await findToken(toTokenName);
            if (!mounted) return;
            
            if (!to) {
              throw new Error(`Could not find token: ${toTokenName}`);
            }
            
            setToToken(to);
            setStatus('ready');
            
          } catch (error: any) {
            if (mounted) {
              setError(`Failed to find ${toTokenName}: ${error.message}`);
              setStatus('error');
              setAttemptedExecution(true);
            }
          }
        } catch (error: any) {
          if (mounted) {
            setError(`Failed to find ${fromTokenName}: ${error.message}`);
            setStatus('error');
            setAttemptedExecution(true);
          }
        }
      } catch (error: any) {
        if (mounted) {
          setError(error.message || 'Failed to find tokens');
          setStatus('error');
          setAttemptedExecution(true);
        }
      }
    };

    init().catch(error => {
      if (mounted) {
        setError(error.message || 'An unexpected error occurred');
        setStatus('error');
        setAttemptedExecution(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, [fromTokenName, toTokenName, amount, slippage, status, transactionHash, isHistoricalSuccess, userRejected, attemptedExecution]);

  // Separate effect to handle swap execution after tokens are ready
  useEffect(() => {
    if (transactionHash || userRejected || attemptedExecution) {
      return;
    }
    
    if (
      status === 'ready' &&
      fromToken &&
      toToken &&
      activeWallet &&
      user
    ) {
      setAttemptedExecution(true);
      executeTokenSwap();
    }
  }, [status, fromToken, toToken, activeWallet, user, transactionHash, userRejected, attemptedExecution]);

  // Function to execute the swap
  const executeTokenSwap = async () => {
    if (!activeWallet) {
      const error = 'No wallet connected';
      setError(error);
      setStatus('error');
      return;
    }

    try {
      setStatus('executing');
      setError(null);

      if (!fromToken?.token_address || !toToken?.token_address) {
        throw new Error('Complete token information not available');
      }

      const signature = await executeSwap({
        fromToken,
        toToken,
        amount,
        slippage,
        wallet: activeWallet
      });

      if (!signature) {
        // If no signature returned, assume user rejected
        setUserRejected(true);
        setError('Transaction was cancelled');
        setStatus('error');
        return;
      }

      setTransactionHash(signature);
      setStatus('success');

      // Update tool invocation status
      if (chatId) {
        try {
          const updateResult = await fetch('/api/chat/tool-invocation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chatId,
              toolCallId,
              status: 'success',
              result: {
                transactionHash: signature,
                status: 'success',
                fromToken: fromToken.token_symbol,
                toToken: toToken.token_symbol,
                amount,
                slippage
              }
            } as UpdateToolInvocationParams)
          });

          if (!updateResult.ok) {
            const errorText = await updateResult.text();
            console.error('Failed to update tool invocation:', errorText);
          }
        } catch (error) {
          console.error('Error updating tool invocation:', error);
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to execute swap';
      
      // More comprehensive check for user rejection
      const rejectionMessages = [
        'user rejected',
        'user denied',
        'user cancelled',
        'user canceled',
        'transaction was cancelled',
        'transaction was canceled',
        'rejected by user',
        'rejected the request',
        'cancelled by user',
        'canceled by user'
      ];
      
      const wasRejected = rejectionMessages.some(msg => 
        errorMessage.toLowerCase().includes(msg.toLowerCase())
      );
      
      if (wasRejected || !error.signature) {
        setUserRejected(true);
      }
      
      setError(errorMessage);
      setStatus('error');

      // Update tool invocation status
      if (chatId) {
        try {
          const updateResult = await fetch('/api/chat/tool-invocation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chatId,
              toolCallId,
              status: 'error',
              result: {
                status: 'error',
                error: errorMessage,
                fromToken: fromToken?.token_symbol,
                toToken: toToken?.token_symbol,
                amount,
                slippage
              }
            } as UpdateToolInvocationParams)
          });

          if (!updateResult.ok) {
            const errorText = await updateResult.text();
            console.error('Failed to update tool invocation:', errorText);
          }
        } catch (error) {
          console.error('Error updating tool invocation:', error);
        }
      }
    }
  };

  // Render UI based on status
  return (
    <div className="p-4 bg-zinc-800 rounded-lg">
      <div className="flex flex-col gap-2">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {status === 'searching' && (
            <>
              <div className="w-4 h-4 rounded-full bg-yellow-500/20 animate-pulse" />
              <span className="text-sm text-zinc-400">Looking up tokens...</span>
            </>
          )}
          {status === 'ready' && (
            <>
              <div className="w-4 h-4 rounded-full bg-green-500/20" />
              <span className="text-sm text-zinc-400">Found tokens, preparing swap...</span>
            </>
          )}
          {status === 'executing' && (
            <>
              <div className="w-4 h-4 rounded-full bg-blue-500/20 animate-pulse" />
              <span className="text-sm text-zinc-400">Executing swap...</span>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-4 h-4 rounded-full bg-green-500/20" />
              <span className="text-sm text-zinc-400">
                Swap completed! Transaction hash:{' '}
                <a
                  href={`https://solscan.io/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  {transactionHash?.slice(0, 8)}...{transactionHash?.slice(-8)}
                </a>
              </span>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-4 h-4 rounded-full bg-red-500/20" />
              <span className="text-sm text-red-400">{error}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Wrap component in memo to prevent unnecessary re-renders
const ExecuteSwap = React.memo(ExecuteSwapComponent, (prevProps, nextProps) => {
  // Only re-render if toolCallId or toolInvocation.args changes
  const prevArgs = 'args' in prevProps.toolInvocation ? prevProps.toolInvocation.args : null;
  const nextArgs = 'args' in nextProps.toolInvocation ? nextProps.toolInvocation.args : null;
  
  const argsEqual = JSON.stringify(prevArgs) === JSON.stringify(nextArgs);
  const idEqual = prevProps.toolCallId === nextProps.toolCallId;
  
  return argsEqual && idEqual;
});

export default ExecuteSwap;