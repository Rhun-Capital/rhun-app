import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

export function WalletConnectButton() {
  const { connected } = useWallet();

  return (
    <div className="flex items-center gap-2">
      <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !rounded-md !py-2 !px-4 !text-sm !font-medium" />
    </div>
  );
} 