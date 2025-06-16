'use client';

import { useSolanaWallets, useSendTransaction } from '@privy-io/react-auth/solana';
import { usePrivy } from '@privy-io/react-auth';
import { LAMPORTS_PER_SOL, clusterApiUrl, Connection, Transaction, SystemProgram, PublicKey } from "@solana/web3.js";
import { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';

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
  const params = useParams();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
  let transaction = new Transaction();

  // Get the active wallet based on whether it's a template agent or not
  const activeWallet = params?.userId === 'template' || pathname === '/' 
    ? wallets[0]?.address 
    : agent.wallets?.solana;

  // Find the wallet object for the active wallet
  const agentWallet = wallets.find(w => w.address === activeWallet);

  if (!ready || !wallets[0]) return;

  const handleSwap = async () => {
    setIsLoading(true);
    try {
      if (agentWallet) {
        await agentWallet.sendTransaction(
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