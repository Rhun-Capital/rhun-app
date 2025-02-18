import { Connection, PublicKey, Commitment, GetLatestBlockhashConfig, SendOptions, RpcResponseAndContext, SignatureStatus, TransactionMessage, Transaction, SystemProgram, VersionedTransaction, TransactionInstruction, GetBlockHeightConfig, TransactionConfirmationStrategy, SignatureResult, } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
 
const JUPITER_V6_QUOTE_API = 'https://quote-api.jup.ag/v6';
const FEE_PERCENTAGE = 0.01; // 1% fee
const FEE_RECIPIENT = 'Gv85m1prXqiJCq7tWKA5YGtXLVKpNk55tBRBCuThYWdt'; // Rhun Recipient Wallet

interface Token {
  token_address: string;
  token_icon: string;
  token_name: string;
  usd_price: number;
  formatted_amount: number;
  token_symbol: string;
  token_decimals: number;
}

interface SwapParams {
  fromToken: Token;
  toToken: Token;
  amount: string;
  slippage: number;
  wallet: any; // Wallet interface from Privy
}


export function getSolanaConnection(
): Connection {
  const rpcUrl = process.env.HELIUS_RPC_URL;
  const heliusApiKey = process.env.HELIUS_API_KEY;
  
  if (!rpcUrl) {
    throw new Error('HELIUS_RPC_URL is not defined in environment variables');
  }

  return new Connection(`${rpcUrl}/?api-key=${heliusApiKey}`, 'confirmed');
}

export async function getSolanaBalance(
  walletAddress: string
): Promise<number> {
  const rpcUrl = process.env.HELIUS_RPC_URL;
  const heliusApiKey = process.env.HELIUS_API_KEY;
  try {
    const connection = new Connection(
      `${rpcUrl}/?api-key=${heliusApiKey}`, 
      'confirmed'
    );
    
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    
    // Convert lamports to SOL
    return balance / 10**9;
  } catch (error) {
    console.error('Error fetching Solana balance:', error);
    throw error;
  }
}

export class ProxyConnection extends Connection {
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
      jsonrpc: '2.0'
    };
  }

  async getLatestBlockhash(
    commitmentOrConfig?: Commitment | GetLatestBlockhashConfig
  ): Promise<Readonly<{
    blockhash: string;
    lastValidBlockHeight: number;
  }>> {
    const config = typeof commitmentOrConfig === 'string' 
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
        ...options
      }
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
      console.log("getSignatureStatuses Response:", response.value)
      if (!response.value[0]) {
        throw new Error('No status returned for signature');
      }
      return { context: { slot: 0 }, value: response.value }; // Matching Connection class response format
    } catch (error) {
      console.error('Get signature status error:', error);
      throw error;
    }
  }


  getBlockHeight = async (
    commitmentOrConfig?: Commitment | GetBlockHeightConfig
  ): Promise<number> => {
    const config = typeof commitmentOrConfig === 'string'
      ? { commitment: commitmentOrConfig }
      : commitmentOrConfig;

    const params = config ? [config] : [];
    try {
      return await this.customRpcRequest('getBlockHeight', params);
    } catch (error) {
      console.error('Get block height error:', error);
      throw error;
    }
  }

}


interface Token {
  token_address: string;
  token_icon: string;
  token_name: string;
  usd_value: number;
  formatted_amount: number;
  token_symbol: string;
  token_decimals: number;
}

interface SwapParams {
  fromToken: Token;
  toToken: Token;
  amount: string;
  slippage: number;
  wallet: any;
}

