// components/WalletConnection.tsx
'use client';
import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import {useLogin} from '@privy-io/react-auth';
import {useRouter} from 'next/navigation';
import LoadingIndicator from './loading-indicator';

export default function WalletConnection() {
  const { logout, ready, authenticated, user, getAccessToken } = usePrivy();
  const [hasNFT, setHasNFT] = useState(false);
  const [checking, setChecking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (authenticated && user) {
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);
    }
  }, [authenticated, user]);

  const {login} = useLogin({
    onComplete: ({user, isNewUser, wasAlreadyAuthenticated, loginMethod}) => {
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);
    },
    onError: (error) => {
      // console.log(error);
    },
  });

  // useEffect(() => {
  //   if (authenticated && user) {
  //     checkNFTOwnership();
  //   }
  // }, [authenticated, user]);

  // const checkNFTOwnership = async () => {
  //   if (!user) return;
  //   const accessToken = await getAccessToken();
  //   setChecking(true);
    
  //   try {
  //     // Determine if we're using wallet or email
  //     const requestBody = user?.wallet?.address 
  //       ? {
  //           chain: 'solana', 
  //           walletAddress: user.wallet.address,
  //           userId: user.id
  //         }
  //       : {
  //           chain: 'solana', 
  //           email: user.email?.address,
  //           userId: user.id
  //         };

  //     // Call our check-nft endpoint
  //     const response = await fetch('/api/nft/verify', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
  //       body: JSON.stringify(requestBody)
  //     });
      
  //     const nft = await response.json();
  //     if (nft.data.length > 0 && nft.data[0].metadata.name === 'RHUN FAST PASS') {
  //       setHasNFT(true);
  //       window.location.href = '/';
  //     } else {
  //       setHasNFT(false);
  //     }
  //   } catch (error) {
  //     console.error('Error checking NFT:', error);
  //     setHasNFT(false);
  //   }
  //   setChecking(false);
  // };

  const clearCookies = async () => {
    const accessToken = await getAccessToken();
    await fetch('/api/auth/clear-access', { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}` } });
  }  

  const handleLogout = async () => {
    await clearCookies(); // Clear access tokens
    await logout(); // Clear Privy state
    router.push('/login');
  }  

  return (
    <div className="text-center">
      <h3 className="text-white mb-4">{authenticated ? 'You are currently signed in' : 'Connect Wallet or Email to Access'}</h3>
      {!authenticated && ready ? (
        <button
          onClick={login}
          className="group relative w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-colors"
        >
          Connect
        </button>
      ) : (
        <div className="text-gray-400">
          <div className="flex justify-center items-center gap-2">
            <div className="max-w-[130px] truncate">
            {user?.wallet?.address && `${user.wallet.address.slice(0,6)}...${user.wallet.address.slice(-4)}`}
            {user?.email?.address && `${user.email.address}`}            
            </div>

            <div className="text-white cursor-pointer" onClick={handleLogout}>Disconnect</div>
            
          </div>
         
          <div>
            
          </div>
          {/* <div className="mt-2">
             {checking && ready && user ? <div className="flex items-center gap-2 justify-center"><LoadingIndicator/> Checking NFT ownership...</div> : ''}
          </div> */}
        </div>
      )}
    </div>
  );
}