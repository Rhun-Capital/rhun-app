'use client';
import React, { useEffect, useState } from 'react';
import { usePrivy, useLogin } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, RefreshCw, ChevronDown, LogOut, Copy, CheckCircle, X, DollarSign, ArrowUpDown } from 'lucide-react';
import { Transaction, Keypair, Connection } from '@solana/web3.js';

// Token addresses
const RHUN_MINT = 'Gh8yeA9vH5Fun7J6esFH3mV65cQTBpxk9Z5XpzU7pump';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

interface PoolInfo {
  poolAddress: string;
  tokenA: { address: string; symbol: string; decimals: number };
  tokenB: { address: string; symbol: string; decimals: number };
  tvl: number;
  apy: number;
}

interface Position {
  id: string;
  tokenXAmount: number;
  tokenYAmount: number;
  minPrice: number;
  maxPrice: number;
  binRange: string;
  feeEarned: number;
  isActive: boolean;
  createdAt: string;
  positionValue: number;
}

interface PortfolioData {
  positions: Position[];
  summary: {
    totalPositions: number;
    activePositions: number;
    portfolioValue: number;
    totalRhunAmount: number;
    totalSolAmount: number;
  };
  prices: {
    rhun: number;
    sol: number;
    timestamp: string;
  };
}

interface TokenLogos {
  rhun: string | null;
  sol: string | null;
}

interface FeeData {
  totalSwapFees: number;
  totalLMRewards: number;
  totalFeesUSD: number;
  positionFees: {
    positionAddress: string;
    swapFees: {
      tokenX: number;
      tokenY: number;
      total: number;
    };
    lmRewards: {
      rewards: Array<{
        mint?: string;
        amount: number;
      }>;
      total: number;
    };
  }[];
}