export const executeSwap = async ({
  fromToken,
  toToken,
  amount,
  slippage,
  wallet
}: SwapParams) => {
  try {
    if (!wallet || !wallet.address) {
      throw new Error('Wallet not connected');
    }

    const connection = new ProxyConnection({ commitment: 'confirmed' });

    // Setup input and output mints
    const inputMint = fromToken?.token_address === 'SOL' 
      ? 'So11111111111111111111111111111111111111112' 
      : fromToken?.token_address;
    
    const outputMint = toToken?.token_address === 'SOL'
      ? 'So11111111111111111111111111111111111111112'
      : toToken?.token_address;

    // Calculate USD value of the swap
    const swapUsdAmount = parseFloat(amount) * fromToken.usd_price;
    const usdFee = swapUsdAmount * FEE_PERCENTAGE;
    
    // Get SOL price and convert fee to SOL
    const solPriceUsd = fromToken.token_symbol === 'SOL' 
      ? fromToken.usd_price 
      : toToken.token_symbol === 'SOL'
      ? toToken.usd_price : 0;
      
    // Calculate SOL fee amount in lamports
    const feeAmountInSol = usdFee / solPriceUsd;
    const feeAmountInLamports = Math.floor(feeAmountInSol * Math.pow(10, 9));

    // Prepare swap amount in token's smallest unit
    const swapAmount = Math.floor(
      parseFloat(amount) * Math.pow(10, fromToken?.token_decimals || 9)
    );

    // Create SOL fee transfer instruction
    const userPublicKey = new PublicKey(wallet.address);
    const feeRecipientPublicKey = new PublicKey(FEE_RECIPIENT);
    
    const feeInstruction = SystemProgram.transfer({
      fromPubkey: userPublicKey,
      toPubkey: feeRecipientPublicKey,
      lamports: feeAmountInLamports
    });

    // Get fresh blockhash for fee transaction
    const { blockhash: feeBlockhash } = await connection.getLatestBlockhash('confirmed');

    // Create and send fee transaction
    const feeMessage = new TransactionMessage({
      payerKey: userPublicKey,
      recentBlockhash: feeBlockhash,
      instructions: [feeInstruction]
    }).compileToV0Message();

    const feeTransaction = new VersionedTransaction(feeMessage);
    const signedFeeTx = await wallet.signTransaction(feeTransaction);
    
    console.log('Sending fee transaction...');
    const feeSignature = await connection.sendRawTransaction(
      signedFeeTx.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      }
    );
    console.log('Fee transaction sent:', feeSignature);

    // Calculate slippage in basis points for Jupiter
    const slippageBps = Math.floor(slippage * 100);

    // Get swap quote
    console.log('Getting swap quote...');
    const quoteResponse = await fetch(
      `${JUPITER_V6_QUOTE_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${swapAmount}&slippageBps=${slippageBps}`,
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (!quoteResponse.ok) {
      throw new Error(`Failed to get quote: ${await quoteResponse.text()}`);
    }

    const quoteData = await quoteResponse.json();

    // Request swap transaction
    console.log('Preparing swap transaction...');
    const swapRequest = {
      quoteResponse: quoteData,
      userPublicKey: wallet.address,
      computeUnitPriceMicroLamports: 1000,
      useTokenLedger: false
    };

    const swapResponse = await fetch(`${JUPITER_V6_QUOTE_API}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(swapRequest)
    });

    if (!swapResponse.ok) {
      throw new Error(`Failed to prepare swap: ${await swapResponse.text()}`);
    }

    const responseData = await swapResponse.json();
    if (!responseData.swapTransaction) {
      throw new Error('No swap transaction received from API');
    }

    // Get fresh blockhash for swap
    const { blockhash: swapBlockhash } = await connection.getLatestBlockhash('confirmed');

    // Prepare and send swap transaction
    console.log('Preparing swap transaction...');
    const swapTransactionBuf = Buffer.from(responseData.swapTransaction, 'base64');
    const swapTransaction = VersionedTransaction.deserialize(swapTransactionBuf);
    
    // Update swap transaction with fresh blockhash
    swapTransaction.message.recentBlockhash = swapBlockhash;
    
    const signedSwapTx = await wallet.signTransaction(swapTransaction);
    
    console.log('Sending swap transaction...');
    const swapSignature = await connection.sendRawTransaction(
      signedSwapTx.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      }
    );
    console.log('Swap transaction sent:', swapSignature);

    // Return swap signature - component will handle confirmation
    return swapSignature;

  } catch (error) {
    console.error('Swap execution error:', error);
    throw error;
  }
};

export const getQuote = async (
  fromToken: Token | null,
  toToken: Token | null,
  amount: string,
  slippage: string
) => {
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

    console.log('Getting quote for:', {
      inputMint,
      outputMint,
      amount: amountInDecimals,
      slippageBps
    });

    const queryParams = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amountInDecimals.toString(),
      slippageBps: slippageBps.toString()
    });

    const response = await fetch(
      `${JUPITER_V6_QUOTE_API}/quote?${queryParams.toString()}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get quote');
    }

    const quoteData = await response.json();
    console.log('Received quote:', quoteData);

    if (!quoteData) {
      throw new Error('No quote data received');
    }

    return quoteData;
  } catch (err: any) {
    console.error('Error getting quote:', err);
    return null;
  }
};