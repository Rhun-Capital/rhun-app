// components/recieve-button.tsx
'use client';

import { useState } from 'react';
import {QRCodeSVG} from 'qrcode.react';
import Image from 'next/image';

interface ReceiveModalProps {
  isOpen: boolean;
  agent: { wallets: { solana: string } };
  onClose: () => void;
}

const ReceiveModal = ({ isOpen, agent, onClose }: ReceiveModalProps) => {
  // check the agent exists and has a solana wallet
  let activeWallet;
  if (!agent || !agent.wallets || !agent.wallets.solana){
    activeWallet = agent.wallets.solana;
  } else {
    activeWallet = null;
  }
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (activeWallet) {
      await navigator.clipboard.writeText(activeWallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md mx-4 relative shadow-xl border border-zinc-700">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold mb-6 text-white">Receive Assets</h2>

        {/* QR Code */}
        <div className="bg-zinc-800 p-4 rounded-lg mb-6 flex justify-center">
        <QRCodeSVG 
            className='rounded-lg'
            value={activeWallet || ''}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* Wallet Address */}
        <div className="space-y-2">
          <label className="text-sm text-zinc-400">Wallet Address</label>
          <div className="flex items-center gap-2">
            <div className="bg-zinc-800 p-3 rounded-lg flex-1 font-mono text-sm text-white break-all truncate">
              {activeWallet}
            </div>
            <button
              onClick={handleCopy}
              className="bg-zinc-800 p-3 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              {copied ? (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Network Info */}
        <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Image 
              src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" 
              alt="Solana" 
              width={20} 
              height={20}
              className="rounded-full"
            />
            <span className="text-sm text-zinc-400">Solana Network</span>
          </div>
          <p className="text-sm text-zinc-500 mt-2">
            This address can receive SOL and Solana tokens (SPL)
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReceiveModal;