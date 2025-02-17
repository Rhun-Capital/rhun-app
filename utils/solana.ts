import { Connection, PublicKey, Commitment, GetLatestBlockhashConfig, SendOptions, RpcResponseAndContext, SignatureStatus, Transaction, SystemProgram } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
 
const JUPITER_V6_QUOTE_API = 'https://quote-api.jup.ag/v6';
const FEE_PERCENTAGE = 0.01; // 1% fee
const FEE_RECIPIENT = 'Gv85m1prXqiJCq7tWKA5YGtXLVKpNk55tBRBCuThYWdt'; // Rhun Recipient Wallet

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
}

export const executeSwap = async ({
    fromToken,
    toToken,
    amount,
    slippage,
    wallet
  }: SwapParams  
) => {
  try {
    if (!wallet || !wallet.address) {
      throw new Error('Wallet not connected');
    }

    const connection = new ProxyConnection({ commitment: 'confirmed' });

    // Log wallet state
    console.log('Wallet state:', {
      address: wallet.address,
      type: wallet.walletClientType,
      hasSignTransaction: !!wallet.signTransaction,
      hasSendTransaction: !!wallet.sendTransaction
    });

    const inputMint = fromToken?.token_address === 'SOL' 
      ? 'So11111111111111111111111111111111111111112' 
      : fromToken?.token_address;
    
    const outputMint = toToken?.token_address === 'SOL'
      ? 'So11111111111111111111111111111111111111112'
      : toToken?.token_address;

    // Calculate decimals amount here
    const amountInDecimals = Math.floor(
      parseFloat(amount) * Math.pow(10, fromToken?.token_decimals || 9)
    );

    const slippageBps = Math.floor(slippage * 100);

    // Log swap parameters
    console.log('Swap parameters:', {
      inputMint,
      outputMint,
      amount,
      amountInDecimals,
      slippageBps,
      userAddress: wallet.address
    });

    // Get quote with specific options
    console.log('Fetching quote...');
    const quoteResponse = await fetch(
      `${JUPITER_V6_QUOTE_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInDecimals}&slippageBps=${slippageBps}&asLegacyTransaction=true`,
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text();
      console.error('Quote error:', errorText);
      throw new Error(`Failed to get quote: ${errorText}`);
    }

    const quoteData = await quoteResponse.json();
    console.log('Quote received:', {
      routes: quoteData.routesInfos?.length,
      inAmount: quoteData.inputAmount,
      outAmount: quoteData.outputAmount
    });

    // Get fresh blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    console.log('Got blockhash:', { blockhash, lastValidBlockHeight });

    // Now get the swap transaction
    console.log('Requesting swap transaction...');
    const swapRequest = {
      quoteResponse: quoteData,
      userPublicKey: wallet.address,
      asLegacyTransaction: true,
      computeUnitPriceMicroLamports: 1000,
      useTokenLedger: false
    };

    const swapResponse = await fetch(`${JUPITER_V6_QUOTE_API}/swap`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(swapRequest)
    });

    if (!swapResponse.ok) {
      const errorText = await swapResponse.text();
      console.error('Swap preparation error:', errorText);
      throw new Error(`Failed to prepare swap: ${errorText}`);
    }

    const responseData = await swapResponse.json();
    if (!responseData.swapTransaction) {
      console.error('No swap transaction in response:', responseData);
      throw new Error('No swap transaction received from API');
    }

    // Log transaction data
    console.log('Got swap transaction data');

    // Decode transaction
    console.log('Decoding transaction...');
    const serializedTransaction = Buffer.from(responseData.swapTransaction, 'base64');
    const transaction = Transaction.from(serializedTransaction);

    // Set transaction parameters
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(wallet.address);

    // Log transaction details
    console.log('Transaction prepared:', {
      numInstructions: transaction.instructions.length,
      recentBlockhash: transaction.recentBlockhash,
      feePayer: transaction.feePayer.toBase58(),
      signers: transaction.signatures.length
    });

    const signedTx = await wallet.signTransaction(transaction);
    
    // Send raw transaction through our proxy connection
    console.log('Sending signed transaction through proxy...');
    const signature = await connection.sendRawTransaction(
      signedTx.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      }
    );      

    console.log('Transaction submitted with signature:', signature);

    return signature;

  } catch (error) {
    // Log any errors in detail
    console.error('Swap execution error:', {
      error,
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name
    });
    throw error;
  }
};

