'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useSolanaWallets, getAccessToken } from '@privy-io/react-auth';
import { PublicKey, Connection, Commitment, GetLatestBlockhashConfig, SendOptions, Transaction, VersionedTransaction, AddressLookupTableAccount } from '@solana/web3.js';
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



class ProxyConnection extends Connection {
  constructor(config?: { commitment?: Commitment }) {
    super('https://api.mainnet-beta.solana.com', config);
  }

  private async customRpcRequest(method: string, params: any[]) {
    try {
      const response = await fetch('/api/solana/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params,
        }),
      });

      if (!response.ok) {
        throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.result;
    } catch (error) {
      console.error('RPC request failed:', error);
      throw error;
    }
  }

  async _rpcRequest(method: string, params: any[]) {
    const result = await this.customRpcRequest(method, params);
    return {
      result,
      id: 1,
      jsonrpc: '2.0'
    };
  }

  async getLatestBlockhash(
    commitmentOrConfig?: Commitment | GetLatestBlockhashConfig
  ): Promise<Readonly<{
    blockhash: string;
    lastValidBlockHeight: number;
  }>> {
    const config = typeof commitmentOrConfig === 'string' 
      ? { commitment: commitmentOrConfig }
      : commitmentOrConfig;

    const params = config ? [config] : [];
    const result = await this.customRpcRequest('getLatestBlockhash', params);
    
    return {
      blockhash: result.value.blockhash,
      lastValidBlockHeight: result.value.lastValidBlockHeight,
    };
  }

  async sendRawTransaction(
    rawTransaction: Buffer | Uint8Array | Array<number>,
    options?: SendOptions
  ): Promise<string> {
    const buffer = Buffer.from(rawTransaction);
    
    // Send base64 encoded transaction
    const params = [
      buffer.toString('base64'),
      {
        encoding: 'base64',
        ...options
      }
    ];

    try {
      const signature = await this.customRpcRequest('sendTransaction', params);
      return signature;
    } catch (error) {
      console.error('Send transaction error:', error);
      throw error;
    }
  }
}


  

