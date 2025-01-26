// components/WalletConnection.tsx
'use client';
import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';

export default function WalletConnection() {
  const { login, ready, authenticated, user } = usePrivy();
  const [hasNFT, setHasNFT] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      checkNFTOwnership(user.wallet.address);
    }
  }, [authenticated, user?.wallet?.address]);

  const checkNFTOwnership = async (address: string) => {
    setChecking(true);
    try {
      const response = await fetch(`https://api.crossmint.com/api/v1-alpha1/wallets/${address}/nfts?collectionId=${process.env.NEXT_PUBLIC_COLLECTION_ID}`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_CROSSMINT_API_KEY as string
        }
      });
      const data = await response.json();
      
      if (data.nfts?.length > 0) {
        setHasNFT(true);
        // Set cookie for access
        await fetch('/api/verify-nft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: address })
        });
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error checking NFT:', error);
    }
    setChecking(false);
  };

  return (
    <div className="text-center">
      <h3 className="text-white mb-4">Connect Wallet to Access</h3>
      {!authenticated && ready ? (
        <button
          onClick={login}
          className="group relative w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-colors"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="text-gray-400">
          {checking ? 'Checking NFT ownership...' : (hasNFT ? 'NFT found!' : 'No Fast Pass NFT found')}
        </div>
      )}
    </div>
  );
}