// With fees, not working 
// export const executeSwap = async ({
//   fromToken,
//   toToken,
//   amount,
//   slippage,
//   wallet
// }: SwapParams  
// ) => {
// try {
//   if (!wallet || !wallet.address) {
//     throw new Error('Wallet not connected');
//   }

//   const connection = new ProxyConnection({ commitment: 'confirmed' });

//   const inputMint = fromToken?.token_address === 'SOL' 
//     ? 'So11111111111111111111111111111111111111112' 
//     : fromToken?.token_address;
  
//   const outputMint = toToken?.token_address === 'SOL'
//     ? 'So11111111111111111111111111111111111111112'
//     : toToken?.token_address;

//   // Robust USD value extraction with fallbacks
//   const usdValue = (() => {
//     if ((fromToken as any).usd_price) return (fromToken as any).usd_price;
//     if (fromToken.usd_value) return fromToken.usd_value;
//     console.warn('No USD value found for token');
//     return 0;
//   })();

//   // Prevent division by zero and add minimum fee logic
//   const MIN_FEE_LAMPORTS = 5000;  // Minimum fee of 0.005 SOL
//   const MAX_FEE_PERCENTAGE = 0.05;  // Maximum 5% fee
//   const MIN_SWAP_AMOUNT = 0.000001;  // Minimum swap amount

//   const amountInUSD = parseFloat(amount) * usdValue;
  
//   // Validate swap amount
//   if (amountInUSD < MIN_SWAP_AMOUNT) {
//     throw new Error(`Swap amount too small. Minimum is $${MIN_SWAP_AMOUNT}`);
//   }

//   // Calculate fee with min and max bounds
//   const feeInUSD = Math.max(
//     Math.min(
//       amountInUSD * FEE_PERCENTAGE,  // Normal percentage fee
//       amountInUSD * MAX_FEE_PERCENTAGE  // Cap at max percentage
//     ),
//     MIN_FEE_LAMPORTS / 10**9  // Ensure minimum fee in SOL
//   );

//   console.log("Fee Calculation:", {
//     amountInUSD,
//     usdValue,
//     feeInUSD,
//     feePercentage: (feeInUSD / amountInUSD * 100).toFixed(2) + '%'
//   });

//   // Prevent division by zero
//   const feeInTokenAmount = usdValue > 0 
//     ? feeInUSD / usdValue 
//     : 0;

//   // Calculate original amount in decimals
//   const originalAmountInDecimals = Math.floor(
//     parseFloat(amount) * Math.pow(10, fromToken?.token_decimals || 9)
//   );

//   // Calculate fee amount in base units
//   const feeAmountInDecimals = Math.floor(
//     feeInTokenAmount * Math.pow(10, fromToken?.token_decimals || 9)
//   );

//   const slippageBps = Math.floor(slippage * 100);

//   // Get latest blockhash first
//   console.log('Getting latest blockhash...');
//   const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
//   console.log('Got blockhash:', { blockhash, lastValidBlockHeight });
  
//   // Calculate final swap amount
//   const swapAmount = originalAmountInDecimals - feeAmountInDecimals;

//   console.log('Fee Calculation Details:', {
//     originalAmount: parseFloat(amount),
//     usdValue,
//     amountInUSD,
//     feeInUSD,
//     feeInTokenAmount,
//     feeAmountInDecimals,
//     swapAmount
//   });
  
//   // Get quote from Jupiter with reduced amount
//   console.log('Getting quote for:', {
//     inputMint,
//     outputMint,
//     swapAmount,
//     originalAmount: originalAmountInDecimals,
//     feeInUSD,
//     slippageBps
//   });

//   // Get quote for reduced amount
//   const quoteResponse = await fetch(
//     `${JUPITER_V6_QUOTE_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${swapAmount}&slippageBps=${slippageBps}&asLegacyTransaction=true`,
//     {
//       headers: {
//         'Content-Type': 'application/json',
//       }
//     }
//   );

//   if (!quoteResponse.ok) {
//     const errorText = await quoteResponse.text();
//     console.error('Quote error:', errorText);
//     throw new Error(`Failed to get quote: ${errorText}`);
//   }