export default function RhunSolPoolPage() {
  const { user, authenticated, logout } = usePrivy();
  const { login } = useLogin();
  const { wallets } = useSolanaWallets();
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSolAmount, setDepositSolAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawSolAmount, setWithdrawSolAmount] = useState('');
  const [tokenLogos, setTokenLogos] = useState<TokenLogos>({ rhun: null, sol: null });
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{ signature: string; amount: string } | null>(null);
  const [feeData, setFeeData] = useState<FeeData | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [rhunPrice, setRhunPrice] = useState<number>(0);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [isUpdatingFromRhun, setIsUpdatingFromRhun] = useState(false);
  const [isUpdatingFromSol, setIsUpdatingFromSol] = useState(false);

  // Use the primary wallet from user object
  const primaryWalletAddress = user?.wallet?.address;
  // Try to find the active wallet, but also fall back to the first available wallet
  const activeWallet = wallets?.find(wallet => wallet.address === primaryWalletAddress) || 
                      wallets?.[0] || 
                      null;

  useEffect(() => {
    fetchPoolInfo();
    fetchTokenLogos();
    fetchTokenPrices();
    if (primaryWalletAddress) {
      fetchPortfolioData();
      fetchWalletBalance();
      fetchFeeData();
    }
  }, [primaryWalletAddress]);

  // Update prices when portfolio data changes
  useEffect(() => {
    if (portfolioData?.prices) {
      setRhunPrice(portfolioData.prices.rhun);
      setSolPrice(portfolioData.prices.sol);
    }
  }, [portfolioData]);

  // Debug useEffect to log wallet state changes (removed for production)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showWalletDropdown) {
        setShowWalletDropdown(false);
      }
    };

    if (showWalletDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showWalletDropdown]);

  const fetchTokenLogos = async () => {
    try {
      // Use local profile image for RHUN logo
      const rhunLogo = '/images/profile.png';

      // SOL logo is well-known, use the standard one
      const solLogo = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

      setTokenLogos({
        rhun: rhunLogo,
        sol: solLogo
      });
    } catch (error) {
      console.error('Error setting token logos:', error);
      // Keep null values as fallback
    }
  };

  const fetchPoolInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/pool/info');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pool info');
      }
      
      setPoolInfo(data);
    } catch (err) {
      console.error('Error fetching pool info:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pool info');
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolioData = async () => {
    if (!primaryWalletAddress) return;
    
    try {
      setPortfolioLoading(true);
      const response = await fetch(`/api/pool/positions?wallet=${primaryWalletAddress}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch portfolio data');
      }
      
      setPortfolioData(data);
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    if (!primaryWalletAddress) return;
    
    try {
      setBalanceLoading(true);

      
      const response = await fetch(`/api/wallets/${primaryWalletAddress}/tokens`);
      const data = await response.json();
      

      
      if (response.ok && data.success && data.data) {
        // Find RHUN token in the wallet data array
        const rhunToken = data.data.find((token: any) => 
          token.token_address === RHUN_MINT || 
          token.token_symbol === 'RHUN'
        );
        
        // Find SOL token in the wallet data array
        const solToken = data.data.find((token: any) => 
          token.token_address === SOL_MINT || 
          token.token_symbol === 'SOL'
        );
        

        
        if (rhunToken) {
          // Use the formatted_amount which is already converted to human readable
          const balance = rhunToken.formatted_amount || 0;
          setWalletBalance(balance);

                  } else {
            setWalletBalance(0);
          }

        if (solToken) {
          const solBal = solToken.formatted_amount || 0;
          setSolBalance(solBal);
          
                  } else {
            setSolBalance(0);
          }
      } else {

        setWalletBalance(0);
        setSolBalance(0);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setWalletBalance(0);
      setSolBalance(0);
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchFeeData = async () => {
    if (!primaryWalletAddress) return;
    
    try {
      setFeeLoading(true);
      const response = await fetch(`/api/pool/fees?wallet=${primaryWalletAddress}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setFeeData(data.fees);
      } else {

        setFeeData(null);
      }
    } catch (err) {
      console.error('Error fetching fee data:', err);
      setFeeData(null);
    } finally {
      setFeeLoading(false);
    }
  };

  const fetchTokenPrices = async () => {
    try {
      // First try to use portfolio data if available (most reliable)
      if (portfolioData?.prices) {
        setRhunPrice(portfolioData.prices.rhun);
        setSolPrice(portfolioData.prices.sol);
        return;
      }
      
      // Fallback to API price fetching
      const [rhunResponse, solResponse] = await Promise.allSettled([
        fetch(`/api/tokens/price?address=${RHUN_MINT}`),
        fetch(`/api/tokens/price?address=${SOL_MINT}`)
      ]);
      
      if (rhunResponse.status === 'fulfilled' && rhunResponse.value.ok) {
        const rhunData = await rhunResponse.value.json();
        if (rhunData.price) setRhunPrice(rhunData.price);
      }
      
      if (solResponse.status === 'fulfilled' && solResponse.value.ok) {
        const solData = await solResponse.value.json();
        if (solData.price) setSolPrice(solData.price);
      }
      
      // Set default SOL price if not available (around $200 as fallback)
      if (!solPrice && solResponse.status === 'rejected') {
        setSolPrice(200);
      }
      
    } catch (error) {
      console.error('Error fetching token prices:', error);
      // Set reasonable fallback prices
      if (!rhunPrice) setRhunPrice(0.01); // Fallback RHUN price
      if (!solPrice) setSolPrice(200);   // Fallback SOL price
    }
  };

  const convertRhunToSol = (rhunAmount: string): string => {
    if (!rhunAmount || !rhunPrice || !solPrice) return '';
    const rhunValue = parseFloat(rhunAmount) * rhunPrice;
    const solAmount = rhunValue / solPrice;
    return solAmount.toFixed(6);
  };

  const convertSolToRhun = (solAmount: string): string => {
    if (!solAmount || !rhunPrice || !solPrice) return '';
    const solValue = parseFloat(solAmount) * solPrice;
    const rhunAmount = solValue / rhunPrice;
    return rhunAmount.toFixed(2);
  };

  const handleRhunDepositChange = (value: string) => {
    setDepositAmount(value);
    if (!isUpdatingFromSol && value && rhunPrice && solPrice) {
      setIsUpdatingFromRhun(true);
      const solAmount = convertRhunToSol(value);
      setDepositSolAmount(solAmount);
      setTimeout(() => setIsUpdatingFromRhun(false), 100);
    }
  };

  const handleSolDepositChange = (value: string) => {
    setDepositSolAmount(value);
    if (!isUpdatingFromRhun && value && rhunPrice && solPrice) {
      setIsUpdatingFromSol(true);
      const rhunAmount = convertSolToRhun(value);
      setDepositAmount(rhunAmount);
      setTimeout(() => setIsUpdatingFromSol(false), 100);
    }
  };

  const handleRhunWithdrawChange = (value: string) => {
    setWithdrawAmount(value);
    if (!isUpdatingFromSol && value && rhunPrice && solPrice) {
      setIsUpdatingFromRhun(true);
      const solAmount = convertRhunToSol(value);
      setWithdrawSolAmount(solAmount);
      setTimeout(() => setIsUpdatingFromRhun(false), 100);
    }
  };

  const handleSolWithdrawChange = (value: string) => {
    setWithdrawSolAmount(value);
    if (!isUpdatingFromRhun && value && rhunPrice && solPrice) {
      setIsUpdatingFromSol(true);
      const rhunAmount = convertSolToRhun(value);
      setWithdrawAmount(rhunAmount);
      setTimeout(() => setIsUpdatingFromSol(false), 100);
    }
  };

  const getTotalDepositValue = (): number => {
    const rhunValue = depositAmount ? parseFloat(depositAmount) * rhunPrice : 0;
    const solValue = depositSolAmount ? parseFloat(depositSolAmount) * solPrice : 0;
    return rhunValue + solValue;
  };

  const getTotalWithdrawValue = (): number => {
    const rhunValue = withdrawAmount ? parseFloat(withdrawAmount) * rhunPrice : 0;
    const solValue = withdrawSolAmount ? parseFloat(withdrawSolAmount) * solPrice : 0;
    return rhunValue + solValue;
  };

  const handleDeposit = async () => {

    
    // More detailed error checking
    if (!authenticated) {
      setError('Please connect your wallet first');
      return;
    }
    
    if (!activeWallet) {
      setError('No active wallet found. Please refresh the page or reconnect your wallet.');
      return;
    }
    
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError('Please enter a valid RHUN deposit amount');
      return;
    }

    if (!depositSolAmount || parseFloat(depositSolAmount) <= 0) {
      setError('Please enter a valid SOL deposit amount');
      return;
    }

    // Check if user has sufficient balances
    if (parseFloat(depositAmount) > walletBalance) {
      setError(`Insufficient RHUN balance. You have ${walletBalance.toFixed(2)} RHUN`);
      return;
    }

    if (parseFloat(depositSolAmount) > solBalance) {
      setError(`Insufficient SOL balance. You have ${solBalance.toFixed(6)} SOL`);
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      // Create deposit transaction with both token amounts
      const response = await fetch('/api/pool/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: activeWallet.address,
          tokenXAmount: parseFloat(depositAmount), // RHUN amount
          tokenYAmount: parseFloat(depositSolAmount), // SOL amount
          strategy: 'spot',
          binRange: 10,
          autoFill: true
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create deposit');
      }

      // Sign and execute transaction
      const transactionBuffer = Buffer.from(data.serializedTransaction);
      const transaction = Transaction.from(transactionBuffer);
      
      const positionKeypair = Keypair.fromSecretKey(new Uint8Array(data.positionPrivateKey));
      transaction.partialSign(positionKeypair);
      
      const signedTransaction = await activeWallet.signTransaction(transaction);
      
      const executeResponse = await fetch('/api/pool/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: activeWallet.address,
          tokenXAmount: parseFloat(depositAmount),
          tokenYAmount: parseFloat(depositSolAmount),
          strategy: 'spot',
          binRange: 10,
          autoFill: true,
          signedTransaction: Array.from(signedTransaction.serialize())
        })
      });
      
      const executeData = await executeResponse.json();
      
      if (!executeResponse.ok) {
        throw new Error(executeData.error || 'Failed to execute transaction');
      }
      
      setSuccessData({
        signature: executeData.signature,
        amount: `${depositAmount} RHUN + ${depositSolAmount} SOL`
      });
      setShowSuccessModal(true);
      setDepositAmount('');
      setDepositSolAmount('');
      await fetchPoolInfo();
      await fetchPortfolioData();
      await fetchWalletBalance();
    } catch (err) {
      console.error('Deposit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to deposit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseAllPositions = async () => {
    if (!activeWallet || !portfolioData?.positions.length) {
      setError('No positions to close');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      // Close all positions sequentially
      for (const position of portfolioData.positions) {
        await handleWithdrawAndClosePosition(position.id);
      }
      
      setSuccessData({
        signature: 'multiple',
        amount: 'All positions closed and withdrawn'
      });
      setShowSuccessModal(true);
      
      // Refresh data
      await fetchPortfolioData();
      await fetchFeeData();
      await fetchWalletBalance();
    } catch (err) {
      console.error('Close all positions error:', err);
      setError(err instanceof Error ? err.message : 'Failed to close all positions');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      // Clear any local storage that might cache wallet connections
      localStorage.removeItem('walletName');
      localStorage.removeItem('wallet-name');
      
      // Logout from Privy completely
      await logout();
      
      // Reload the page to clear all state
      window.location.reload();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      setError('Failed to disconnect wallet. Please refresh the page.');
    }
  };

  const copyWalletAddress = async () => {
    if (primaryWalletAddress) {
      try {
        await navigator.clipboard.writeText(primaryWalletAddress);
        // You could add a toast notification here
      } catch (error) {
        console.error('Failed to copy address:', error);
      }
    }
  };

  const handleWithdrawAndClosePosition = async (positionAddress: string) => {
    if (!activeWallet) {
      setError('No active wallet found');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pool/position/withdraw-and-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: activeWallet.address,
          positionAddress
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to withdraw and close position');
      }

      if (data.serializedTransactions && data.serializedTransactions.length > 0) {
        // Sign all transactions first
        let signedTransactions: number[][] = [];
        
        for (const serializedTx of data.serializedTransactions) {
          // Convert the serialized transaction back to a Transaction object
          const transactionBuffer = Buffer.from(serializedTx);
          const transaction = Transaction.from(transactionBuffer);
          
          // Sign the transaction
          const signedTransaction = await activeWallet.signTransaction(transaction);
          
          // Convert signed transaction to array format for API
          signedTransactions.push(Array.from(signedTransaction.serialize()));
        }
        
        // Execute all signed transactions via API
        const executeResponse = await fetch('/api/pool/execute-withdraw-close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serializedTransactions: signedTransactions
          })
        });
        
        const executeData = await executeResponse.json();
        
        if (!executeResponse.ok) {
          throw new Error(executeData.error || 'Failed to execute transactions');
        }
        
        setSuccessData({
          signature: executeData.signatures[executeData.signatures.length - 1], // Use last signature
          amount: 'Position withdrawn and closed'
        });
        setShowSuccessModal(true);
        
        // Refresh data
        await fetchPortfolioData();
        await fetchFeeData();
      } else {
        throw new Error('No transaction data received');
      }
    } catch (err) {
      console.error('Withdraw and close position error:', err);
      setError(err instanceof Error ? err.message : 'Failed to withdraw and close position');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaimFees = async () => {
    if (!activeWallet) {
      setError('No active wallet found');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      // Create claim transaction for all fees (swap + LM rewards)
      const response = await fetch('/api/pool/claim-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: activeWallet.address,
          claimType: 'all'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create claim transaction');
      }

      if (data.transactions && data.transactions.length > 0) {
        // Sign all claim transactions
        let signedTransactions: number[][] = [];
        
        for (const txData of data.transactions) {
          // Convert the serialized transaction back to a Transaction object
          const transactionBuffer = Buffer.from(txData.serializedTransaction);
          const transaction = Transaction.from(transactionBuffer);
          
          // Sign the transaction
          const signedTransaction = await activeWallet.signTransaction(transaction);
          
          // Convert signed transaction to array format for API
          signedTransactions.push(Array.from(signedTransaction.serialize()));
        }
        
        // Execute all signed claim transactions
        const executeResponse = await fetch('/api/pool/execute-claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signedTransactions: signedTransactions
          })
        });
        
        const executeData = await executeResponse.json();
        
        if (!executeResponse.ok) {
          throw new Error(executeData.error || 'Failed to execute claim transactions');
        }
        
        setSuccessData({
          signature: executeData.signatures[executeData.signatures.length - 1], // Use last signature
          amount: `$${data.exactAmounts?.totalUSD?.toFixed(4) || feeData?.totalFeesUSD.toFixed(4) || '0.0000'} fees claimed`
        });
        setShowSuccessModal(true);
        
        // Refresh data
        await fetchPortfolioData();
        await fetchFeeData();
      } else {
        throw new Error('No claimable fees found');
      }
    } catch (err) {
      console.error('Claim fees error:', err);
      setError(err instanceof Error ? err.message : 'Failed to claim fees');
    } finally {
      setActionLoading(false);
    }
  };

  // Token icon component with fallback
  const TokenIcon = ({ token, size = 'w-12 h-12' }: { token: 'rhun' | 'sol', size?: string }) => {
    const logo = tokenLogos[token];
    const fallbackColor = token === 'rhun' ? 'bg-orange-500' : 'bg-purple-500';
    const fallbackLetter = token === 'rhun' ? 'R' : 'S';

    if (logo) {
      return (
        <img
          src={logo}
          alt={token.toUpperCase()}
          className={`${size} rounded-full border-2 border-zinc-800`}
          onError={(e) => {
            // Fallback to letter icon if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
      );
    }

    return (
      <div className={`${size} ${fallbackColor} rounded-full flex items-center justify-center border-2 border-zinc-800`}>
        <span className="text-white text-lg font-bold">{fallbackLetter}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Removed the full-page authentication check - now show the interface regardless of auth status

  return (
    <div className="min-h-screen bg-zinc-900 pt-10">
      <div className="container mx-auto p-6 pb-20 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center -space-x-2">
              <TokenIcon token="rhun" />
              <TokenIcon token="sol" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">RHUN-SOL <span className="text-zinc-400">Pool</span></h1>
              <p className="text-zinc-400 text-sm sm:text-base">Earn yield on your RHUN-SOL tokens</p>
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            {authenticated && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchPortfolioData();
                  fetchWalletBalance();
                  fetchFeeData();
                  fetchTokenPrices();
                }}
                disabled={portfolioLoading || balanceLoading || feeLoading}
                className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                title="Refresh Portfolio"
              >
                <RefreshCw className={`h-4 w-4 ${(portfolioLoading || balanceLoading || feeLoading) ? 'animate-spin' : ''}`} />
              </Button>
            )}
            {authenticated ? (
              <Button
                variant="outline"
                onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="font-mono text-sm">
                    {primaryWalletAddress ? `${primaryWalletAddress.slice(0, 4)}...${primaryWalletAddress.slice(-4)}` : 'Wallet'}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </Button>
            ) : (
              <Button
                onClick={login}
                className="bg-indigo-400 hover:bg-indigo-500 text-white"
              >
                Connect Wallet
              </Button>
            )}
            
            {showWalletDropdown && authenticated && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-50">
                <div className="p-4 border-b border-zinc-700">
                  <div className="text-sm text-zinc-400 mb-1">Connected Wallet</div>
                  <div className="font-mono text-xs text-zinc-300 break-all">
                    {primaryWalletAddress}
                  </div>
                </div>
                
                {/* Balance Section */}
                <div className="p-4 border-b border-zinc-700">
                  <div className="text-sm text-zinc-400 mb-3">Wallet Balances</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TokenIcon token="rhun" size="w-5 h-5" />
                        <span className="text-zinc-300 text-sm">RHUN</span>
                      </div>
                      <div className="text-right">
                        {balanceLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                        ) : (
                          <span className="text-white text-sm font-medium">
                            {walletBalance.toLocaleString('en-US', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TokenIcon token="sol" size="w-5 h-5" />
                        <span className="text-zinc-300 text-sm">SOL</span>
                      </div>
                      <div className="text-right">
                        {balanceLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                        ) : (
                          <span className="text-white text-sm font-medium">
                            {solBalance.toLocaleString('en-US', { 
                              minimumFractionDigits: 4, 
                              maximumFractionDigits: 4 
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-2">
                  <button
                    onClick={() => {
                      copyWalletAddress();
                      setShowWalletDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 rounded-md transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Address
                  </button>
                  <button
                    onClick={() => {
                      fetchWalletBalance();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 rounded-md transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Balances
                  </button>
                  <div className="border-t border-zinc-700 my-2"></div>
                  <button
                    onClick={() => {
                      handleDisconnectWallet();
                      setShowWalletDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700 rounded-md transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Disconnect Wallet
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Your Deposits and Fees */}
          <div className="order-1 lg:order-1 lg:col-span-2 space-y-6">
            {/* Your Deposits */}
            {authenticated ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardContent className="p-6 pt-5">
                    <div className="text-sm text-zinc-400 mb-1">Your Deposits</div>
                    <div className="text-2xl lg:text-3xl font-bold text-white">
                      {portfolioData ? portfolioData.summary.portfolioValue.toLocaleString('en-US', { 
                        style: 'currency', 
                        currency: 'USD',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2 
                      }) : '$0.00'}
                    </div>
                    <div className="text-sm text-zinc-400">
                      {portfolioData ? portfolioData.summary.totalRhunAmount.toLocaleString() : '0'} RHUN
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-800 border-zinc-700">
                  <CardContent className="p-6 pt-5">
                    <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span>Fees Earned</span>
                    </div>
                    <div className="text-2xl lg:text-3xl font-bold text-green-400">
                      {feeLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : feeData ? (
                        `$${feeData.totalFeesUSD.toFixed(4)}`
                      ) : (
                        '$0.0000'
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="bg-zinc-800 border-zinc-700">
                <CardContent className="p-6 pt-5">
                  <div className="text-sm text-zinc-400 mb-1">Your Deposits</div>
                  <div className="text-2xl lg:text-3xl font-bold text-white">$0.00</div>
                  <div className="text-sm text-zinc-400">Connect wallet to see your deposits</div>
                </CardContent>
              </Card>
            )}

            {/* Portfolio Positions */}
            {authenticated ? (
              portfolioData && (
              <Card className="bg-zinc-800 border-zinc-700">
                <CardHeader className="border-b border-zinc-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">Your Positions</CardTitle>
                      <CardDescription className="text-zinc-400">
                        Active liquidity positions
                      </CardDescription>
                    </div>
                    {feeData && (
                      <div className="text-right">
                        <div className="text-sm text-zinc-400">Total Fees</div>
                        <div className="text-lg font-semibold text-green-400">
                          ${feeData.totalFeesUSD.toFixed(4)}
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {portfolioData.positions.length > 0 ? (
                    portfolioData.positions.map((position, index) => {
                      const positionFee = feeData?.positionFees?.find(
                        fee => fee.positionAddress === position.id
                      );
                      
                      return (
                        <div key={position.id} className="p-6 border-b border-zinc-700/50 last:border-b-0">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex items-center -space-x-2">
                                <TokenIcon token="rhun" size="w-8 h-8" />
                                <TokenIcon token="sol" size="w-8 h-8" />
                              </div>
                              <div className="flex-1">
                                <div className="text-white font-medium">
                                  Position #{index + 1}
                                </div>
                                <div className="text-sm text-zinc-400">
                                  {position.tokenXAmount.toLocaleString()} RHUN + {position.tokenYAmount.toFixed(4)} SOL
                                </div>
                                {positionFee && (
                                  <div className="text-xs text-green-400 mt-1">
                                    Fees: ${(positionFee.swapFees.total + positionFee.lmRewards.total).toFixed(4)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-medium mb-2">
                                ${position.positionValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="flex justify-end">
                                <Button
                                  onClick={() => handleWithdrawAndClosePosition(position.id)}
                                  size="sm"
                                  variant="outline"
                                  className="text-xs bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                                >
                                  Withdraw & Close
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-12 text-center">
                      <div className="flex items-center justify-center mb-4">
                        <div className="flex items-center -space-x-2 opacity-50">
                          <TokenIcon token="rhun" size="w-12 h-12" />
                          <TokenIcon token="sol" size="w-12 h-12" />
                        </div>
                      </div>
                      <div className="text-zinc-400 mb-2">No positions yet</div>
                      <div className="text-zinc-500 text-sm">
                        Create your first position by depositing RHUN tokens
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              )
            ) : (
              <Card className="bg-zinc-800 border-zinc-700">
                <CardHeader className="border-b border-zinc-700">
                  <CardTitle className="text-white">Your Positions</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Connect wallet to see your positions
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center py-8">
                    <div className="flex justify-center mb-4">
                      <div className="flex items-center -space-x-2">
                        <TokenIcon token="rhun" size="w-12 h-12" />
                        <TokenIcon token="sol" size="w-12 h-12" />
                      </div>
                    </div>
                    <div className="text-zinc-400 mb-2">No wallet connected</div>
                    <div className="text-zinc-500 text-sm">
                      Connect your wallet to view your positions
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Deposit/Withdraw (Second on mobile) */}
          <div className="order-2 lg:order-2 lg:col-span-1">
            <Card className="bg-zinc-800 border-zinc-700">
              <CardHeader className="border-b border-zinc-700">
                <div className="flex space-x-1 bg-zinc-900 p-1 rounded-lg">
                  <button
                    onClick={() => {
                      setActiveTab('deposit');
                      setDepositAmount('');
                      setDepositSolAmount('');
                    }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'deposit'
                        ? 'bg-indigo-400 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('withdraw');
                      setWithdrawAmount('');
                      setWithdrawSolAmount('');
                    }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'withdraw'
                        ? 'bg-indigo-400 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Withdraw
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {activeTab === 'deposit' ? (
                  <div className="space-y-4">
                    {/* RHUN Input */}
                    <div className="pt-2">
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        RHUN Amount:
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={depositAmount}
                          onChange={(e) => handleRhunDepositChange(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                          placeholder="0.00"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                          <TokenIcon token="rhun" size="w-6 h-6" />
                          <span className="text-zinc-300 font-medium">RHUN</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-zinc-400 mt-1">
                        <span>Balance: {authenticated ? walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'} RHUN</span>
                        {authenticated && (
                          <button
                            onClick={() => handleRhunDepositChange(walletBalance.toString())}
                            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                          >
                            Max
                          </button>
                        )}
                      </div>
                    </div>



                    {/* SOL Input */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        SOL Amount:
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={depositSolAmount}
                          onChange={(e) => handleSolDepositChange(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                          placeholder="0.000000"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                          <TokenIcon token="sol" size="w-6 h-6" />
                          <span className="text-zinc-300 font-medium">SOL</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-zinc-400 mt-1">
                        <span>Balance: {authenticated ? solBalance.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '--'} SOL</span>
                        {authenticated && (
                          <button
                            onClick={() => handleSolDepositChange((solBalance - 0.005).toString())} // Leave small amount for fees
                            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                          >
                            Max
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Balance Warnings */}
                    {authenticated && parseFloat(depositAmount || '0') > walletBalance && (
                      <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-red-300 text-sm">
                          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>Insufficient RHUN balance</span>
                        </div>
                      </div>
                    )}

                    {authenticated && parseFloat(depositSolAmount || '0') > (solBalance - 0.001) && (
                      <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-yellow-300 text-sm">
                          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>Insufficient SOL balance (leave some for transaction fees)</span>
                        </div>
                      </div>
                    )}

                    {authenticated ? (
                      <button
                        onClick={handleDeposit}
                        disabled={
                          actionLoading || 
                          !depositAmount || 
                          !depositSolAmount ||
                          parseFloat(depositAmount) <= 0 || 
                          parseFloat(depositSolAmount) <= 0 ||
                          parseFloat(depositAmount) > walletBalance ||
                          parseFloat(depositSolAmount) > (solBalance - 0.001)
                        }
                        className="w-full flex items-center justify-center p-3 rounded transition-colors hover:bg-zinc-800 bg-indigo-400/10 border-indigo-400 border-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin text-indigo-400" />
                            <span className="text-white">Depositing...</span>
                          </>
                        ) : (
                          <span className="text-white">Deposit Liquidity</span>
                        )}
                      </button>
                    ) : (
                      <Button
                        onClick={login}
                        className="w-full bg-indigo-400 hover:bg-indigo-500 text-white py-3"
                      >
                        Connect Wallet to Deposit
                      </Button>
                    )}
                  </div>
                                ) : (
                  <div className="space-y-6">
                    {/* Withdraw Summary */}
                    {authenticated && portfolioData && portfolioData.positions.length > 0 ? (
                      <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-4">
                        <div className="text-sm text-zinc-400 mb-3">Your Liquidity Position</div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-300">RHUN:</span>
                            <span className="text-white font-medium">
                              {portfolioData.summary.totalRhunAmount.toLocaleString('en-US', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                              })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-300">SOL:</span>
                            <span className="text-white font-medium">
                              {portfolioData.summary.totalSolAmount.toLocaleString('en-US', { 
                                minimumFractionDigits: 4, 
                                maximumFractionDigits: 4 
                              })}
                            </span>
                          </div>
                          <div className="border-t border-zinc-700 pt-2 mt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-300">Total Value:</span>
                              <span className="text-white font-semibold">
                                ${portfolioData.summary.portfolioValue.toLocaleString('en-US', { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-4 text-center">
                        <div className="text-zinc-400 text-sm">No liquidity positions found</div>
                      </div>
                    )}

                    {authenticated ? (
                      portfolioData && portfolioData.positions.length > 0 ? (
                        <button
                          onClick={handleCloseAllPositions}
                          disabled={actionLoading}
                          className="w-full flex items-center justify-center p-3 rounded transition-colors hover:bg-zinc-800 bg-indigo-400/10 border-indigo-400 border-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin text-indigo-400" />
                              <span className="text-white">Closing Positions...</span>
                            </>
                          ) : (
                            <span className="text-white">Close and Withdraw All</span>
                          )}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full flex items-center justify-center p-3 rounded bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        >
                          <span>No Positions to Withdraw</span>
                        </button>
                      )
                    ) : (
                      <Button
                        onClick={login}
                        className="w-full bg-indigo-400 hover:bg-indigo-500 text-white py-3"
                      >
                        Connect Wallet to Withdraw
                      </Button>
                    )}
                  </div>
                )}

                {/* Claim All Fees Button */}
                {authenticated && feeData && feeData.totalFeesUSD > 0 && (
                  <div className="pt-4 border-t border-zinc-700 mt-6">
                    <button
                      onClick={handleClaimFees}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center p-3 rounded transition-colors hover:bg-zinc-800 bg-green-400/10 border-green-400 border-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin text-green-400" />
                          <span className="text-white">Processing...</span>
                        </>
                      ) : (
                        <span className="text-white">Claim All Fees</span>
                      )}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-8 flex justify-center">
              <button
                onClick={() => window.open('https://www.meteora.ag/dlmm/2jxVjkPignEbR5pbGNtiRyCc6fAKZTKuFTf1MQED9pt5', '_blank')}
                className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors group"
              >
                <span>Powered by</span>
                <img 
                  src="/images/providers/meteora.svg" 
                  alt="Meteora" 
                  className="w-3 h-3 opacity-70 group-hover:opacity-100 transition-opacity"
                />
                <span className="font-medium">Meteora</span>
                <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-70 transition-opacity" />
              </button>
            </div>

          </div>
        </div>
        
      </div>

      {/* Success Modal */}
      {showSuccessModal && successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-auto">
            {/* Modal */}
            <div className="relative bg-zinc-800 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-emerald-500/10 animate-pulse" />
              
              {/* Close button */}
              <button
                onClick={() => setShowSuccessModal(false)}
                className="absolute top-4 right-4 z-10 p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-zinc-700"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Content */}
              <div className="relative p-8 text-center">
                {/* Success icon with animation */}
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                    <div className="relative bg-green-500/20 p-4 rounded-full">
                      <CheckCircle className="h-12 w-12 text-green-400" />
                    </div>
                  </div>
                </div>

                {/* Success message */}
                <h2 className="text-2xl font-bold text-white mb-2">
                  {successData.amount.includes('fees') 
                    ? 'Fees Claimed!' 
                    : successData.amount.includes('withdrawn and closed')
                      ? 'Position Closed!'
                      : 'Deposit Successful!'
                  }
                </h2>
                <p className="text-zinc-400 mb-6">
                  {successData.amount.includes('fees') 
                    ? `Your ${successData.amount} have been successfully claimed.`
                    : successData.amount.includes('withdrawn and closed')
                      ? 'Your position has been successfully withdrawn and closed. All liquidity and fees have been returned to your wallet.'
                      : `Your ${successData.amount} RHUN has been successfully deposited to the pool.`
                  }
                </p>

                {/* Transaction details */}
                {successData.signature !== 'pending' && (
                  <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-4 mb-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Amount:</span>
                        <span className="text-white font-mono">
                          {successData.amount.includes('withdrawn and closed') 
                            ? 'All liquidity'
                            : `${successData.amount} ${successData.amount.includes('fees') ? '' : 'RHUN'}`
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Transaction:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono text-xs">
                            {successData.signature.slice(0, 8)}...{successData.signature.slice(-8)}
                          </span>
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(successData.signature);
                              } catch (error) {
                                console.error('Failed to copy signature:', error);
                              }
                            }}
                            className="p-1 text-zinc-400 hover:text-white transition-colors"
                            title="Copy transaction signature"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  {successData.signature !== 'pending' && (
                    <Button
                      onClick={() => window.open(`https://solscan.io/tx/${successData.signature}`, '_blank')}
                      variant="outline"
                      className="flex-1 bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Solscan
                    </Button>
                  )}
                  <Button
                    onClick={() => setShowSuccessModal(false)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 