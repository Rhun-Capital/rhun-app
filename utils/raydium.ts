import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { NATIVE_MINT, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import axios from 'axios';

const RAYDIUM_SWAP_API = 'https://transaction-v1.raydium.io';

interface SwapParams {
  fromToken: Token;
  toToken: Token;
  amount: string;
  slippage: number;
  wallet: any;
}

interface Token {
  token_address: string;
  token_icon: string;
  token_name: string;
  token_symbol: string;
  token_decimals: number;
  usd_price: number;
  usd_value: number;
  formatted_amount: number;
}

interface SwapCompute {
  id: string;
  success: boolean;
  data: {
    default: {
      vh: number;
      h: number;
      m: number;
    }
  }
}

export async function getQuote(
  fromToken: Token | null,
  toToken: Token | null,
  amount: string,
  slippage: string
) {
  if (!fromToken || !toToken || !amount || parseFloat(amount) <= 0) {
    return null;
  }

  try {
    const inputMint = fromToken.token_address === 'SOL' 
      ? 'So11111111111111111111111111111111111111112' 
      : fromToken.token_address;
    
    const outputMint = toToken.token_address === 'SOL'
      ? 'So11111111111111111111111111111111111111112'
      : toToken.token_address;

    const amountInDecimals = Math.floor(
      parseFloat(amount) * Math.pow(10, fromToken.token_decimals)
    );

    const slippageBps = Math.floor(parseFloat(slippage) * 100);

    console.log('Getting Raydium quote for:', {
      inputMint,
      outputMint,
      amount: amountInDecimals,
      slippageBps
    });

    // Get quote from Raydium API
    const { data: swapResponse } = await axios.get<SwapCompute>(
      `${RAYDIUM_SWAP_API}/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInDecimals}&slippageBps=${slippageBps}&txVersion=V0`
    );

    if (!swapResponse.success) {
      throw new Error('Failed to get quote from Raydium');
    }

    return swapResponse;
  } catch (err: any) {
    console.error('Error getting Raydium quote:', err);
    return null;
  }
}

export async function executeSwap({
  fromToken,
  toToken,
  amount,
  slippage,
  wallet
}: SwapParams): Promise<string> {
  try {
    if (!wallet || !wallet.address) {
      throw new Error('Wallet not connected');
    }

    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

    // Setup input and output mints
    const inputMint = fromToken?.token_address === 'SOL' 
      ? 'So11111111111111111111111111111111111111112' 
      : fromToken?.token_address;
    
    const outputMint = toToken?.token_address === 'SOL'
      ? 'So11111111111111111111111111111111111111112'
      : toToken?.token_address;

    // Calculate amount in smallest units
    const swapAmount = Math.floor(
      parseFloat(amount) * Math.pow(10, fromToken?.token_decimals || 9)
    );

    // Calculate slippage in basis points
    const slippageBps = Math.floor(slippage * 100);

    // Get priority fee estimate
    const { data: priorityFeeData } = await axios.get<{
      id: string;
      success: boolean;
      data: { default: { vh: number; h: number; m: number } }
    }>(`${RAYDIUM_SWAP_API}/priority-fee`);

    // Get quote
    const { data: swapResponse } = await axios.get<SwapCompute>(
      `${RAYDIUM_SWAP_API}/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${swapAmount}&slippageBps=${slippageBps}&txVersion=V0`
    );

    if (!swapResponse.success) {
      throw new Error('Failed to get swap quote from Raydium');
    }

    // Get token accounts if needed
    let inputAccount, outputAccount;
    const walletPubkey = new PublicKey(wallet.address);

    if (fromToken.token_address !== 'SOL') {
      inputAccount = (await getAssociatedTokenAddress(
        new PublicKey(fromToken.token_address),
        walletPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )).toString();
    }

    if (toToken.token_address !== 'SOL') {
      outputAccount = (await getAssociatedTokenAddress(
        new PublicKey(toToken.token_address),
        walletPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )).toString();
    }

    // Get swap transaction
    const { data: swapTransactions } = await axios.post<{
      id: string;
      version: string;
      success: boolean;
      data: { transaction: string }[]
    }>(`${RAYDIUM_SWAP_API}/transaction/swap-base-in`, {
      computeUnitPriceMicroLamports: String(priorityFeeData.data.default.h),
      swapResponse,
      txVersion: 'V0',
      wallet: wallet.address,
      wrapSol: fromToken.token_address === 'SOL',
      unwrapSol: toToken.token_address === 'SOL',
      inputAccount,
      outputAccount,
    });

    if (!swapTransactions.success) {
      throw new Error('Failed to prepare swap transaction');
    }

    // Process all transactions
    for (const tx of swapTransactions.data) {
      const txBuf = Buffer.from(tx.transaction, 'base64');
      const transaction = VersionedTransaction.deserialize(txBuf);
      
      // Sign transaction
      transaction.sign([wallet]);
      
      // Send transaction
      const signature = await connection.sendTransaction(transaction, { skipPreflight: true });
      console.log('Swap transaction sent:', signature);
      
      // Wait for confirmation
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature
      });

      return signature;
    }

    throw new Error('No transactions to process');
  } catch (error) {
    console.error('Raydium swap execution error:', error);
    throw error;
  }
} 