//   const quoteData = await quoteResponse.json();
//   console.log('Quote received:', quoteData);

//   // Get swap transaction for the reduced amount
//   console.log('Requesting swap transaction...');
//   const swapRequest = {
//     quoteResponse: quoteData,
//     userPublicKey: wallet.address,
//     asLegacyTransaction: true,
//     computeUnitPriceMicroLamports: 1000,
//     useTokenLedger: false
//   };

//   const swapResponse = await fetch(`${JUPITER_V6_QUOTE_API}/swap`, {
//     method: 'POST',
//     headers: { 
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(swapRequest)
//   });

//   if (!swapResponse.ok) {
//     const errorText = await swapResponse.text();
//     console.error('Swap preparation error:', errorText);
//     throw new Error(`Failed to prepare swap: ${errorText}`);
//   }

//   const responseData = await swapResponse.json();
//   if (!responseData.swapTransaction) {
//     console.error('No swap transaction in response:', responseData);
//     throw new Error('No swap transaction received from API');
//   }

//   // Decode transaction
//   console.log('Decoding transaction...');
//   const serializedTransaction = Buffer.from(responseData.swapTransaction, 'base64');
//   let transaction = Transaction.from(serializedTransaction);

//   // Log detailed instruction info
//   console.log('Jupiter transaction details:', {
//     instructionCount: transaction.instructions.length,
//     instructions: transaction.instructions.map(ix => ({
//       programId: ix.programId.toBase58(),
//       accountKeys: ix.keys.map(k => ({
//         pubkey: k.pubkey.toBase58(),
//         isWritable: k.isWritable,
//         isSigner: k.isSigner
//       })),
//       data: ix.data.toString('hex').slice(0, 20) + '...' // Just show start of data
//     }))
//   });

//   // Create fee transfer instruction
//   const feeTransferIx = SystemProgram.transfer({
//     fromPubkey: new PublicKey(wallet.address),
//     toPubkey: new PublicKey(FEE_RECIPIENT),
//     lamports: Math.max(MIN_FEE_LAMPORTS, feeAmountInDecimals)  // Ensure minimum fee
//   });

//   // Create final transaction
//   const finalTransaction = new Transaction();
//   finalTransaction.recentBlockhash = blockhash;
//   finalTransaction.feePayer = new PublicKey(wallet.address);

//   // Add Jupiter's instructions, inserting our fee transfer in the middle
//   const midpoint = Math.floor(transaction.instructions.length / 2);
//   const firstHalf = transaction.instructions.slice(0, midpoint);
//   const secondHalf = transaction.instructions.slice(midpoint);

//   // Add instructions in order:
//   // 1. First half of Jupiter's instructions (setup)
//   // 2. Our fee transfer
//   // 3. Second half of Jupiter's instructions (swap)
//   firstHalf.forEach(ix => finalTransaction.add(ix));
//   finalTransaction.add(feeTransferIx);
//   secondHalf.forEach(ix => finalTransaction.add(ix));
  
//   console.log('Final transaction:', {
//     numInstructions: finalTransaction.instructions.length,
//     instructionTypes: finalTransaction.instructions.map(ix => ix.programId.toBase58()),
//     feeAmount: Math.max(MIN_FEE_LAMPORTS, feeAmountInDecimals)
//   });

//   const signedTx = await wallet.signTransaction(finalTransaction);
  
//   // Send raw transaction
//   console.log('Sending signed transaction...');
//   const signature = await connection.sendRawTransaction(
//     signedTx.serialize(),
//     {
//       skipPreflight: false,
//       preflightCommitment: 'confirmed',
//       maxRetries: 3
//     }
//   );      

//   console.log('Transaction submitted with signature:', signature);
//   return signature;

// } catch (error) {
//   console.error('Swap execution error:', {
//     error,
//     message: (error as Error).message,
//     stack: (error as Error).stack,
//     name: (error as Error).name
//   });
//   throw error;
// }
// };

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
      slippageBps: slippageBps.toString(),
      asLegacyTransaction: 'true'
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

    return quoteData
  } catch (err: any) {
    console.error('Error getting quote:', err);
    return null
  }
};