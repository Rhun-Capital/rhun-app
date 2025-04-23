import { NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PrivyClient } from '@privy-io/server-auth';

// Initialize Privy client with wallet API option
const privyClient = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
  process.env.PRIVY_APP_SECRET || '',
  {
    walletApi: {
      authorizationPrivateKey: process.env.PRIVY_WALLET_AUTH_KEY || undefined
    }
  }
);

export async function POST(request: Request) {
  try {
    // Extract the authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify the access token
    let userData;
    try {
      userData = await privyClient.verifyAuthToken(token);
      
      if (!userData) {
        return NextResponse.json({ error: 'Invalid access token' }, { status: 401 });
      }
    } catch (error) {
      console.error('Error verifying access token:', error);
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401 });
    }
    
    // Parse the request body
    const { walletAddress, recipient, tokenAddress, amount } = await request.json();
    
    if (!walletAddress || !recipient || !amount) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Configure Solana connection
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    
    // Create the transaction
    try {
      let transaction;
      
      // Handle SOL or token transfers
      if (!tokenAddress || tokenAddress === 'SOL') {
        // Native SOL transfer
        transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(walletAddress),
            toPubkey: new PublicKey(recipient),
            lamports: Math.round(parseFloat(amount) * LAMPORTS_PER_SOL)
          })
        );
      } else {
        // SPL token transfer
        const sourceTokenAccount = await getAssociatedTokenAddress(
          new PublicKey(tokenAddress),
          new PublicKey(walletAddress)
        );
        
        const destinationTokenAccount = await getAssociatedTokenAddress(
          new PublicKey(tokenAddress),
          new PublicKey(recipient)
        );
        
        transaction = new Transaction().add(
          createTransferInstruction(
            sourceTokenAccount,
            destinationTokenAccount,
            new PublicKey(walletAddress),
            Math.round(parseFloat(amount) * Math.pow(10, 6)) // Using 6 decimals as default
          )
        );
      }
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(walletAddress);
      
      // Convert transaction to wire format
      const serializedTransaction = transaction.serialize({ requireAllSignatures: false }).toString('base64');
      
      // Make an API call to Privy to sign the transaction using the delegated wallet
      // Note: Actual implementation would depend on Privy's server API for delegated wallets
      const response = await fetch('https://api.privy.io/v1/wallets/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${process.env.NEXT_PUBLIC_PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`).toString('base64')}`,
          'privy-app-id': process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''
        },
        body: JSON.stringify({
          address: walletAddress,
          chain_type: 'solana',
          method: 'signTransaction',
          params: {
            transaction: serializedTransaction
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to sign transaction: ${JSON.stringify(errorData)}`);
      }
      
      const signedTxData = await response.json();
      const signedTx = Transaction.from(Buffer.from(signedTxData.result, 'base64'));
      
      // Send the signed transaction
      const txSignature = await connection.sendRawTransaction(
        signedTx.serialize()
      );
      
      await connection.confirmTransaction(txSignature);
      
      return NextResponse.json({
        success: true,
        txSignature,
        message: 'Transaction sent successfully'
      });
    } catch (error) {
      console.error('Error executing transaction:', error);
      return NextResponse.json({ 
        error: 'Failed to execute transaction',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 