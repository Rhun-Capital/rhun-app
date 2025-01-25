'use client';

import React, { useState, useEffect } from 'react';
import {useSolanaWallets} from '@privy-io/react-auth/solana';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { ChevronDownIcon, ChevronUpIcon } from '@/components/icons';
import { usePrivy } from '@privy-io/react-auth';


export default function WalletTab({ agentId }: { agentId: string }) {
  const { createWallet, exportWallet, wallets } = useSolanaWallets();
  const { getAccessToken } = usePrivy();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);
  const params = useParams();
  

  // Fetch wallet address when available
  useEffect(() => {
    const fetchAgent = async () => {
      const agent = await getAgent();
      setWalletAddress(agent.wallets?.solana);
    };
    fetchAgent();
  }, []);

  // Fetch balance
  const fetchBalance = async (walletId: string) => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch(
        `/api/wallets/${walletId}/balance`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch balance');
      const data = await response.json();
      setBalance(data.balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchBalance(walletAddress);
      // Refresh balance every 30 seconds
      const interval = setInterval(() => fetchBalance(walletAddress), 30000);
      return () => clearInterval(interval);
    }
  }, [walletAddress]);    

  const getAgent = async () => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch(
        `/api/agents/${params.userId}/${agentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch agent');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching agent:', error);
    }
  };

  const handleCreateWallet = async () => {
    try {
      setLoading(true);
      const wallet = await createWallet({createAdditional: true});
      setWalletAddress(wallet.address);
      const accessToken = await getAccessToken();
      
      await fetch(`/api/agents/${params.userId}/${agentId}/wallet`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ wallets: {solana: wallet.address} }),
      });
    } catch (error) {
      console.error('Error creating wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportWallet = async () => {
    setExportLoading(true);
    try {
      const wallet = wallets.find((w) => w.address === walletAddress);
      if (wallet) {
        await exportWallet(wallet);
      }
    } catch (error) {
      console.error('Error exporting wallet:', error);
    } finally {
      setExportLoading(false);
    }
  }

  const toggleAdvancedOptions = () => {
    setIsAdvancedOptionsOpen(!isAdvancedOptionsOpen);
  }

  if (!agentId) {
    return (
      <div className="p-6 bg-zinc-800 rounded-lg text-zinc-400">
        Configure your agent before creating a wallet.
      </div>
    );
  }  

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-700 pb-4">
        <div className='flex items-center gap-3'>
          <Image src="/images/chains/solana.svg" alt="Solana Logo" width={14} height={14} />
          <h2 className="text-lg font-semibold">Agent Wallet</h2>
        </div>
        
        <p className="text-sm text-zinc-400">Manage your agent&apos;s Solana wallet</p>
      </div>

      {!walletAddress ? (
        <div className="p-6 bg-zinc-800 rounded-lg">
          <button
            onClick={handleCreateWallet}
            disabled={loading}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Creating Wallet...' : 'Create Wallet'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Wallet Info Card */}
          <div className="p-6 bg-zinc-800 rounded-lg space-y-4">
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-1">Wallet Address</h3>
              <code className="text-sm text-zinc-300 break-all">{walletAddress}</code>
            </div>
            
            {/* Balance Display */}
            <div className="pt-4 border-t border-zinc-700">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">Balance</h3>
              <div className="flex items-center gap-3 bg-zinc-900 rounded-lg p-4">
                <Image src="/images/chains/solana.svg" alt="Solana Logo" width={14} height={14} />
                <span className="text-xl font-semibold">
                  {balance === null ? "0" : balance.toFixed(4)}
                </span>
                <span className="text-zinc-400">SOL</span>
              </div>
            </div>

            {/* Advanced Options Accordion */}
            <div className="pt-4 border-t border-zinc-700">
              <button 
                onClick={toggleAdvancedOptions}
                className="w-full flex justify-between items-center text-sm font-medium text-zinc-300 hover:text-zinc-100 transition"
              >
                <span>Advanced Options</span>
                {isAdvancedOptionsOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </button>

              {isAdvancedOptionsOpen && (
                <div className="mt-4 space-y-4 bg-zinc-900 rounded-lg p-4">
                  <div>
                    <button
                      onClick={handleExportWallet}
                      disabled={exportLoading}
                      className="px-10 py-1 text-white outline outline-orange-600 hover:opacity-70  rounded-md transition disabled:opacity-50"
                    >
                      {exportLoading ? 'Exporting...' : 'Export Wallet'}
                    </button>
                    <p className="text-xs text-zinc-400 mt-2">
                      Export your wallet private key. Use with caution.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}