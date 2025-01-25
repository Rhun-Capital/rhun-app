'use client';

import { useSolanaWallets, useSendTransaction } from '@privy-io/react-auth/solana';
import { usePrivy } from '@privy-io/react-auth';
import { LAMPORTS_PER_SOL, clusterApiUrl, Connection, Transaction, SystemProgram, PublicKey } from "@solana/web3.js";
import { useState } from 'react';

interface Quote {
  inAmount: number;
  outAmount: number;
  swapTransaction: any;
  inputMint: string;
  outputMint: string;
  displayAmount: number;
}

export default function SwapComponent({ quote, agent }: { quote: Quote, agent: any }) {
  const { ready, wallets } = useSolanaWallets();
  const agentWallet = wallets.find(w => w.address === agent.wallets.solana);
  const [isLoading, setIsLoading] = useState(false);
  const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
  let transaction = new Transaction();

  if (!ready || !wallets[0]) return;

  const handleSwap = async () => {
    setIsLoading(true);
    try {
      // const swapData = await fetch('https://quote-api.jup.ag/v6/swap', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     quoteResponse: quote,
      //     userPublicKey: agentWallet?.address.toString(),
      //     wrapUnwrapSol: true
      //   })
      // }).then(r => r.json());


      if (agentWallet) {
        await agentWallet.sendTransaction(
          // swapData.swapTransaction,
          transaction,
          connection
        );
      } else {
        throw new Error('Agent wallet is not defined');
      }
      
    } catch (error) {
      console.error('Swap failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-zinc-800 rounded">
      {/* <div>Input: {quote.inAmount / LAMPORTS_PER_SOL} SOL</div>
      <div>Output: {quote.displayAmount}</div> */}
      ehy!
      <button 
        onClick={handleSwap}
        disabled={!agentWallet || isLoading}
        className="bg-blue-500 px-4 py-2 rounded mt-2"
      >
        {!agentWallet ? 'Connect Wallet' : isLoading ? 'Processing...' : 'Confirm Swap'}
      </button>
    </div>
  );
}