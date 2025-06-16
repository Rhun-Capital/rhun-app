import { 
  Connection, 
  PublicKey, 
  Commitment, 
  GetLatestBlockhashConfig, 
  SendOptions, 
  RpcResponseAndContext, 
  SignatureStatus, 
  TransactionMessage, 
  Transaction, 
  SystemProgram, 
  VersionedTransaction, 
  GetBlockHeightConfig, 
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  GetAccountInfoConfig,
  AccountInfo
} from '@solana/web3.js';
import { 
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
 
const JUPITER_V6_QUOTE_API = 'https://quote-api.jup.ag/v6';

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

interface SwapParams {
  fromToken: Token;
  toToken: Token;
  amount: string;
  slippage: number;
  wallet: any; // Wallet interface from Privy
}

interface PriorityFeeEstimate {
  microLamports: number;
  confidence: 'low' | 'medium' | 'high';
}

interface TransferParams {
  wallet: any; // Wallet interface from Privy
  recipient: string;
  token: Token | 'SOL';
  amount: string;
  isUSD?: boolean;
  connection: ProxyConnection;
}

interface TransferResult {
  signature: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

export class SolanaPriorityFeeEstimator {
  private connection: Connection;
  private readonly BASE_PRIORITY_FEE = 10_000; // 0.01 lamports
  private readonly MAX_PRIORITY_FEE = 500_000; // 0.5 lamports
  
  constructor(connection?: Connection) {
    this.connection = connection || new Connection(
      process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com',
      'confirmed'
    );
  }

  /**
   * Estimate priority fee based on recent block priority fees
   * @param percentile - Percentile of recent priority fees to use (default: 75th percentile)
   * @returns PriorityFeeEstimate
   */
  async estimatePriorityFee(
    percentile: number = 75,
    maxSamples: number = 20 // Adjusted to match Solana Web3.js default
  ): Promise<PriorityFeeEstimate> {
    try {
      // Fetch recent blocks to analyze priority fees
      const recentBlocks = await this.connection.getRecentPrioritizationFees();

      if (recentBlocks.length === 0) {
        return this.getDefaultFee('low');
      }

      // Extract and sort priority fees, limited to maxSamples
      const priorityFees = recentBlocks
        .slice(0, maxSamples)
        .map(block => block.prioritizationFee)
        .filter(fee => fee !== 0)
        .sort((a, b) => a - b);

      // If not enough valid samples, use default
      if (priorityFees.length < 10) {
        return this.getDefaultFee('medium');
      }

      // Calculate percentile
      const index = Math.floor((percentile / 100) * (priorityFees.length - 1));
      const percentileFee = priorityFees[index];

      // Determine confidence and apply some additional logic
      const confidence = this.determineFeeConfidence(percentileFee, priorityFees);

      // Apply some safeguards
      const normalizedFee = Math.min(
        Math.max(percentileFee, this.BASE_PRIORITY_FEE),
        this.MAX_PRIORITY_FEE
      );

      return {
        microLamports: Math.round(normalizedFee),
        confidence
      };
    } catch (error) {
      console.warn('Priority fee estimation failed, using default:', error);
      return this.getDefaultFee('medium');
    }
  }

  /**
   * Determine fee confidence based on fee distribution
   * @param targetFee - Calculated percentile fee
   * @param sortedFees - Sorted array of fees
   * @returns Confidence level
   */
  private determineFeeConfidence(
    targetFee: number, 
    sortedFees: number[]
  ): 'low' | 'medium' | 'high' {
    const feeSpread = sortedFees[sortedFees.length - 1] - sortedFees[0];
    const medianIndex = Math.floor(sortedFees.length / 2);
    const median = sortedFees[medianIndex];

    // Calculate variance
    const variance = sortedFees.reduce((sum, fee) => 
      sum + Math.pow(fee - median, 2), 0) / sortedFees.length;

    // Confidence determination logic
    if (variance < 1000 && feeSpread < 10000) {
      return 'high';
    } else if (variance < 5000 && feeSpread < 50000) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get default priority fee based on confidence level
   * @param confidence - Confidence level
   * @returns Default priority fee
   */
  private getDefaultFee(
    confidence: 'low' | 'medium' | 'high' = 'medium'
  ): PriorityFeeEstimate {
    switch (confidence) {
      case 'low':
        return { microLamports: this.BASE_PRIORITY_FEE, confidence: 'low' };
      case 'high':
        return { microLamports: 100_000, confidence: 'high' };
      default:
        return { microLamports: 50_000, confidence: 'medium' };
    }
  }

  /**
   * Convenience method to get compute unit limit based on fee confidence
   * @param estimate - Priority fee estimate
   * @returns Recommended compute unit limit
   */
  getComputeUnitsForFee(estimate: PriorityFeeEstimate): number {
    switch (estimate.confidence) {
      case 'low':
        return 600_000; // Conservative compute units
      case 'high':
        return 1_400_000; // Maximum recommended
      default:
        return 1_000_000; // Balanced approach
    }
  }
}


export function getSolanaConnection(): Connection {
  const rpcUrl = process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com';
  const heliusApiKey = process.env.HELIUS_API_KEY;
  
  // If using Helius, append the API key
  const finalRpcUrl = heliusApiKey && rpcUrl.includes('helius') 
    ? `${rpcUrl}/?api-key=${heliusApiKey}`
    : rpcUrl;

  console.log('Initializing Solana connection with RPC URL:', finalRpcUrl);
  
  return new Connection(finalRpcUrl, 'confirmed');
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
    super('http://localhost:3000', config);
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
        const errorData = await response.json().catch(() => null);
        console.error('RPC request failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        console.error('RPC error response:', data.error);
        throw new Error(data.error.message || 'RPC request failed');
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

  async getAccountInfo(
    publicKey: PublicKey,
    config?: GetAccountInfoConfig
  ): Promise<AccountInfo<Buffer> | null> {
    const params = [
      publicKey.toBase58(),
      // Ensure config is properly formatted for RPC call
      config ? {
        encoding: 'base64',
        commitment: config.commitment || 'confirmed',
        ...config
      } : {
        encoding: 'base64',
        commitment: 'confirmed'
      }
    ];
  
    try {
      const result = await this._rpcRequest('getAccountInfo', params);
      
      // If no account found, return null
      if (!result || !result.result) {
        return null;
      }
  
      // Convert the account info to match Solana Web3.js AccountInfo structure
      return {
        executable: result.result.value.executable,
        owner: new PublicKey(result.result.value.owner),
        lamports: result.result.value.lamports,
        data: Buffer.from(result.result.value.data[0], result.result.value.data[1]),
        rentEpoch: result.result.value.rentEpoch || 0
      };
    } catch (error) {
      console.error('Get account info error:', error);
      throw error;
    }
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
    const result = await this._rpcRequest('getLatestBlockhash', params);
    
    return {
      blockhash: result.result.value.blockhash,
      lastValidBlockHeight: result.result.value.lastValidBlockHeight,
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
      const signature = await this._rpcRequest('sendTransaction', params);
      return signature.result;
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
      const response = await this._rpcRequest('getSignatureStatuses', params);
      console.log("getSignatureStatuses Response:", response.result.value)
      if (!response.result.value[0]) {
        throw new Error('No status returned for signature');
      }
      return { context: { slot: 0 }, value: response.result.value }; // Matching Connection class response format
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
      const result = await this._rpcRequest('getBlockHeight', params);
      return result.result;
    } catch (error) {
      console.error('Get block height error:', error);
      throw error;
    }
  }

}

export async function executeTransfer({
  wallet,
  recipient,
  token,
  amount,
  isUSD = false,
  connection
}: TransferParams): Promise<TransferResult> {
  if (!wallet || !wallet.address) {
    return { 
      signature: '', 
      status: 'failed', 
      error: 'Wallet not connected' 
    };
  }

  try {
    const recipientPubkey = new PublicKey(recipient);
    const selectedToken = token === 'SOL' 
      ? { 
          token_address: 'SOL', 
          token_decimals: 9, 
          usd_value: 0, 
          formatted_amount: 0 
        } 
      : token;

    let transferAmount = parseFloat(amount);

    if (isUSD) {
      transferAmount = transferAmount / selectedToken.usd_value * selectedToken.formatted_amount;
    }

    if (isNaN(transferAmount) || transferAmount <= 0) {
      return { 
        signature: '', 
        status: 'failed', 
        error: 'Invalid amount' 
      };
    }

    const senderPubkey = new PublicKey(wallet.address);
    let transaction = new Transaction();

    // Initialize Priority Fee Estimator
    const priorityFeeEstimator = new SolanaPriorityFeeEstimator(connection);
    
    // Estimate priority fee
    const feeEstimate = await priorityFeeEstimator.estimatePriorityFee();
    const computeUnits = priorityFeeEstimator.getComputeUnitsForFee(feeEstimate);

    // Add compute budget instructions for priority fee
    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: feeEstimate.microLamports }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits })
    );

    if (selectedToken.token_address === 'SOL') {
      // Transfer SOL
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: senderPubkey,
          toPubkey: recipientPubkey,
          lamports: Math.floor(transferAmount * LAMPORTS_PER_SOL)
        })
      );
    } else {
      // SPL Token Transfer
      const mintPubkey = new PublicKey(selectedToken.token_address);
      
      // Get sender's ATA
      const sourceAta = await getAssociatedTokenAddress(
        mintPubkey,
        senderPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Verify sender's token account exists and has sufficient balance
      const sourceAccount = await getAccount(
        connection,
        sourceAta,
        'confirmed',
        TOKEN_PROGRAM_ID
      );

      // Verify account ownership and balance
      if (!sourceAccount.owner.equals(senderPubkey)) {
        return { 
          signature: '', 
          status: 'failed', 
          error: 'Token account not owned by sender' 
        };
      }

      // Get recipient's ATA
      const destinationAta = await getAssociatedTokenAddress(
        mintPubkey,
        recipientPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Check if destination account exists, create if not
      try {
        await getAccount(
          connection,
          destinationAta,
          'confirmed',
          TOKEN_PROGRAM_ID
        );
      } catch (e: any) {
        if (e?.message?.includes('TokenAccountNotFoundError')) {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              senderPubkey,
              destinationAta,
              recipientPubkey,
              mintPubkey,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        } else {
          return { 
            signature: '', 
            status: 'failed', 
            error: 'Failed to verify destination account' 
          };
        }
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
          selectedToken.token_decimals,
          [],
          TOKEN_PROGRAM_ID
        )
      );
    }

    // Get latest blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPubkey;

    // Sign and send transaction
    const signedTx = await wallet.signTransaction(transaction);
    
    const signature = await connection.sendRawTransaction(
      signedTx.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      }
    );

    return {
      signature,
      status: 'pending'
    };

  } catch (error: any) {
    console.error('Transfer error:', error);
    return { 
      signature: '', 
      status: 'failed', 
      error: error.message || 'Failed to complete transfer' 
    };
  }
}

