'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';
import { PublicKey, Connection, Transaction, VersionedTransaction, AddressLookupTableAccount } from '@solana/web3.js';
import base58 from 'bs58';

import Image from 'next/image';
const TOKENS_PER_PAGE = 50;
const JUPITER_TOKEN_LIST_URL = 'https://token.jup.ag/strict';  // Using strict list for better performance
const JUPITER_V6_QUOTE_API = 'https://quote-api.jup.ag/v6';


interface PaginatedTokens {
  tokens: JupiterToken[];
  currentPage: number;
  totalTokens: number;
}

interface Token {
  token_address: string;
  token_icon: string;
  token_name: string;
  usd_value: number;
  formatted_amount: number;
  token_symbol: string;
  token_decimals: number;
}

interface JupiterToken {
  address: string;
  chainId: number;
  decimals: number;
  logoURI: string;
  name: string;
  symbol: string;
  tags: string[];
}

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: Token[];
  solanaBalance?: {
    amount: number;
    usdValue: number;
    logoURI: string;
  };
}

interface PaginatedTokens {
  tokens: JupiterToken[];
  currentPage: number;
  totalTokens: number;
}

type SelectionType = 'from' | 'to' | null;

const SwapModal = ({ isOpen, onClose, tokens, solanaBalance, agent }: SwapModalProps & { agent: { wallets: { solana: string } } }) => {
  const { wallets: solanaWallets } = useSolanaWallets();
  const activeWallet = solanaWallets.find(
    wallet => wallet.address.toLowerCase() === agent.wallets.solana.toLowerCase()
  );

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
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

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
    getQuote();
  }, [fromToken, toToken, amount]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJupiterTokens(1, searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSwap = async () => {
    if (!activeWallet || !quote || !fromToken || !toToken) return;
  
    try {
      setLoading(true);
      setError('');
  
      const connection = new Connection(
        'https://api.devnet.solana.com',
        'confirmed'
      );
  
      // Get swap transaction in smaller chunks
      const swapResponse = await fetch(`${JUPITER_V6_QUOTE_API}/swap-instructions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: activeWallet.address,
          wrapUnwrapSOL: true,
          asLegacyTransaction: true,
          // Request computeUnit instructions
          computeUnitPriceMicroLamports: 50
        })
      });
  
      if (!swapResponse.ok) {
        const errorData = await swapResponse.json();
        console.error('Swap API Error:', errorData);
        throw new Error(errorData.message || 'Failed to prepare swap');
      }
  
      const { swapTransaction, setupTransaction, cleanupTransaction, signers } = await swapResponse.json();
  
      // Function to process a single transaction
      const processTransaction = async (encodedTx: string | null) => {
        if (!encodedTx) return null;
        
        const serializedTransaction = Buffer.from(encodedTx, 'base64');
        const transaction = Transaction.from(serializedTransaction);
        
        console.log('Processing transaction');
        const signature = await activeWallet.sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature);
        return signature;
      };
  
      // Execute transactions in sequence
      let signatures = [];
  
      if (setupTransaction) {
        console.log('Processing setup transaction');
        const setupSignature = await processTransaction(setupTransaction);
        if (setupSignature) signatures.push(setupSignature);
      }
  
      console.log('Processing main swap transaction');
      const swapSignature = await processTransaction(swapTransaction);
      if (swapSignature) signatures.push(swapSignature);
  
      if (cleanupTransaction) {
        console.log('Processing cleanup transaction');
        const cleanupSignature = await processTransaction(cleanupTransaction);
        if (cleanupSignature) signatures.push(cleanupSignature);
      }
  
      console.log('All transactions completed:', signatures);
  
      setSuccess(signatures.join(', '));
      setFromToken(null);
      setToToken(null);
      setAmount('');
      setQuote(null);
  
    } catch (err: any) {
      console.error('Swap error:', err);
      if (err.message?.includes('slippage tolerance exceeded')) {
        setError('Price moved too much during swap. Please try again.');
      } else {
        setError(err.message || 'Failed to complete swap');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (
      scrollHeight - scrollTop - clientHeight < 50 &&
      !isLoadingTokens &&
      paginatedTokens.tokens.length < paginatedTokens.totalTokens
    ) {
      fetchJupiterTokens(paginatedTokens.currentPage + 1, searchTerm);
    }
  };  

  const renderSuccessState = () => {
    if (!success) return null;
  
    return (
      <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center rounded-lg px-6">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
          <svg 
            className="w-8 h-8 text-green-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
        </div>
  
        {/* Success Text */}
        <h3 className="text-xl font-bold text-white mb-2">
          Transaction Successful
        </h3>
        
        {/* Amount and Token Info */}
        <p className="text-zinc-400 text-center mb-4">
          Your swap has been processed
        </p>
  
        {/* Transaction Link */}
        <a
          href={`https://solscan.io/tx/${success}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          View on Solscan
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
            />
          </svg>
        </a>
  
        {/* New Swap Button */}
        <button
          onClick={() => setSuccess('')}
          className="mt-6 px-6 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
        >
          Make Another Swap
        </button>
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
          onScroll={handleScroll}
        >
          {/* SOL Option */}
          {solanaBalance && (
            <div
              onClick={() => handleTokenSelect('SOL')}
              className="bg-zinc-800 p-3 rounded-lg hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image src={solanaBalance.logoURI} alt="SOL" width={32} height={32} className="rounded-full"/>
                  <div>
                    <div className="text-white">Solana</div>
                    <div className="text-sm text-zinc-400">{solanaBalance.amount} SOL</div>
                  </div>
                </div>
                <div className="text-sm text-zinc-400">${solanaBalance.usdValue.toFixed(2)}</div>
              </div>
            </div>
          )}

          {/* Token List */}
          {selecting === 'from' ? (
            // Show wallet tokens for "From" selection
            tokens.map((token) => (
              <div
                key={token.token_address}
                onClick={() => handleTokenSelect(token)}
                className="bg-zinc-800 p-3 rounded-lg hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                {/* ... (token display remains the same) ... */}
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
                      <Image src={token.logoURI} alt={token.name} width={32} height={32} className="rounded-full"/>
                      <div>
                        <div className="text-white">{token.name}</div>
                        <div className="text-sm text-zinc-400">{token.symbol}</div>
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

  const resetForm = () => {
    setSelecting(null);
    setFromToken(null);
    setToToken(null);
    setAmount('');
    setError('');
    setSuccess('');
    setQuote(null);
    setSearchTerm('');
  };

  const handleTokenSelect = (token: Token | JupiterToken | 'SOL') => {
    let selectedToken: Token;
    
    if (token === 'SOL') {
      selectedToken = {
        token_address: 'SOL',
        token_icon: solanaBalance?.logoURI || '',
        token_name: 'Solana',
        usd_value: solanaBalance?.usdValue || 0,
        formatted_amount: solanaBalance?.amount || 0,
        token_symbol: 'SOL',
        token_decimals: 9
      };
    } else if ('token_address' in token) {
      selectedToken = token;
    } else {
      selectedToken = {
        token_address: token.address,
        token_icon: token.logoURI,
        token_name: token.name,
        usd_value: 0,
        formatted_amount: 0,
        token_symbol: token.symbol,
        token_decimals: token.decimals
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


  const getQuote = async () => {
    if (!fromToken || !toToken || !amount || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }

    try {
      const inputMint = fromToken.token_address === 'SOL' 
        ? 'So11111111111111111111111111111111111111112' 
        : fromToken.token_address;
      
      const outputMint = toToken.token_address === 'SOL'
        ? 'So11111111111111111111111111111111111111112'
        : toToken.token_address;

      const amountInDecimals = Math.floor(
        parseFloat(amount) * Math.pow(10, fromToken.token_decimals)
      );

      // Convert slippage percentage to basis points (1% = 100 basis points)
      const slippageBps = Math.floor(parseFloat(slippage) * 100);

      const response = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInDecimals}&slippageBps=${slippageBps}`
      );

      if (!response.ok) throw new Error('Failed to get quote');

      const quoteData = await response.json();
      setQuote(quoteData);
      setError('');
    } catch (err) {
      console.error('Error getting quote:', err);
      setError('Failed to get quote');
      setQuote(null);
    }
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md mx-4 relative shadow-xl border border-zinc-700">
        {/* Main Swap UI */}
        {!selecting ? (
          <>
            <button
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {success ? renderSuccessState() :

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
                        <Image src={fromToken.token_icon} alt={fromToken.token_name} width={24} height={24} className="rounded-full"/>
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
                        <Image src={toToken.token_icon} alt={toToken.token_name} width={24} height={24} className="rounded-full"/>
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
          <div className="mt-4 bg-red-500/20 text-red-200 p-4 rounded-md border border-red-500/40">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 bg-green-500/20 text-green-200 p-4 rounded-md border border-green-500/40">
            {success}
          </div>
        )}

        
      </div>
    </div>
  );
};

export default SwapModal;