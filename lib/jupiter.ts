import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';

// Types for Jupiter API responses
interface JupiterOrderResponse {
  swapType: 'aggregator' | 'rfq';
  requestId: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: 'ExactIn' | 'ExactOut';
  slippageBps: number;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  inputMint: string;
  outputMint: string;
  feeBps: number;
  taker?: string;
  gasless: boolean;
  transaction?: string;
  prioritizationType: string;
  prioritizationFeeLamports: number;
}

interface JupiterExecuteResponse {
  status: 'Success' | 'Failed';
  signature: string;
  slot: string;
  code: number;
  inputAmountResult?: string;
  outputAmountResult?: string;
  swapEvents?: Array<{
    inputMint: string;
    inputAmount: string;
    outputMint: string;
    outputAmount: string;
  }>;
  error?: string;
}

// Constants
const JUPITER_API_BASE = 'https://lite-api.jup.ag/ultra/v1';

// Function to get a swap order
export async function getSwapOrder(
  inputMint: string,
  outputMint: string,
  amount: string,
  taker?: string
): Promise<JupiterOrderResponse> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    ...(taker && { taker }),
  });

  const response = await fetch(`${JUPITER_API_BASE}/order?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to get swap order: ${response.statusText}`);
  }

  return response.json();
}

// Function to execute a swap order
export async function executeSwapOrder(
  signedTransaction: string,
  requestId: string
): Promise<JupiterExecuteResponse> {
  const response = await fetch(`${JUPITER_API_BASE}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      signedTransaction,
      requestId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to execute swap order: ${response.statusText}`);
  }

  return response.json();
}

// Helper function to sign and execute a swap
export async function signAndExecuteSwap(
  connection: Connection,
  wallet: any, // Use the wallet adapter type
  orderResponse: JupiterOrderResponse
): Promise<JupiterExecuteResponse> {
  if (!orderResponse.transaction) {
    throw new Error('No transaction found in order response');
  }

  // Deserialize the transaction
  const transaction = VersionedTransaction.deserialize(
    Buffer.from(orderResponse.transaction, 'base64')
  );

  console.log('About to sign transaction with wallet:', wallet);
  let signedTransaction;
  try {
    signedTransaction = await wallet.signTransaction(transaction);
    console.log('Transaction signed successfully');
  } catch (err) {
    console.error('Error signing transaction:', err);
    throw err;
  }

  // Serialize the signed transaction to base64
  const signedTransactionBase64 = Buffer.from(signedTransaction.serialize()).toString('base64');

  console.log('About to call /execute with requestId:', orderResponse.requestId);
  // Execute the swap
  return executeSwapOrder(signedTransactionBase64, orderResponse.requestId);
}

// Helper function to get token price in SOL
export async function getTokenPriceInSol(
  tokenMint: string,
  amount: string = '1000000' // 1 token with 6 decimals
): Promise<number> {
  try {
    const order = await getSwapOrder(
      tokenMint,
      'So11111111111111111111111111111111111111112', // SOL mint
      amount
    );
    
    return Number(order.outAmount) / 1e9; // Convert lamports to SOL
  } catch (error) {
    console.error('Error getting token price:', error);
    throw error;
  }
} 