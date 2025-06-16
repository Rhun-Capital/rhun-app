import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { toast } from 'sonner';

interface PoolDepositProps {
  poolAddress?: string; // Make poolAddress optional
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  onPoolCreated?: (poolAddress: string) => void;
}

export function PoolDeposit({ poolAddress, tokenAddress, tokenSymbol, tokenDecimals, onPoolCreated }: PoolDepositProps) {
  const { publicKey, signTransaction } = useWallet();
  const [amount, setAmount] = useState<string>('');
  const [slippage, setSlippage] = useState<number>(0.1);
  const [isLoading, setIsLoading] = useState(false);

  const handleDeposit = async () => {
    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch('/api/pool/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poolAddress, // This is now optional
          walletAddress: publicKey.toBase58(),
          amount: Number(amount),
          tokenAddress,
          slippage,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create deposit transaction');
      }

      const { depositTransaction, poolAddress: newPoolAddress, isNewPool } = await response.json();

      // If this is a new pool, notify the parent component
      if (isNewPool && onPoolCreated) {
        onPoolCreated(newPoolAddress);
      }

      // Create a new transaction and populate it with the received data
      const transaction = new Transaction();
      
      // Add all instructions from the received transaction
      depositTransaction.instructions.forEach((ix: any) => {
        const instruction = new TransactionInstruction({
          programId: new PublicKey(ix.programId),
          keys: ix.keys.map((k: any) => ({
            pubkey: new PublicKey(k.pubkey),
            isSigner: k.isSigner,
            isWritable: k.isWritable
          })),
          data: Buffer.from(ix.data, 'base64')
        });
        transaction.add(instruction);
      });

      // Set the recent blockhash and fee payer
      transaction.recentBlockhash = depositTransaction.recentBlockhash;
      transaction.feePayer = new PublicKey(depositTransaction.feePayer);

      // Sign the transaction
      const signedTransaction = await signTransaction(transaction);

      // Send the transaction through our proxy
      const sendResponse = await fetch('/api/solana/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'sendTransaction',
          params: [
            signedTransaction.serialize().toString('base64'),
            { 
              encoding: 'base64', 
              skipPreflight: false,
              preflightCommitment: 'confirmed'
            }
          ]
        })
      });

      if (!sendResponse.ok) {
        const error = await sendResponse.json();
        console.error('Send transaction error:', error);
        throw new Error(error.error || 'Failed to send transaction');
      }

      const { result: signature } = await sendResponse.json();
      console.log('Transaction sent:', signature);
      
      // Wait for transaction confirmation using the proxy
      let retries = 0;
      const maxRetries = 10;
      
      while (retries < maxRetries) {
        const confirmResponse = await fetch('/api/solana/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getSignatureStatuses',
            params: [
              [signature],
              { searchTransactionHistory: true }
            ]
          })
        });

        if (!confirmResponse.ok) {
          const error = await confirmResponse.json();
          console.error('Confirmation check error:', error);
          throw new Error(error.error || 'Failed to check transaction status');
        }

        const response = await confirmResponse.json();
        console.log('Raw RPC response:', response);

        if (!response.result || !response.result.value || !response.result.value[0]) {
          console.log('No status received, retrying...');
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
          continue;
        }

        const status = response.result.value[0];
        console.log('Transaction status:', status);

        // Check for transaction error
        if (status.err || (status.status && status.status.Err)) {
          console.error('Transaction failed:', status.err || status.status.Err);
          throw new Error(`Transaction failed: ${JSON.stringify(status.err || status.status.Err)}`);
        }

        // Check for confirmation status
        if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
          console.log('Transaction confirmed:', status.confirmationStatus);
          toast.success(isNewPool ? 'Pool created and deposit successful!' : 'Deposit successful!');
          setAmount(''); // Clear the input after successful deposit
          return;
        }

        // If we have confirmations but not yet confirmed, wait
        if (status.confirmations && status.confirmations > 0) {
          console.log('Transaction has confirmations:', status.confirmations);
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // If we have a status but no confirmations yet, wait
        if (status.status && status.status.Ok === null) {
          console.log('Transaction submitted but not yet confirmed');
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        console.log('Waiting for transaction confirmation...');
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
      }

      throw new Error('Transaction confirmation timeout');
    } catch (error) {
      console.error('Error processing deposit:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process deposit');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="amount" className="block text-sm font-medium text-zinc-400">
          Amount ({tokenSymbol})
        </label>
        <input
          id="amount"
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isLoading}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="slippage" className="block text-sm font-medium text-zinc-400">
          Slippage Tolerance: {slippage}%
        </label>
        <input
          id="slippage"
          type="range"
          min={0.1}
          max={100}
          step={0.1}
          value={slippage}
          onChange={(e) => setSlippage(Number(e.target.value))}
          disabled={isLoading}
          className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white disabled:opacity-50"
        />
      </div>

      <button
        onClick={handleDeposit}
        disabled={!publicKey || !amount || isLoading}
        className="w-full px-4 py-2 text-white bg-indigo-600 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Processing...' : 'Deposit'}
      </button>
    </div>
  );
} 