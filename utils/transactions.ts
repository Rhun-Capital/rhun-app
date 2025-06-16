import { Transaction, Connection } from '@solana/web3.js';
import { getSolanaConnection } from './solana';

export async function signAndSendTransaction(
  transaction: Transaction,
  wallet: any // Replace with proper wallet type from your wallet adapter
): Promise<string> {
  try {
    // Get the latest blockhash
    const connection = getSolanaConnection();
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    // Sign the transaction
    const signedTx = await wallet.signTransaction(transaction);

    // Send the transaction
    const signature = await connection.sendRawTransaction(signedTx.serialize());

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });

    if (confirmation.value.err) {
      throw new Error('Transaction failed to confirm');
    }

    return signature;
  } catch (error) {
    console.error('Error signing and sending transaction:', error);
    throw error;
  }
}

export async function signAndSendTransactions(
  transactions: Transaction[],
  wallet: any // Replace with proper wallet type from your wallet adapter
): Promise<string[]> {
  try {
    const signatures: string[] = [];
    const connection = getSolanaConnection();
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    // Sign and send each transaction sequentially
    for (const tx of transactions) {
      tx.recentBlockhash = blockhash;
      const signedTx = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      if (confirmation.value.err) {
        throw new Error('Transaction failed to confirm');
      }

      signatures.push(signature);
    }

    return signatures;
  } catch (error) {
    console.error('Error signing and sending transactions:', error);
    throw error;
  }
} 