export const executeSwap = async ({
  fromToken,
  toToken,
  amount,
  slippage,
  wallet
}: SwapParams): Promise<string> => {
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

    // Prepare swap amount in token's smallest unit
    const swapAmount = Math.floor(
      parseFloat(amount) * Math.pow(10, fromToken?.token_decimals || 9)
    );

    // Calculate slippage in basis points for Jupiter
    const slippageBps = Math.floor(slippage * 100);

    // Get swap quote
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
    const feeEstimator = new SolanaPriorityFeeEstimator();
    const feeEstimate = await feeEstimator.estimatePriorityFee();
    const computeUnits = feeEstimator.getComputeUnitsForFee(feeEstimate);

    // Add priority fee instructions
    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({ 
      microLamports: computeUnits
    });
    
    const computeUnitsIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1_400_000 // Typical units for complex swaps
    });

    const swapRequest = {
      quoteResponse: quoteData,
      userPublicKey: wallet.address,
      computeUnitPriceMicroLamports: computeUnits,
      useTokenLedger: false,
      additionalInstructions: [
        priorityFeeIx,
        computeUnitsIx
      ]
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
    const swapTransactionBuf = Buffer.from(responseData.swapTransaction, 'base64');
    const swapTransaction = VersionedTransaction.deserialize(swapTransactionBuf);
    
    // Update swap transaction with fresh blockhash
    swapTransaction.message.recentBlockhash = swapBlockhash;
    
    const signedSwapTx = await wallet.signTransaction(swapTransaction);
    
    const swapSignature = await connection.sendRawTransaction(
      signedSwapTx.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      }
    );

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

    if (!quoteData) {
      throw new Error('No quote data received');
    }

    return quoteData;
  } catch (err: any) {
    console.error('Error getting quote:', err);
    return null;
  }
};