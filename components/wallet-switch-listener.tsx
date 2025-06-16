import { useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export function WalletSwitchListener({ onSwitch }: { onSwitch?: (newPublicKey: string) => void }) {
  const { publicKey } = useWallet();
  const prevPublicKey = useRef<string | null>(null);

  useEffect(() => {
    if (
      prevPublicKey.current &&
      publicKey &&
      prevPublicKey.current !== publicKey.toString()
    ) {
      console.log('User switched wallet/account:', publicKey.toString());
      if (onSwitch) onSwitch(publicKey.toString());
    }
    prevPublicKey.current = publicKey ? publicKey.toString() : null;
  }, [publicKey, onSwitch]);

  return null;
} 