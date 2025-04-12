'use client';

import { PrivyProvider } from '@privy-io/react-auth';

import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";


const solanaConnectors = toSolanaWalletConnectors({
    shouldAutoConnect: false,
});

export default function PrivyWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
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