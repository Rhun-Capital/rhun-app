'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useSolanaWallets, getAccessToken } from '@privy-io/react-auth';
import { ProxyConnection, executeSwap, getQuote } from '../utils/solana';
import { RefreshCw } from 'lucide-react';
import { useParams, usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import LoadingIndicator from './loading-indicator';
import { SwapModalProps, Token } from '../types/wallet';
import { PaginatedTokens, JupiterToken, SelectionType } from '../types/jupiter';
import { TokenIconProps } from '../types/ui';

// Modal portal component to ensure modal is rendered at the document root
const ModalPortal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted ? createPortal(children, document.body) : null;
};

const TOKENS_PER_PAGE = 10;
const JUPITER_TOKEN_LIST_URL = `https://tokens.jup.ag/tokens?tags=community`;  // Using strict list for better performance

// Token icon component with fallback
const TokenIcon = ({ logoURI, symbol, size = 40, className }: TokenIconProps) => {
  const [error, setError] = useState(false);
  const firstLetter = symbol.charAt(0).toUpperCase();
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-indigo-500',
  ];
  
  const colorIndex = firstLetter.charCodeAt(0) % colors.length;
  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${size * 0.4}px`, // Scale font size relative to container size
  };

  if (error || !logoURI) {
    return (
      <div 
        className={`rounded-full ${colors[colorIndex]} flex items-center justify-center text-white font-medium ${className || ''}`}
        style={containerStyle}
      >
        {firstLetter}
      </div>
    );
  }

  return (
    <div className={`relative ${className || ''}`} style={containerStyle}>
      <Image
        src={logoURI}
        alt={symbol}
        width={size}
        height={size}
        className="rounded-full"
        onError={() => setError(true)}
      />
    </div>
  );
};

const SwapModal = ({ isOpen, onClose, tokens, solanaBalance, agent, onSwapComplete }: SwapModalProps & { agent: { wallets: { solana: string } } }) => {
  const { wallets: solanaWallets, ready } = useSolanaWallets();
  const params = useParams();
  const pathname = usePathname();
  const { user  } = usePrivy();
  const SELECTED_WALLET_KEY = 'rhun_selected_wallet_address';
  let wallet = localStorage.getItem(SELECTED_WALLET_KEY);
  let activeWallet = null;
      
  // Determine active wallet with proper checks
  if (wallet && solanaWallets.find(w => w.address.toLowerCase() === wallet.toLowerCase())) {
    activeWallet = solanaWallets.find(w => w.address.toLowerCase() === wallet.toLowerCase())
  } else if (agent?.wallets?.solana && solanaWallets.find(w => w.address.toLowerCase() === agent.wallets.solana.toLowerCase())) {
    activeWallet = solanaWallets.find(w => w.address.toLowerCase() === agent.wallets.solana.toLowerCase())
  } else {
    activeWallet = solanaWallets[0] || null
  }


  
  const [selecting, setSelecting] = useState<SelectionType>(null);
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [slippage, setSlippage] = useState<string>('1.0');
  const [priceLoading, setPriceLoading] = useState(false);
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'confirmed' | 'failed' | null>(null);
  const connection = new ProxyConnection({ commitment: 'confirmed' });

  const [paginatedTokens, setPaginatedTokens] = useState<PaginatedTokens>({
    tokens: [],
    currentPage: 1,
    totalTokens: 0
  });
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);


  // Fetch tokens with pagination
  const fetchJupiterTokens = async (page: number = 1, search: string = '') => {
    try {
      setIsLoadingTokens(true);
      const response = await fetch(JUPITER_TOKEN_LIST_URL);
      if (!response.ok) throw new Error('Failed to fetch tokens');
      const allTokens: JupiterToken[] = await response.json();

      // Filter tokens based on search
      const filteredTokens = allTokens.filter(token => 
        token.name.toLowerCase().includes(search.toLowerCase()) ||
        token.symbol.toLowerCase().includes(search.toLowerCase()) ||
        token.address.toLowerCase().includes(search.toLowerCase())
      );

      // Calculate pagination
      const startIndex = (page - 1) * TOKENS_PER_PAGE;
      const endIndex = startIndex + TOKENS_PER_PAGE;
      const paginatedResults = filteredTokens.slice(startIndex, endIndex);

      setPaginatedTokens({
        tokens: paginatedResults,
        currentPage: page,
        totalTokens: filteredTokens.length
      });
    } catch (err) {
      console.error('Error fetching Jupiter tokens:', err);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  useEffect(() => {
    getQuote(
        fromToken,
        toToken,
        amount,
        slippage
      
    ).then((quote) => {
      setQuote(quote);
    });
  }, [fromToken, toToken, amount, slippage, getQuote]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJupiterTokens(1, searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  
  // const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


  const checkTransactionStatus = async (signature: string) => {
    let retries = 0;
    const maxRetries = 45; // 90 seconds total (45 * 2 second intervals)
    
    const checkStatus = async () => {
      
      try {
        const status = await connection.getSignatureStatus(signature);
        if (status.value && Array.isArray(status.value) && status.value[0]?.confirmationStatus === 'finalized') {
          setTransactionStatus('confirmed');
          setSuccess(signature);
          onSwapComplete?.();
          return true;          
        }        

        if (status?.value?.err) {
          setTransactionStatus('failed');
          setError(`Transaction failed: ${JSON.stringify(status.value.err)}`);
          return false;
        }

        return null;
      } catch (error) {
        console.error('Status check error:', error);
        return null;
      }
    };

    // Initial check
    const initialStatus = await checkStatus();
    if (initialStatus !== null) return;

    // Start polling
    const intervalId = setInterval(async () => {
      retries++;
      const status = await checkStatus();
      
      if (status !== null || retries >= maxRetries) {
        clearInterval(intervalId);
        if (status === null && retries >= maxRetries) {
          // Don't mark as failed, just note it's taking longer
          setError(`Transaction confirmation is taking longer than expected. Please check the transaction status on Solscan. Signature: ${signature}`);
        }
      }
    }, 2000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  };  

  const handleSwap = async () => {

  
    // Check balance before proceeding
    if (fromToken && parseFloat(amount) > fromToken.formatted_amount) {
      setError(`Insufficient ${fromToken.token_symbol} balance. You have ${fromToken.formatted_amount} but trying to swap ${amount}`);
      return;
    }
  
    if (!fromToken || !toToken || !amount || parseFloat(amount) <= 0) {
      setError('Invalid swap parameters');
      return;
    }
  
    try {
      setLoading(true);
      setError('');
      const signature = await executeSwap(
        {
          fromToken,
          toToken,
          amount,
          slippage: parseFloat(slippage),
          wallet: activeWallet
        }
      );
      setTransactionStatus('pending');
      setPendingSignature(signature);
      checkTransactionStatus(signature);
    } catch (error: any) {
      console.error('Swap error:', error);
      setTransactionStatus('failed');
      setError(error.message || 'Failed to complete swap');
      setLoading(false);
    }
  };

  // const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
  //   const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
  //   if (
  //     scrollHeight - scrollTop - clientHeight < 50 &&
  //     !isLoadingTokens &&
  //     paginatedTokens.tokens.length < paginatedTokens.totalTokens
  //   ) {
  //     fetchJupiterTokens(paginatedTokens.currentPage + 1, searchTerm);
  //   }
  // };  

  const getSolPrice = async () => {
    const accessToken = await getAccessToken();
    // fetch token details from coingecko using the extensions.coingeckoId 
    const coin = await fetch('/api/coingecko/coins/solana', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
    });
    const coinItem = await coin.json()    
    return coinItem.market_data.current_price.usd
}    

  const resetForm = () => {
    setSelecting(null);
    setFromToken(null);
    setToToken(null);
    setAmount('');
    setError('');
    setSuccess('');
    setQuote(null);
    setSearchTerm('');
    setLoading(false);
    setPendingSignature(null);
    setTransactionStatus(null);
    setPriceLoading(false);
  };

  const handleTokenSelect = async (token: Token | JupiterToken | 'SOL') => {
    let selectedToken: Token;
    if (token === 'SOL') {
      setPriceLoading(true);
      const price = await getSolPrice()
      setPriceLoading(false);
      selectedToken = {
        token_address: 'SOL',
        token_account: activeWallet?.address || '',
        token_icon: solanaBalance?.logoURI || '',
        token_name: 'Solana',
        usd_value: solanaBalance?.usdValue || 0,
        usd_price: price,
        formatted_amount: solanaBalance?.amount || 0,
        token_symbol: 'SOL',
        token_decimals: 9,
        amount: solanaBalance?.amount || 0,
        owner: activeWallet?.address || ''
      };
    } else if ('token_address' in token) {
      selectedToken = token;
    } else {
      selectedToken = {
        token_address: token.address,
        token_account: activeWallet?.address || '',
        token_icon: token.logoURI || '',
        token_name: token.name,
        usd_value: 0,
        usd_price: 0,
        formatted_amount: 0,
        token_symbol: token.symbol,
        token_decimals: token.decimals,
        amount: 0,
        owner: activeWallet?.address || ''
      };
    }

    if (selecting === 'from') {
      setFromToken(selectedToken);
    } else {
      setToToken(selectedToken);
    }
    setSelecting(null);
    setSearchTerm('');
  };

  const handleSlippageChange = (value: string) => {
    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleanValue.split('.');
    const formatted = parts.length > 2 ? `${parts[0]}.${parts[1]}` : cleanValue;
    
    // Limit to 1 decimal place and max value of 50
    const parsed = parseFloat(formatted);
    if (!isNaN(parsed) && parsed <= 50) {
      setSlippage(formatted);
    }
  };  


  const renderSuccessState = () => {
    if (!pendingSignature && !success) return null;
  
    const signature = success || pendingSignature;
    const isPending = transactionStatus === 'pending';
    
    return (
      <div className="inset-0 bg-zinc-900 flex flex-col items-center justify-center rounded-lg px-6 h-[400px]">
        {/* Status Icon */}
        {transactionStatus === 'confirmed' ? (
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
              <RefreshCw className="w-8 h-8 text-yellow-500 animate-spin" />
          </div>
        )}
  
        {/* Status Text */}
        <h3 className="text-xl font-bold text-white mb-2">
          {isPending ? 'Transaction Pending' : 'Swap Successful'}
        </h3>
        
        <p className="text-zinc-400 text-center mb-4">
          {isPending 
            ? 'Please wait while your transaction is being confirmed...' 
            : `Successfully swapped ${amount} ${fromToken?.token_symbol} for ${
        quote ? (quote.outAmount / Math.pow(10, toToken?.token_decimals || 1)).toFixed(6) : '?'
      } ${toToken?.token_symbol}`
          }
        </p>
  
        {/* Transaction Link */}
        <a
          href={`https://solscan.io/tx/${signature}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          View on Solscan
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
  
        {/* New Swap Button (only show if confirmed) */}
        {transactionStatus === 'confirmed' && (
          <button
            onClick={() => {
              resetForm();
            }}
            className="mt-6 px-6 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
          >
            Make Another Swap
          </button>
        )}
      </div>
    );
  };

  // Modified renderTokenList function
  const renderTokenList = () => {
    return (
      <>
        <button
          onClick={() => {
            setSelecting(null);
            setSearchTerm('');
          }}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold mb-6 text-white">Select Token</h2>

        {/* Search Input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search tokens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
          />
        </div>

        <div 
          className="space-y-2 max-h-[60vh] overflow-y-auto"
        >
            {/* SOL Option */}
            {solanaBalance && (
            <div
              onClick={() => handleTokenSelect('SOL')}
              className="bg-zinc-800 p-3 rounded-lg hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TokenIcon logoURI={solanaBalance.logoURI} symbol="SOL" size={32} />
                <div>
                <div className="text-white">Solana</div>
                <div className="text-sm text-zinc-400">{solanaBalance.amount} SOL</div>
                </div>
              </div>
              <div className="text-sm text-zinc-400">
                {priceLoading ? <LoadingIndicator/> : `$${solanaBalance.usdValue && solanaBalance.usdValue.toFixed(2)}`}
              </div>
              </div>
            </div>
            )}

          {/* Token List */}
          {selecting === 'from' ? (
            // Show wallet tokens for "From" selection
            tokens.map((token: Token) => (
              <div
                key={token.token_address}
                onClick={() => handleTokenSelect(token)}
                className="bg-zinc-800 p-3 rounded-lg hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TokenIcon logoURI={token.token_icon} symbol={token.token_symbol} size={32} />
                  <div>
                    <div className="text-white">{token.token_name}</div>
                    <div className="text-sm text-zinc-400">
                      <div>{token.formatted_amount} {token.token_symbol}</div>
                      <div className="text-xs text-zinc-500 truncate max-w-[200px]">
                        {token.token_address.slice(0, 4)}...{token.token_address.slice(-4)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-zinc-400">${token.usd_value.toFixed(2)}</div>
              </div>
              </div>
            ))
          ) : (
            // Show paginated Jupiter tokens for "To" selection
            <>
              {paginatedTokens.tokens.map((token) => (
                <div
                  key={token.address}
                  onClick={() => handleTokenSelect(token)}
                  className="bg-zinc-800 p-3 rounded-lg hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TokenIcon logoURI={token.logoURI} symbol={token.symbol} size={32} />
                      <div>
                        <div className="text-white">{token.name}</div>
                        <div className="text-sm text-zinc-400">
                          <div>{token.symbol}</div>
                          <div className="text-xs text-zinc-500 truncate max-w-[200px]">
                            {token.address.slice(0, 4)}...{token.address.slice(-4)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {isLoadingTokens && (
                <div className="py-4 text-center text-zinc-400">
                  Loading more tokens...
                </div>
              )}
            </>
          )}
        </div>
      </>
    );
  };

    // Add slippage settings UI component
    const renderSlippageSettings = () => {
        return (
          <div className="mt-4 p-4 bg-zinc-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Slippage Tolerance</span>
              <button
                onClick={() => setShowSlippageSettings(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={slippage}
                onChange={(e) => handleSlippageChange(e.target.value)}
                className="w-20 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-white text-right"
              />
              <span className="text-zinc-400">%</span>
            </div>
            <div className="flex gap-2 mt-2">
              {['0.5', '1.0', '3.0'].map((value) => (
                <button
                  key={value}
                  onClick={() => setSlippage(value)}
                  className={`px-2 py-1 rounded text-sm ${
                    slippage === value
                      ? 'bg-indigo-500 text-white'
                      : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                  }`}
                >
                  {value}%
                </button>
              ))}
            </div>
          </div>
        );
      };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]">
        <div className="bg-zinc-900 rounded-lg p-6 w-full mb-30 max-w-md mx-4 relative shadow-xl">
          {/* Main Swap UI */}
          {!selecting ? (
            <>
              <button
                onClick={() => {
                  onClose();
                  resetForm();
                  onSwapComplete?.();
                }}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {success || pendingSignature ? renderSuccessState() :

                  <div>
                  <h2 className="text-xl font-bold mb-6 text-white">Swap Tokens</h2>

                  <div className="space-y-4">
                  {/* From Token Selection */}
                  <div className="space-y-2">
                      <label className="text-sm text-zinc-400">From</label>
                      <button
                      onClick={() => setSelecting('from')}
                      className="w-full bg-zinc-800 p-3 rounded-lg hover:bg-zinc-700 transition-colors flex items-center justify-between"
                      >
                      {fromToken ? (
                          <div className="flex items-center gap-2">
                          <TokenIcon logoURI={fromToken.token_icon} symbol={fromToken.token_symbol} size={24} />
                          <span className="text-white">{fromToken.token_name}</span>
                          <span className="text-zinc-400 text-sm">
                              Balance: {fromToken.formatted_amount} {fromToken.token_symbol}
                          </span>
                          </div>
                      ) : (
                          <span className="text-zinc-400">Select token</span>
                      )}
                      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      </button>

                      {/* Amount Input */}
                      <div className="relative">
                      <input
                          type="number"
                          placeholder="Enter amount"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
                      />
                      <button
                          onClick={() => fromToken && setAmount(fromToken.formatted_amount.toString())}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                          MAX
                      </button>
                      </div>
                  </div>

                  {/* Settings Button */}
                  <div className="flex justify-end">
                      <button
                      onClick={() => setShowSlippageSettings(!showSlippageSettings)}
                      className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                      >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm">{slippage}% slippage</span>
                      </button>
                  </div>

                  {/* Slippage Settings */}
                  {showSlippageSettings && renderSlippageSettings()}              

                  {/* Swap Direction Arrow */}
                  <div className="flex justify-center">
                      <button 
                      onClick={() => {
                          const temp = fromToken;
                          setFromToken(toToken);
                          setToToken(temp);
                      }}
                      className="bg-zinc-800 p-2 rounded-full hover:bg-zinc-700 transition-colors"
                      >
                      <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                      </button>
                  </div>

                  {/* To Token Selection */}
                  <div className="space-y-2">
                      <label className="text-sm text-zinc-400">To</label>
                      <button
                      onClick={() => setSelecting('to')}
                      className="w-full bg-zinc-800 p-3 rounded-lg hover:bg-zinc-700 transition-colors flex items-center justify-between"
                      >
                      {toToken ? (
                          <div className="flex items-center gap-2">
                          <TokenIcon logoURI={toToken.token_icon} symbol={toToken.token_symbol} size={24} />
                          <span className="text-white">{toToken.token_name}</span>
                          </div>
                      ) : (
                          <span className="text-zinc-400">Select token</span>
                      )}
                      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      </button>
                  </div>

                  {/* Swap Button */}
                  <button
                      onClick={() => {
                          handleSwap();
                      }}
                      disabled={loading || !fromToken || !toToken || !amount}
                      className="w-full bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                      {loading ? 'Swapping...' : 'Swap'}
                  </button>
                  </div></div>}
            </>
          ) : renderTokenList()}

          {/* Error and Success Messages */}
          {error && (
            <div className="mt-4 bg-red-500/20 text-red-200 p-4 rounded-md border border-red-500/40 max-w-full overflow-auto">
              {error}
            </div>
          )}

          
        </div>
      </div>
    </ModalPortal>
  );
};

export default SwapModal;