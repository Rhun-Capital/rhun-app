import React from 'react';
import { CheckCircle, ExternalLink, Copy, X } from 'lucide-react';
import { toast } from 'sonner';

interface DepositSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionSignature: string;
  amount?: string;
  tokenSymbol?: string;
}

export default function DepositSuccessModal({
  isOpen,
  onClose,
  transactionSignature,
  amount,
  tokenSymbol = 'SOL'
}: DepositSuccessModalProps) {
  if (!isOpen) return null;

  const solscanUrl = `https://solscan.io/tx/${transactionSignature}`;
  
  const copyTransactionId = () => {
    navigator.clipboard.writeText(transactionSignature);
    toast.success('Transaction ID copied to clipboard');
  };

  const formatTransactionId = (signature: string) => {
    if (signature.length <= 16) return signature;
    return `${signature.slice(0, 8)}...${signature.slice(-8)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl shadow-2xl border border-zinc-700/50 w-full max-w-md overflow-hidden">
        {/* Header with close button */}
        <div className="relative p-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success icon and message */}
        <div className="px-6 pb-6 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            Deposit Successful!
          </h2>
          
          {amount && (
            <p className="text-zinc-300 text-lg mb-4">
              {amount} {tokenSymbol} has been deposited to your wallet
            </p>
          )}
          
          <p className="text-zinc-400 text-sm">
            Your transaction has been confirmed on the Solana blockchain
          </p>
        </div>

        {/* Transaction details */}
        <div className="px-6 pb-6">
          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-zinc-400">Transaction ID</span>
              <button
                onClick={copyTransactionId}
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors text-sm"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            
            <div className="font-mono text-sm text-zinc-300 bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/30">
              {formatTransactionId(transactionSignature)}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-6 space-y-3">
          <a
            href={solscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <ExternalLink className="w-4 h-4" />
            View on Solscan
          </a>
          
          <button
            onClick={onClose}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-3 rounded-xl font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 