const SwapModal = ({ isOpen, onClose, tokens, solanaBalance, agent }: SwapModalProps & { agent: { wallets: { solana: string } } }) => {
  const { wallets: solanaWallets } = useSolanaWallets();
  const activeWallet = solanaWallets.find(
    wallet => wallet.address.toLowerCase() === agent.wallets.solana.toLowerCase()
  );

  console.log(solanaWallets)

  console.log('activeWallet', activeWallet);

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
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'confirmed' | 'failed' | null>(null);


  // const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

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

  
  // const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  const executeSwap = async () => {
    const connection = new ProxyConnection({ commitment: 'confirmed' });
    try {
      if (!activeWallet || !activeWallet.address) {
        throw new Error('Wallet not connected');
      }
  
      // Log wallet state
      console.log('Wallet state:', {
        address: activeWallet.address,
        type: activeWallet.walletClientType,
        hasSignTransaction: !!activeWallet.signTransaction,
        hasSendTransaction: !!activeWallet.sendTransaction
      });
  
      const inputMint = fromToken?.token_address === 'SOL' 
        ? 'So11111111111111111111111111111111111111112' 
        : fromToken?.token_address;
      
      const outputMint = toToken?.token_address === 'SOL'
        ? 'So11111111111111111111111111111111111111112'
        : toToken?.token_address;
  
      // Calculate decimals amount here
      const amountInDecimals = Math.floor(
        parseFloat(amount) * Math.pow(10, fromToken?.token_decimals || 9)
      );

      console.log(amountInDecimals)
  
      const slippageBps = Math.floor(parseFloat(slippage) * 100);
  
      // Log swap parameters
      console.log('Swap parameters:', {
        inputMint,
        outputMint,
        amount,
        amountInDecimals,
        slippageBps,
        userAddress: activeWallet.address
      });
  
      // Get quote with specific options
      console.log('Fetching quote...');
      const quoteResponse = await fetch(
        `${JUPITER_V6_QUOTE_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInDecimals}&slippageBps=${slippageBps}&asLegacyTransaction=true`,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
  
      if (!quoteResponse.ok) {
        const errorText = await quoteResponse.text();
        console.error('Quote error:', errorText);
        throw new Error(`Failed to get quote: ${errorText}`);
      }
  
      const quoteData = await quoteResponse.json();
      console.log('Quote received:', {
        routes: quoteData.routesInfos?.length,
        inAmount: quoteData.inputAmount,
        outAmount: quoteData.outputAmount
      });
  
      // Get fresh blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      console.log('Got blockhash:', { blockhash, lastValidBlockHeight });
  
      // Now get the swap transaction
      console.log('Requesting swap transaction...');
      const swapRequest = {
        quoteResponse: quoteData,
        userPublicKey: activeWallet.address,
        asLegacyTransaction: true,
        computeUnitPriceMicroLamports: 1000,
        useTokenLedger: false
      };
  
      const swapResponse = await fetch(`${JUPITER_V6_QUOTE_API}/swap`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(swapRequest)
      });
  
      if (!swapResponse.ok) {
        const errorText = await swapResponse.text();
        console.error('Swap preparation error:', errorText);
        throw new Error(`Failed to prepare swap: ${errorText}`);
      }
  
      const responseData = await swapResponse.json();
      if (!responseData.swapTransaction) {
        console.error('No swap transaction in response:', responseData);
        throw new Error('No swap transaction received from API');
      }
  
      // Log transaction data
      console.log('Got swap transaction data');
  
      // Decode transaction
      console.log('Decoding transaction...');
      const serializedTransaction = Buffer.from(responseData.swapTransaction, 'base64');
      const transaction = Transaction.from(serializedTransaction);
  
      // Set transaction parameters
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(activeWallet.address);
  
      // Log transaction details
      console.log('Transaction prepared:', {
        numInstructions: transaction.instructions.length,
        recentBlockhash: transaction.recentBlockhash,
        feePayer: transaction.feePayer.toBase58(),
        signers: transaction.signatures.length
      });
  
      // Try sending transaction
      console.log('Sending transaction to wallet for approval...');
      const signature = await activeWallet.sendTransaction(
        transaction,
        connection,
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3
        }
      );
  
      console.log('Transaction submitted with signature:', signature);
  
      // Try to get immediate status
      try {
        const status = await connection.getSignatureStatus(signature);
        console.log('Immediate transaction status:', status);
      } catch (statusError) {
        console.error('Error getting immediate status:', statusError);
      }
  
      return signature;
  
    } catch (error) {
      // Log any errors in detail
      console.error('Swap execution error:', {
        error,
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name
      });
      throw error;
    }
  };

  const checkTransactionStatus = async (signature: string) => {
    let retries = 0;
    const maxRetries = 45; // 90 seconds total (45 * 2 second intervals)
    
    const checkStatus = async () => {
      const connection = new ProxyConnection({ commitment: 'confirmed' });
      try {
        const status = await connection.getSignatureStatus(signature);
        console.log('Transaction status:', status?.value);

        if (status?.value?.err) {
          setTransactionStatus('failed');
          setError(`Transaction failed: ${JSON.stringify(status.value.err)}`);
          return false;
        }

        if (status?.value?.confirmationStatus === 'confirmed' || 
            status?.value?.confirmationStatus === 'finalized') {
          setTransactionStatus('confirmed');
          setSuccess(signature);
          return true;
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
          setError(`Transaction confirmation is taking longer than expected. Please check the transaction status on Solscan.`);
        }
      }
    }, 2000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  };  

  const handleSwap = async () => {
    console.log("Starting handleSwap function");
    console.log("Token balances:", {
      fromToken: {
        symbol: fromToken?.token_symbol,
        balance: fromToken?.formatted_amount,
        decimals: fromToken?.token_decimals
      },
      swapAmount: amount,
      hasEnoughBalance: fromToken ? parseFloat(amount) <= fromToken.formatted_amount : false
    });
  
    // Check balance before proceeding
    if (fromToken && parseFloat(amount) > fromToken.formatted_amount) {
      setError(`Insufficient ${fromToken.token_symbol} balance. You have ${fromToken.formatted_amount} but trying to swap ${amount}`);
      return;
    }
  
    if (!fromToken || !toToken || !amount || parseFloat(amount) <= 0) {
      console.log("Validation failed:", { fromToken, toToken, amount });
      setError('Invalid swap parameters');
      return;
    }
  
    try {
      setLoading(true);
      setError('');
      console.log("Proceeding with swap...");
      const signature = await executeSwap();
      setTransactionStatus('pending');
      setPendingSignature(signature);
      checkTransactionStatus(signature);
    } catch (error: any) {
      console.error('Swap error:', error);
      setTransactionStatus('failed');
      setError(error.message || 'Failed to complete swap');
    } finally {
      setLoading(false);
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
  
      const slippageBps = Math.floor(parseFloat(slippage) * 100);
  
      console.log('Getting quote for:', {
        inputMint,
        outputMint,
        amount: amountInDecimals,
        slippageBps
      });
  
      const queryParams = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amountInDecimals.toString(),
        slippageBps: slippageBps.toString(),
        asLegacyTransaction: 'true'
      });
  
      const response = await fetch(
        `${JUPITER_V6_QUOTE_API}/quote?${queryParams.toString()}`
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get quote');
      }
  
      const quoteData = await response.json();
      console.log('Received quote:', quoteData);
  
      if (!quoteData) {
        throw new Error('No quote data received');
      }
  
      setQuote(quoteData);
      setError('');
    } catch (err: any) {
      console.error('Error getting quote:', err);
      setError(err.message || 'Failed to get quote');
      setQuote(null);
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
    if (!pendingSignature && !success) return null;
  
    const signature = success || pendingSignature;
    const isPending = transactionStatus === 'pending';
    
    return (
      <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center rounded-lg px-6 h-[400px]">
        {/* Status Icon */}
        {transactionStatus === 'confirmed' ? (
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-yellow-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        )}
  
        {/* Status Text */}
        <h3 className="text-xl font-bold text-white mb-2">
          {isPending ? 'Transaction Pending' : 'Transaction Successful'}
        </h3>
        
        <p className="text-zinc-400 text-center mb-4">
          {isPending ? 'Please wait while your transaction is being confirmed...' : 'Your swap has been processed'}
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
              setSuccess('');
              setPendingSignature(null);
              setTransactionStatus(null);
              setError('');
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

        
      </div>
    </div>
  );
};

export default SwapModal;