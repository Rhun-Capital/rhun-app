import { useState, useEffect } from 'react';
import { getSwapOrder, signAndExecuteSwap, getTokenPriceInSol } from '@/lib/jupiter';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletConnectButton } from './wallet-connect-button';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

interface Agent {
  tokenMint: string;
  tokenSymbol: string;
  agentWalletAddress?: string;
}

interface Trade {
  type: 'buy' | 'sell';
  amount: number;
  token: string;
  timestamp: string;
  txHash: string;
}

interface TradingInterfaceProps {
  agent: Agent;
  onTradeComplete?: (trade: Trade) => void;
}

export function TradingInterface({ agent, onTradeComplete }: TradingInterfaceProps) {
  const wallet = useWallet();
  const { publicKey, sendTransaction } = wallet;
  const { connection } = useConnection();
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<{
    inputAmount: string;
    outputAmount: string;
    priceImpact: string;
  } | null>(null);
  const [sendSolLoading, setSendSolLoading] = useState(false);
  const [sendSolError, setSendSolError] = useState<string | null>(null);
  const [sendSolSuccess, setSendSolSuccess] = useState<string | null>(null);

  // Example: agent wallet address (replace with actual agent wallet address)
  const agentWalletAddress = agent.agentWalletAddress;

  // Function to get quote
  const getQuote = async (inputAmount: string) => {
    if (!inputAmount || !publicKey) return;
    
    try {
      const amountInLamports = Math.floor(parseFloat(inputAmount) * 1e9).toString();
      const order = await getSwapOrder(
        'So11111111111111111111111111111111111111112', // SOL mint
        agent.tokenMint,
        amountInLamports,
        publicKey.toString()
      );

      setQuote({
        inputAmount: (Number(order.inAmount) / 1e9).toFixed(4),
        outputAmount: (Number(order.outAmount) / 1e6).toFixed(4), // Assuming 6 decimals for token
        priceImpact: order.priceImpactPct,
      });
    } catch (err) {
      console.error('Error getting quote:', err);
      setError('Failed to get quote. Please try again.');
    }
  };

  // Function to execute trade
  const executeTrade = async () => {
    console.log('Send button clicked');
    if (!publicKey || !amount || !quote) {
      console.log('Early return: missing publicKey, amount, or quote', { publicKey, amount, quote });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const amountInLamports = Math.floor(parseFloat(amount) * 1e9).toString();
      const order = await getSwapOrder(
        'So11111111111111111111111111111111111111112',
        agent.tokenMint,
        amountInLamports,
        publicKey.toString()
      );

      const result = await signAndExecuteSwap(connection, wallet, order);

      if (result.status === 'Success') {
        onTradeComplete?.({
          type: 'buy',
          amount: parseFloat(amount),
          token: agent.tokenMint,
          timestamp: new Date().toISOString(),
          txHash: result.signature,
        });
        setAmount('');
        setQuote(null);
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
    } catch (err) {
      console.error('Error executing trade:', err);
      setError('Failed to execute trade. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to send SOL to agent wallet
  const sendSolToAgent = async () => {
    setSendSolLoading(true);
    setSendSolError(null);
    setSendSolSuccess(null);
    try {
      if (!publicKey || !sendTransaction || !connection) {
        setSendSolError('Wallet not connected');
        setSendSolLoading(false);
        return;
      }
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        setSendSolError('Enter a valid amount');
        setSendSolLoading(false);
        return;
      }
      if (!agentWalletAddress) {
        setSendSolError('Agent wallet address not set');
        setSendSolLoading(false);
        return;
      }
      const lamports = Math.floor(Number(amount) * 1e9);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(agentWalletAddress),
          lamports,
        })
      );
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      setSendSolSuccess('Sent! Transaction signature: ' + signature);
    } catch (err: any) {
      setSendSolError(err.message || 'Failed to send SOL');
    } finally {
      setSendSolLoading(false);
    }
  };

  // Update quote when amount changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (amount) {
        getQuote(amount);
      } else {
        setQuote(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [amount, publicKey]);

  if (!publicKey) {
    return (
      <div className="space-y-4">
        <div className="text-center text-gray-400">
          Connect your wallet to start trading
        </div>
        <WalletConnectButton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Agent Wallet Address Section */}
      <div className="p-4 bg-gray-800 rounded-lg space-y-2">
        <div className="flex flex-col gap-2">
          <span className="text-gray-400">Agent Wallet Address:</span>
          <span className="text-white break-all font-mono">{agentWalletAddress}</span>
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-200">
            Amount (SOL)
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter amount in SOL"
            min="0"
            step="0.1"
          />
          <button
            onClick={sendSolToAgent}
            disabled={sendSolLoading || !amount || !publicKey}
            className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
              sendSolLoading || !amount || !publicKey
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {sendSolLoading ? 'Sending...' : 'Send SOL to Agent'}
          </button>
          {sendSolError && (
            <div className="p-2 bg-red-900/50 border border-red-500 rounded-md text-red-200 text-sm">
              {sendSolError}
            </div>
          )}
          {sendSolSuccess && (
            <div className="p-2 bg-green-900/50 border border-green-500 rounded-md text-green-200 text-sm">
              {sendSolSuccess}
            </div>
          )}
        </div>
      </div>

      {quote && (
        <div className="p-4 bg-gray-800 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">You pay:</span>
            <span className="text-white">{quote.inputAmount} SOL</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">You receive:</span>
            <span className="text-white">{quote.outputAmount} {agent.tokenSymbol}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Price impact:</span>
            <span className="text-white">{quote.priceImpact}%</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500 rounded-md text-red-200 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={executeTrade}
        disabled={!amount || !quote || isLoading}
        className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
          !amount || !quote || isLoading
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLoading ? 'Processing...' : 'Send SOL'}
      </button>
    </div>
  );
} 