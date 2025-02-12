'use client';

import { PrivyProvider } from '@privy-io/react-auth';

import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";


const solanaConnectors = toSolanaWalletConnectors({
    // By default, shouldAutoConnect is enabled
    shouldAutoConnect: true,
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
        loginMethods: ['wallet', 'email'],
        appearance: {
          theme: 'dark',
          accentColor: '#22c55e',
          // logo: "https://your-logo-url",
          walletChainType: "solana-only",   
          showWalletLoginFirst: true,       
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