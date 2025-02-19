// components/TransferModal.tsx
'use client';
import { useState, useEffect } from 'react';
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';
import Image from 'next/image';
import { ProxyConnection, executeTransfer } from '../utils/solana';


interface Token {
  token_address: string;
  token_icon: string;
  token_name: string;
  usd_price: number;
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
  
  const connection = new ProxyConnection({ commitment: 'confirmed' });
  
  const [step, setStep] = useState<'select-token' | 'transfer'>('select-token');
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isUSD, setIsUSD] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'confirmed' | 'failed' | null>(null);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);

  const resetForm = () => {
    setStep('select-token');
    setSelectedToken(null);
    setRecipient('');
    setAmount('');
    setError('');
    setSuccess('');
    setTransactionStatus(null);
    setPendingSignature(null);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const checkTransactionStatus = async (signature: string) => {
    let retries = 0;
    const maxRetries = 45; // 90 seconds total (45 * 2 second intervals)
    
    const checkStatus = async () => {
      try {
        const status = await connection.getSignatureStatus(signature);
        console.log('Transaction status:', status?.value);
        if (status.value && Array.isArray(status.value) && status.value[0]?.confirmationStatus === 'finalized') {
          setTransactionStatus('confirmed');
          setSuccess(signature);
          return true;          
        }        

        if (status?.value?.err) {
          setTransactionStatus('failed');
          setError(`Transaction failed: ${JSON.stringify(status.value.err)}`);
          return false;
        }

        return null;
      } catch (error) {
        console.error('Status check error:', error);
        return null;
      }
    };

    // Initial check
    const initialStatus = await checkStatus();
    if (initialStatus !== null) return;

    // Start polling
    const intervalId = setInterval(async () => {
      retries++;
      const status = await checkStatus();
      
      if (status !== null || retries >= maxRetries) {
        clearInterval(intervalId);
        if (status === null && retries >= maxRetries) {
          setError(`Transaction confirmation is taking longer than expected. Please check the transaction status on Solscan. Signature: ${signature}`);
        }
      }
    }, 2000);

    return () => clearInterval(intervalId);
  };

  // const handleTransfer = async () => {
  //   if (!solanaWallet) {
  //     setError('Wallet not found');
  //     return;
  //   }
  
  //   try {
  //     setLoading(true);
  //     setError('');
  //     setSuccess('');
  
  //     const recipientPubkey = new PublicKey(recipient);
  //     let transferAmount = parseFloat(amount);
  
  //     if (isUSD) {
  //       transferAmount = transferAmount / selectedToken!.usd_value * selectedToken!.formatted_amount;
  //     }
  
  //     if (isNaN(transferAmount) || transferAmount <= 0) {
  //       throw new Error('Invalid amount');
  //     }
  
  //     const senderPubkey = new PublicKey(solanaWallet.address);
  //     let transaction = new Transaction();
  
  //     if (selectedToken?.token_address === 'SOL') {
  //       // Transfer SOL
  //       transaction.add(
  //         SystemProgram.transfer({
  //           fromPubkey: senderPubkey,
  //           toPubkey: recipientPubkey,
  //           lamports: Math.floor(transferAmount * LAMPORTS_PER_SOL)
  //         })
  //       );
  //     } else if (selectedToken) {
  //       // Transfer SPL Token
  //       console.log('Starting SPL token transfer setup...');
        
  //       const mintPubkey = new PublicKey(selectedToken.token_address);
  //       console.log('Mint address:', mintPubkey.toString());
        
  //       // Get sender's ATA
  //       const sourceAta = await getAssociatedTokenAddress(
  //         mintPubkey,
  //         senderPubkey,
  //         false,
  //         TOKEN_PROGRAM_ID,
  //         ASSOCIATED_TOKEN_PROGRAM_ID
  //       );
  //       console.log('Sender ATA:', sourceAta.toString());
  
  //       // Verify sender's token account exists and has sufficient balance
  //       try {
  //         console.log('Verifying sender token account...');
  //         const sourceAccount = await getAccount(
  //           connection,
  //           sourceAta,
  //           'confirmed',
  //           TOKEN_PROGRAM_ID
  //         );
          
  //         console.log('Source account details:', {
  //           address: sourceAccount.address.toString(),
  //           mint: sourceAccount.mint.toString(),
  //           owner: sourceAccount.owner.toString(),
  //           amount: sourceAccount.amount.toString()
  //         });
  
  //         // Verify account ownership
  //         if (!sourceAccount.owner.equals(senderPubkey)) {
  //           throw new Error('Token account not owned by sender');
  //         }
  
  //         // Verify sufficient balance
  //         const rawAmount = BigInt(Math.floor(transferAmount * Math.pow(10, selectedToken.token_decimals)));
  //         if (sourceAccount.amount < rawAmount) {
  //           throw new Error('Insufficient token balance');
  //         }
  
  //       } catch (e: any) {
  //         console.error('Source account verification error:', e);
  //         if (e?.message?.includes('TokenAccountNotFoundError')) {
  //           throw new Error('You don\'t have a token account for this token. Please ensure you own this token.');
  //         }
  //         throw new Error(`Failed to verify sender's token account: ${e.message}`);
  //       }
  
  //       // Get recipient's ATA
  //       const destinationAta = await getAssociatedTokenAddress(
  //         mintPubkey,
  //         recipientPubkey,
  //         false,
  //         TOKEN_PROGRAM_ID,
  //         ASSOCIATED_TOKEN_PROGRAM_ID
  //       );
  //       console.log('Recipient ATA:', destinationAta.toString());
  
  //       // Check if destination account exists
  //       try {
  //         await getAccount(
  //           connection,
  //           destinationAta,
  //           'confirmed',
  //           TOKEN_PROGRAM_ID
  //         );
  //         console.log('Destination account exists');
  //       } catch (e: any) {
  //         if (e?.message?.includes('TokenAccountNotFoundError')) {
  //           console.log('Creating destination token account...');
  //           transaction.add(
  //             createAssociatedTokenAccountInstruction(
  //               senderPubkey,
  //               destinationAta,
  //               recipientPubkey,
  //               mintPubkey,
  //               TOKEN_PROGRAM_ID,
  //               ASSOCIATED_TOKEN_PROGRAM_ID
  //             )
  //           );
  //         } else {
  //           console.error('Error checking destination account:', e);
  //           throw e;
  //         }
  //       }
  
  //       // Add transfer instruction
  //       const rawAmount = Math.floor(transferAmount * Math.pow(10, selectedToken.token_decimals));
  //       console.log('Creating transfer instruction:', {
  //         from: sourceAta.toString(),
  //         to: destinationAta.toString(),
  //         amount: rawAmount,
  //         decimals: selectedToken.token_decimals
  //       });
        
  //       transaction.add(
  //         createTransferCheckedInstruction(
  //           sourceAta,
  //           mintPubkey,
  //           destinationAta,
  //           senderPubkey,
  //           rawAmount,
  //           selectedToken.token_decimals,
  //           [],
  //           TOKEN_PROGRAM_ID
  //         )
  //       );
  //     }
  
  //     // Get latest blockhash
  //     const { blockhash } = await connection.getLatestBlockhash('confirmed');
  //     transaction.recentBlockhash = blockhash;
  //     transaction.feePayer = senderPubkey;
  
  //     // Log transaction details
  //     console.log('Transaction setup complete:', {
  //       instructions: transaction.instructions.map(ix => ({
  //         programId: ix.programId.toString(),
  //         keys: ix.keys.map(k => ({
  //           pubkey: k.pubkey.toString(),
  //           isSigner: k.isSigner,
  //           isWritable: k.isWritable
  //         }))
  //       })),
  //       feePayer: transaction.feePayer?.toString(),
  //       recentBlockhash: transaction.recentBlockhash
  //     });
  
  //     // Sign and send transaction
  //     const signedTx = await solanaWallet.signTransaction(transaction);
      
  //     console.log('Sending signed transaction...');
  //     const signature = await connection.sendRawTransaction(
  //       signedTx.serialize(),
  //       {
  //         skipPreflight: false,
  //         preflightCommitment: 'confirmed',
  //         maxRetries: 3
  //       }
  //     );
  
  //     console.log('Transaction submitted with signature:', signature);
  //     setTransactionStatus('pending');
  //     setPendingSignature(signature);
  //     checkTransactionStatus(signature);
  
  //   } catch (err: any) {
  //     console.error('Transfer error:', err);
  //     setError(err.message || 'Failed to complete transfer');
  //     setTransactionStatus('failed');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSendTransaction = async () => {
    if (!selectedToken) {
      setError('No token selected');
      return;
    }

    const result = await executeTransfer({
      wallet: solanaWallet,
      recipient: recipient,
      token: selectedToken,
      amount: amount,
      isUSD: isUSD,
      connection: new ProxyConnection()
    });
  
    if (result.status === 'pending') {
      // Handle pending state
      setPendingSignature(result.signature);
      
      try {
        await checkTransactionStatus(result.signature);
      } catch (error) {
        // Handle timeout or error
      }
    } else if (result.status === 'failed') {
      // Handle error
      setError(result.error || 'An unknown error occurred');
    }
  };

  const handleTokenSelect = (token: Token | 'SOL') => {
    if (token === 'SOL') {
      setSelectedToken({
              token_address: 'SOL',
              token_icon: solanaBalance?.logoURI || '',
              token_name: 'Solana',
              usd_price: solanaBalance?.usdValue || 0, // Add this line
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

  if (!isOpen) return null;

  if (!solanaWallet)
    return null;

const renderSuccessState = () => {
    if (!pendingSignature && !success) return null;
  
    const signature = success || pendingSignature;
    const isPending = transactionStatus === 'pending';
    
    return (
      <div className="inset-0 bg-zinc-900 flex flex-col items-center justify-center rounded-lg px-6 h-[400px]">
        {/* Status Icon */}
        {transactionStatus === 'confirmed' ? (
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-yellow-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        )}
  
        {/* Status Text */}
        <h3 className="text-xl font-bold text-white mb-2">
          {isPending ? 'Transaction Pending' : 'Transfer Successful'}
        </h3>
        
        <p className="text-zinc-400 text-center mb-4">
          {isPending 
            ? 'Please wait while your transaction is being confirmed...' 
            : `Successfully transferred ${amount} ${selectedToken?.token_symbol}`}
        </p>
  
        {/* Transaction Link */}
        <a
          href={`https://solscan.io/tx/${signature}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          View on Solscan
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
  
        {/* New Transfer Button (only show if confirmed) */}
        {transactionStatus === 'confirmed' && (
          <button
            onClick={() => {
              resetForm();
            }}
            className="mt-6 px-6 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
          >
            Make Another Transfer
          </button>
        )}
      </div>
    );
  };


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
        ) : success || pendingSignature ? (
          renderSuccessState()
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
                onChange={(e) => setAmount(e.target.value)}
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
              onClick={handleSendTransaction}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default TransferModal;