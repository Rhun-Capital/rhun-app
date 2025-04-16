"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import CopyButton from "@/components/copy-button";
import { WalletIcon, PlusCircleIcon, CheckCircleIcon } from "lucide-react";

export default function WalletManagement() {
  const { user, authenticated } = usePrivy();
  const { createWallet, wallets } = useSolanaWallets();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateWallet = async () => {
    if (!authenticated) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setIsLoading(true);
      const wallet = await createWallet({ createAdditional: true });
      toast.success("New wallet created successfully!");
    } catch (error) {
      console.error("Error creating wallet:", error);
      toast.error("Failed to create wallet. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="p-6 bg-zinc-800/50 border border-zinc-700 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <WalletIcon className="w-6 h-6 text-zinc-400" />
          <h3 className="text-lg font-medium text-zinc-200">Wallet Management</h3>
        </div>
        <p className="text-zinc-400">Please connect your wallet to manage wallets.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-zinc-800/50 border border-zinc-700 rounded-xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WalletIcon className="w-6 h-6 text-zinc-400" />
          <h3 className="text-lg font-medium text-zinc-200">Wallet Management</h3>
        </div>
        <Button
          onClick={handleCreateWallet}
          disabled={isLoading}
          className="bg-indigo-500 hover:bg-indigo-600 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <PlusCircleIcon className="w-4 h-4" />
              Create New Wallet
            </>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-zinc-400">Your Wallets</h4>
        {wallets.length === 0 ? (
          <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
            <p className="text-sm text-zinc-500">No wallets found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <div
                key={wallet.address}
                className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50 flex justify-between items-center group hover:bg-zinc-800/50 transition-colors"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-200 break-all">
                      {wallet.address}
                    </p>
                    {wallet.address === user?.wallet?.address && (
                      <span className="flex items-center gap-1 text-xs text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-full">
                        <CheckCircleIcon className="w-3 h-3" />
                        Primary
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4">
                  <CopyButton text={wallet.address} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 