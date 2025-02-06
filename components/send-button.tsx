// components/TransferModal.tsx
'use client';

'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';
import { 
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  getAccount,
  getMint
} from '@solana/spl-token';
import Image from 'next/image'
import { resourceUsage } from 'process';

interface Token {
  token_address: string;
  token_icon: string;
  token_name: string;
  usd_value: number;
  formatted_amount: number;
  token_symbol: string;
  token_decimals: number;
}

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: any;
  tokens: Token[];
  solanaBalance?: {
    amount: number;
    usdValue: number;
    logoURI: string;
  };
}

const TransferModal = ({ isOpen, onClose, agent, tokens, solanaBalance }: TransferModalProps) => {
  const { authenticated } = usePrivy();
  const { wallets } = useSolanaWallets();
  const solanaWallet = agent.wallets ? wallets.find(w => w.address === agent.wallets.solana) : null;
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  const [step, setStep] = useState<'select-token' | 'transfer'>('select-token');
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isUSD, setIsUSD] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetForm = () => {
    setStep('select-token');
    setSelectedToken(null);
    setRecipient('');
    setAmount('');
    setError('');
    setSuccess('');
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleTokenSelect = (token: Token | 'SOL') => {
    if (token === 'SOL') {
      setSelectedToken({
        token_address: 'SOL',
        token_icon: solanaBalance?.logoURI || '',
        token_name: 'Solana',
        usd_value: solanaBalance?.usdValue || 0,
        formatted_amount: solanaBalance?.amount || 0,
        token_symbol: 'SOL',
        token_decimals: 9
      });
    } else {
      setSelectedToken(token as Token);
    }
    setStep('transfer');
  };

  const handleMaxAmount = () => {
    if (!selectedToken) return;
    if (isUSD) {
      setAmount(selectedToken.usd_value.toString());
    } else {
      setAmount(selectedToken.formatted_amount.toString());
    }
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
  };

  const toggleAmountType = () => {
    if (!selectedToken) return;
    setIsUSD(!isUSD);
    if (amount) {
      const newAmount = isUSD
        ? (parseFloat(amount) / selectedToken.usd_value * selectedToken.formatted_amount).toFixed(6)
        : (parseFloat(amount) * selectedToken.usd_value / selectedToken.formatted_amount).toFixed(2);
      setAmount(newAmount);
    }
  };

  const handleTransfer = async () => {
    if (!solanaWallet) {
      setError('Wallet not found');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const recipientPubkey = new PublicKey(recipient);
      let transferAmount = parseFloat(amount);

      if (isUSD) {
        transferAmount = transferAmount / selectedToken!.usd_value * selectedToken!.formatted_amount;
      }

      if (isNaN(transferAmount) || transferAmount <= 0) {
        throw new Error('Invalid amount');
      }

      const senderPubkey = new PublicKey(solanaWallet.address);
      let transaction = new Transaction();

      if (selectedToken?.token_address === 'SOL') {
        // Transfer SOL
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: senderPubkey,
            toPubkey: recipientPubkey,
            lamports: Math.floor(transferAmount * LAMPORTS_PER_SOL)
          })
        );
      } else if (selectedToken) {
        // Transfer SPL Token
        const mintPubkey = new PublicKey(selectedToken.token_address);
        const sourceAta = await getAssociatedTokenAddress(mintPubkey, senderPubkey);
        const destinationAta = await getAssociatedTokenAddress(mintPubkey, recipientPubkey);

        // Check if destination account exists
        let destinationAccount;
        try {
          destinationAccount = await getAccount(connection, destinationAta);
        } catch (e) {
          // If destination account doesn't exist, add creation instruction
          transaction.add(
            createAssociatedTokenAccountInstruction(
              senderPubkey,
              destinationAta,
              recipientPubkey,
              mintPubkey
            )
          );
        }

        // Add transfer instruction
        const rawAmount = Math.floor(transferAmount * Math.pow(10, selectedToken.token_decimals));
        transaction.add(
          createTransferCheckedInstruction(
            sourceAta,
            mintPubkey,
            destinationAta,
            senderPubkey,
            rawAmount,
            selectedToken.token_decimals
          )
        );
      }

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPubkey;

      // Sign and send transaction using Privy's wallet
      const signature  = await solanaWallet.sendTransaction(transaction, connection);
      
      await connection.confirmTransaction(signature);

      setSuccess(`Transfer successful! Signature: ${signature}`);
      setTimeout(() => onClose(), 2000);

    } catch (err: any) {
      console.error('Transfer error:', err);
      setError(err.message || 'Failed to complete transfer');
    } finally {
      setLoading(false);
    }
  };
  if (!isOpen) return null;

  if (!solanaWallet)
    return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md mx-4 relative shadow-xl border border-zinc-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold mb-4 text-white">
          {step === 'select-token' ? 'Select Asset' : 'Send Assets'}
        </h2>

        {!authenticated ? (
          <div className="bg-red-500/20 text-red-200 p-4 rounded-md border border-red-500/40">
            Please connect your wallet first
          </div>
        ) : step === 'select-token' ? (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {solanaBalance && (
              <div
                onClick={() => handleTokenSelect('SOL')}
                className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image src={solanaBalance.logoURI} alt="SOL" width={40} height={40} className="rounded-full"/>
                    <div className="flex flex-col justify-start">
                      <div className="text-white">Solana</div>
                      <div className="text-sm text-zinc-400">{solanaBalance.amount} SOL</div>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-400">${solanaBalance.usdValue.toFixed(2)}</div>
                </div>
              </div>
            )}

            {tokens.map((token) => (
              <div
                key={token.token_address}
                onClick={() => handleTokenSelect(token)}
                className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image src={token.token_icon} alt={token.token_name} width={40} height={40} className="rounded-full"/>
                    <div className="flex flex-col justify-start">
                      <div className="text-white">{token.token_name}</div>
                      <div className="text-sm text-zinc-400">{token.formatted_amount} {token.token_symbol}</div>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-400">${token.usd_value.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {selectedToken && (
              <div className="flex items-center gap-2 bg-zinc-800 p-3 rounded-lg">
                <Image src={selectedToken.token_icon} alt={selectedToken.token_name} width={32} height={32} className="rounded-full"/>
                <div className="text-white">{selectedToken.token_name}</div>
                <div className="text-zinc-400 text-sm">
                  Balance: {selectedToken.formatted_amount} {selectedToken.token_symbol}
                </div>
              </div>
            )}

            <input
              type="text"
              placeholder="Recipient address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
            />
            
            <div className="relative">
              <input
                type="number"
                placeholder={`Amount in ${isUSD ? 'USD' : selectedToken?.token_symbol}`}
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
              />
              <div className="absolute right-2 top-2 flex items-center gap-2">
                <button
                  onClick={handleMaxAmount}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  MAX
                </button>
                <button
                  onClick={toggleAmountType}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {isUSD ? selectedToken?.token_symbol : 'USD'}
                </button>
              </div>
            </div>

            <button
              onClick={handleTransfer}
              disabled={loading || !recipient || !amount}
              className="w-full bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>

            {error && (
              <div className="bg-red-500/20 text-red-200 p-4 rounded-md border border-red-500/40">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/20 text-green-200 p-4 rounded-md border border-green-500/40">
                {success}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransferModal;