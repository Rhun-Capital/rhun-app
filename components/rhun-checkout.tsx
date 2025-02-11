// pages/index.js
import React, { useState, useEffect } from 'react';
import {
  PublicKey,
  Connection,
  Commitment,
  GetLatestBlockhashConfig,
  SendOptions,
  Transaction,
  RpcResponseAndContext,
  SignatureStatus,
} from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
// Import Privy’s hooks (adjust if needed)
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';
import Image from 'next/image';
import LoadingIndicator from './loading-indicator';

// Custom ProxyConnection class for routing RPC calls via your API
class ProxyConnection extends Connection {
  constructor(config?: { commitment?: Commitment }) {
    // Use a dummy URL since we'll override all RPC calls
    super('http://localhost', config);
  }

  private async customRpcRequest(method: string, params: any[]) {
    try {
      const response = await fetch('/api/solana/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params,
        }),
      });

      if (!response.ok) {
        throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.result;
    } catch (error) {
      console.error('RPC request failed:', error);
      throw error;
    }
  }

  async _rpcRequest(method: string, params: any[]) {
    const result = await this.customRpcRequest(method, params);
    return {
      result,
      id: 1,
      jsonrpc: '2.0',
    };
  }

  async getLatestBlockhash(
    commitmentOrConfig?: Commitment | GetLatestBlockhashConfig
  ): Promise<Readonly<{ blockhash: string; lastValidBlockHeight: number }>> {
    const config =
      typeof commitmentOrConfig === 'string'
        ? { commitment: commitmentOrConfig }
        : commitmentOrConfig;
    const params = config ? [config] : [];
    const result = await this.customRpcRequest('getLatestBlockhash', params);
    return {
      blockhash: result.value.blockhash,
      lastValidBlockHeight: result.value.lastValidBlockHeight,
    };
  }

  async sendRawTransaction(
    rawTransaction: Buffer | Uint8Array | Array<number>,
    options?: SendOptions
  ): Promise<string> {
    const buffer = Buffer.from(rawTransaction);
    const params = [
      buffer.toString('base64'),
      {
        encoding: 'base64',
        ...options,
      },
    ];

    try {
      const signature = await this.customRpcRequest('sendTransaction', params);
      return signature;
    } catch (error) {
      console.error('Send transaction error:', error);
      throw error;
    }
  }

  async getSignatureStatus(
    signature: string,
    config?: any
  ): Promise<RpcResponseAndContext<SignatureStatus | null>> {
    const params = [signature];
    if (config) {
      params.push(config);
    }

    try {
      const response = await this.customRpcRequest('getSignatureStatuses', [params]);
      if (!response.value[0]) {
        throw new Error('No status returned for signature');
      }
      // Return a response in a similar format to Connection's response
      return { context: { slot: 0 }, value: response.value };
    } catch (error) {
      console.error('Get signature status error:', error);
      throw error;
    }
  }
}
const Home = () => {
  // Replace these with your actual values:
  const RECIPIENT_ADDRESS = 'Gv85m1prXqiJCq7tWKA5YGtXLVKpNk55tBRBCuThYWdt'; // Payment recipient
  const TOKEN_MINT_ADDRESS = 'Gh8yeA9vH5Fun7J6esFH3mV65cQTBpxk9Z5XpzU7pump'; // Custom SPL token mint

  // The USD amount to send
  const USD_AMOUNT = 1;
  // Define your token's decimals (for example, 6)
  const TOKEN_DECIMALS = 6;

  // Instead of a fixed TOKEN_AMOUNT, calculate it based on the current token price.
  const [calculatedTokenAmount, setCalculatedTokenAmount] = useState<number | null>(null);
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const {user, getAccessToken} = usePrivy();

  // Set up a connection to the Solana network using our ProxyConnection
  const [connection, setConnection] = useState<Connection | null>(null);
  useEffect(() => {
    const solConnection = new ProxyConnection({ commitment: 'confirmed' });
    setConnection(solConnection);
  }, []);

  // Use Privy's hooks to access wallet methods
  const { wallets: solanaWallets } = useSolanaWallets();
  const activeWallet = solanaWallets[0];

  // State to track transaction progress
  const [transactionStatus, setTransactionStatus] = useState('');
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch the current token price from CoinGecko
  useEffect(() => {
    async function fetchTokenPrice() {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=rhun-capital&vs_currencies=usd'
        );
        const data = await res.json();
        if (data['rhun-capital'] && data['rhun-capital'].usd) {
          const price = data['rhun-capital'].usd;
          setTokenPrice(price);
          const tokensForUSD = USD_AMOUNT / price;
          const tokenAmountInSmallestUnit = Math.floor(tokensForUSD * Math.pow(10, TOKEN_DECIMALS));
          setCalculatedTokenAmount(tokenAmountInSmallestUnit);
        } else {
          console.error('Token price not found in response');
        }
      } catch (error) {
        console.error('Error fetching token price:', error);
      }
    }
    fetchTokenPrice();
  }, []);

  // Helper functions (fetchTransactionDetails and pollForTransactionDetails)
  async function fetchTransactionDetailsByWallet(
    walletAddress: string,
    txSignature: string,
  ): Promise<any> {
    const accessToken = await getAccessToken();
    const res = await fetch(
      `/api/solscan/transactions?address=${walletAddress}&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!res.ok) {
      throw new Error(`Error fetching transactions: ${res.statusText}`);
    }
    const data = await res.json();
    // Assuming the response has a "data" array of transactions
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error("Unexpected API response structure");
    }
    // Find the transaction with the matching signature
    const matchingTx = data.data.find((tx: any) => tx.tx_hash === txSignature);
    return matchingTx || null;
  }
  
  /**
   * Polls for the transaction details using the wallet address.
   * It repeatedly calls fetchTransactionDetailsByWallet until it finds the transaction
   * and determines that it is successful (e.g. status is "Success").
   *
   * @param walletAddress - The wallet address to query.
   * @param txSignature - The transaction signature to check.
   * @returns The matching transaction object if found and confirmed, or null if not found within timeout.
   */
  async function pollForTransactionDetails(
    walletAddress: string,
    txSignature: string,
  ): Promise<any> {
    const maxAttempts = 10;
    const delay = 2000; // 2 seconds between attempts
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const details = await fetchTransactionDetailsByWallet(
          walletAddress,
          txSignature
        );
        // Adjust the condition below based on your API response structure.
        // For example, if the transaction object has a "status" property that is "Success".
        if (details && details.status === "Success") {
          return details;
        }
      } catch (e) {
        console.error('Error polling transaction details:', e);
      }
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return null;
  }

  // Function to handle the payment
  const handlePayment = async () => {
    setLoading(true);
    if (!activeWallet) {
      alert('Wallet not connected or network unavailable.');
      setLoading(false);
      return;
    }
    if (!calculatedTokenAmount) {
      alert('Token price not available yet. Please try again in a moment.');
      setLoading(false);
      return;
    }
  
    try {
      const senderPublicKey = activeWallet.address;
      const recipient = new PublicKey(RECIPIENT_ADDRESS);
      const tokenMint = new PublicKey(TOKEN_MINT_ADDRESS);
  
      // Derive associated token accounts for sender and recipient
      const senderATA = await getAssociatedTokenAddress(tokenMint, new PublicKey(senderPublicKey));
      const recipientATA = await getAssociatedTokenAddress(tokenMint, recipient);
  
      // Create the transfer instruction using the calculated token amount
      const transferIx = createTransferInstruction(
        senderATA,
        recipientATA,
        new PublicKey(senderPublicKey),
        calculatedTokenAmount
      );
  
      // Build the transaction
      const transaction = new Transaction().add(transferIx);
      transaction.feePayer = new PublicKey(senderPublicKey);
      if (!connection) {
        throw new Error('Connection is not established');
      }
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  
      // Send the transaction via your active wallet (Privy)
      const txSignature = await activeWallet.sendTransaction(transaction, connection);
      setTransactionStatus('Transaction sent. Awaiting confirmation...');
      setSignature(txSignature);
  
      // Poll for the transaction details using the wallet address and transaction signature.
      const confirmedTx = await pollForTransactionDetails(
        senderPublicKey,
        txSignature
      );
      confirmedTx.calculatedTokenAmount = calculatedTokenAmount;
      if (confirmedTx) {
        const accessToken = await getAccessToken();
        const storeRes = await fetch(`/api/subscriptions/${user?.id}/token-subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify(confirmedTx),
          });
          if (!storeRes.ok) {
            console.error('Error storing confirmed transaction:', await storeRes.text());
          }
          setTransactionStatus('Transaction confirmed!');
      } else {
        setTransactionStatus('Transaction not confirmed within timeout. Please check later.');
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      setTransactionStatus(`Error processing payment: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="flex flex-col justify-center items-center">
      {(transactionStatus !== 'Transaction confirmed!') ? <button
        disabled={loading}
        onClick={handlePayment}
        className="bg-black hover:opacity-75 transition text-white py-2 px-4 rounded-lg border border-2 border-zinc-400 w-full min-h-[50px]"
      >
        {loading ? (
          <div className="flex items-center gap-4 justify-center">
            <span className="mr-2 text-gray-400">Confirming</span>
            <LoadingIndicator />
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Image
              src="/images/profile.png"
              alt="Profile Image"
              height={25}
              width={25}
              className="rounded-full shadow"
            />
            <span>
              {calculatedTokenAmount
                ? (calculatedTokenAmount / Math.pow(10, TOKEN_DECIMALS)).toFixed(2)
                : '0.00'}{' '}
              RHUN
            </span>
          </div>
        )}
      </button> : 
      
      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
      
      }
      {transactionStatus && (
        <>
          <p className="mt-4 text-white max-w-[270px] truncate">{transactionStatus}</p>
          {signature && (
            <a
              className="text-indigo-400"
              href={`https://explorer.solana.com/tx/${signature}`}
              target="_blank"
              rel="noreferrer"
            >
              View on Solana Explorer
            </a>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
