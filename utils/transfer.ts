// utils/transfer.ts
import { 
    Connection, 
    PublicKey, 
    Transaction, 
    SystemProgram,
    LAMPORTS_PER_SOL
  } from '@solana/web3.js'
  import { 
    createTransferInstruction,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    getAccount,
  } from '@solana/spl-token'
  
  export async function transferSOL(
    connection: Connection,
    fromPubkey: PublicKey,
    toPubkey: PublicKey,
    amount: number, // amount in SOL
    signTransaction: (transaction: Transaction) => Promise<Transaction>
  ) {
    try {
      const transaction = new Transaction()
      
      // Add transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: amount * LAMPORTS_PER_SOL
        })
      )
  
      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = fromPubkey
  
      // Sign and send transaction
      const signed = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction(signature)
  
      return signature
  
    } catch (error) {
      console.error('Error transferring SOL:', error)
      throw error
    }
  }
  
  export async function transferToken(
    connection: Connection,
    fromPubkey: PublicKey,
    toPubkey: PublicKey,
    tokenMint: PublicKey,
    amount: number, // amount in tokens (not raw)
    decimals: number,
    signTransaction: (transaction: Transaction) => Promise<Transaction>
  ) {
    try {
      const transaction = new Transaction()
  
      // Get source token account
      const fromTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        fromPubkey
      )
  
      // Get or create destination token account
      const toTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        toPubkey
      )
  
      // Check if destination token account exists
      try {
        await getAccount(connection, toTokenAccount)
      } catch (error) {
        // If account doesn't exist, add creation instruction
        transaction.add(
          createAssociatedTokenAccountInstruction(
            fromPubkey,
            toTokenAccount,
            toPubkey,
            tokenMint
          )
        )
      }
  
      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPubkey,
          amount * Math.pow(10, decimals)
        )
      )
  
      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = fromPubkey
  
      // Sign and send transaction
      const signed = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction(signature)
  
      return signature
  
    } catch (error) {
      console.error('Error transferring token:', error)
      throw error
    }
  }