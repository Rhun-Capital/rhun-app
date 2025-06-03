'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { useEffect, useState } from 'react';

const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: true,
});

export default function PrivyWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'dark',
          walletChainType: "solana-only",   
          showWalletLoginFirst: false,
          accentColor: '#6366f1', // indigo-500
        },
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        }
      }}
    >
      {children}
    </PrivyProvider>
  );
}