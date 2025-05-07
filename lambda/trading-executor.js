// AWS SDK imports
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import axios from 'axios';
import { Buffer } from 'buffer';

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(ddbClient);
const STRATEGIES_TABLE = process.env.STRATEGIES_TABLE || 'RhunTradingStrategies';
const PRIVY_APP_ID = process.env.PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
const PRIVY_API_URL = 'https://api.privy.io/v1';
const FORCE_TEST_MODE = process.env.FORCE_TEST_MODE === 'true';

/**
 * Main Lambda handler
 */
export const handler = async (event) => {
  console.log('Event received:', JSON.stringify(event));
  
  // Check for test mode flag in the event or environment variable
  const isTestMode = event?.testMode === true || FORCE_TEST_MODE;
  if (isTestMode) {
    console.log('Running in test mode - delegation checks will be bypassed');
  }
  
  try {
    // Fetch strategies that need to be executed
    const now = new Date().toISOString();
    const strategies = await getStrategiesToExecute(now);
    
    console.log(`Found ${strategies.length} strategies to execute`);
    
    // Execute each strategy in parallel
    const results = await Promise.allSettled(
      strategies.map(strategy => executeStrategy(strategy, isTestMode))
    );
    
    // Process results
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success === true).length;
    const skippedCount = results.filter(r => r.status === 'fulfilled' && r.value?.success === false).length;
    const failedCount = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Executed ${successCount} strategies successfully, skipped ${skippedCount}, failed ${failedCount}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        executed: successCount,
        skipped: skippedCount,
        failed: failedCount
      })
    };
  } catch (error) {
    console.error('Error executing trading strategies:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};

/**
 * Get strategies that need to be executed
 */
async function getStrategiesToExecute(currentTime) {
  const params = {
    TableName: STRATEGIES_TABLE,
    FilterExpression: '#nextExecution <= :now AND #statusField = :statusValue',
    ExpressionAttributeNames: {
      '#nextExecution': 'nextExecution',
      '#statusField': 'status'
    },
    ExpressionAttributeValues: {
      ':now': currentTime,
      ':statusValue': 'active'
    }
  };
  
  console.log(`Fetching strategies with nextExecution <= ${currentTime} and status = active`);
  const result = await dynamoDB.send(new ScanCommand(params));
  
  // Log each strategy that was found
  if (result.Items && result.Items.length > 0) {
    result.Items.forEach(strategy => {
      console.log(`Found strategy: ID=${strategy.id}, Type=${strategy.strategyType}, NextExecution=${strategy.nextExecution}, WalletAddress=${strategy.walletAddress}`);
    });
  } else {
    console.log('No strategies found matching the criteria');
  }
  
  return result.Items || [];
}

/**
 * Execute a single trading strategy
 */
async function executeStrategy(strategy, isTestMode = false) {
  console.log(`Executing strategy ${strategy.id} of type ${strategy.strategyType}`);
  
  try {
    // Check delegation status first (unless in test mode)
    // if (!isTestMode) {
    //   const isDelegated = await checkDelegation(strategy.userId, strategy.walletAddress);
    //   if (!isDelegated) {
    //     console.log(`DEACTIVATING STRATEGY: Wallet ${strategy.walletAddress} is no longer delegated, marking strategy ${strategy.id} as inactive`);
    //     await updateStrategyStatus(strategy, 'inactive', 'Wallet delegation revoked');
    //     return {
    //       success: false,
    //       strategyId: strategy.id,
    //       reason: 'delegation_revoked'
    //     };
    //   }
    // } else {
    //   console.log(`Test mode: Skipping delegation check for wallet ${strategy.walletAddress}`);
    // }
    
    // Execute different strategies based on type
    let txResult;
    
    switch (strategy.strategyType) {
      case 'dca':
        txResult = await executeDCAStrategy(strategy);
        break;
      case 'momentum':
        txResult = await executeMomentumStrategy(strategy);
        break;
      case 'limit':
        txResult = await executeLimitStrategy(strategy);
        break;
      case 'rebalance':
        txResult = await executeRebalanceStrategy(strategy);
        break;
      default:
        throw new Error(`Unknown strategy type: ${strategy.strategyType}`);
    }
    
    // Update strategy with execution time and next execution time
    await updateStrategyAfterExecution(strategy, txResult);
    
    return {
      success: true,
      strategyId: strategy.id,
      transactionHash: txResult.signature
    };
  } catch (error) {
    console.error(`Error executing strategy ${strategy.id}:`, error);
    
    // Update strategy with error
    await updateStrategyWithError(strategy, error);
    
    throw error;
  }
}

/**
 * Execute a Dollar Cost Averaging strategy
 */
async function executeDCAStrategy(strategy) {
  // In a DCA strategy, we buy a fixed amount of tokens at regular intervals
  return await executeSwap(
    strategy.userId,
    strategy.walletAddress,
    'SOL', 
    strategy.targetToken,
    strategy.amount.toString()
  );
}

/**
 * Execute a Momentum Trading strategy
 */
async function executeMomentumStrategy(strategy) {
  // For momentum strategy, check if token has positive momentum before buying
  // This is a simplified implementation - in reality you'd use technical indicators
  
  try {
    // Get current price and 24h change
    const tokenData = await getTokenPriceData(strategy.targetToken);
    
    // If price is trending up (positive 24h change), buy
    if (tokenData.priceChange24h > 0) {
      return await executeSwap(
        strategy.userId,
        strategy.walletAddress,
        'SOL', 
        strategy.targetToken,
        strategy.amount.toString()
      );
    } else {
      console.log(`Skipping momentum trade for ${strategy.targetToken} due to negative momentum`);
      return { skipped: true, reason: 'negative_momentum' };
    }
  } catch (error) {
    console.error('Error in momentum strategy:', error);
    throw error;
  }
}

/**
 * Execute a Limit Order strategy
 */
async function executeLimitStrategy(strategy) {
  // For limit strategy, execute only if price is at or below limit price
  
  try {
    // Get current price
    const tokenData = await getTokenPriceData(strategy.targetToken);
    
    // If current price is at or below limit price, execute buy
    if (tokenData.price <= strategy.limitPrice) {
      return await executeSwap(
        strategy.userId,
        strategy.walletAddress,
        'SOL', 
        strategy.targetToken,
        strategy.amount.toString()
      );
    } else {
      console.log(`Skipping limit order for ${strategy.targetToken} - current price ${tokenData.price} above limit ${strategy.limitPrice}`);
      return { skipped: true, reason: 'price_above_limit' };
    }
  } catch (error) {
    console.error('Error in limit strategy:', error);
    throw error;
  }
}

/**
 * Execute a Portfolio Rebalancing strategy
 */
async function executeRebalanceStrategy(strategy) {
  // Simplified implementation - in reality you'd check current portfolio allocation
  // and buy/sell to maintain target allocations
  
  try {
    // For simplicity, we'll just do a small buy of the target token
    return await executeSwap(
      strategy.userId,
      strategy.walletAddress,
      'SOL', 
      strategy.targetToken,
      (strategy.amount / 2).toString() // Use half the amount for rebalancing
    );
  } catch (error) {
    console.error('Error in rebalance strategy:', error);
    throw error;
  }
}

/**
 * Update strategy with execution details and calculate next execution time
 */
async function updateStrategyAfterExecution(strategy, txResult) {
  const now = new Date();
  const nextExecution = calculateNextExecution(now, strategy.frequency);
  
  const params = {
    TableName: STRATEGIES_TABLE,
    Key: { 
      walletAddress: strategy.walletAddress, 
      id: strategy.id 
    },
    UpdateExpression: 'SET lastExecuted = :lastExecuted, nextExecution = :nextExecution, lastTxHash = :lastTxHash, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':lastExecuted': now.toISOString(),
      ':nextExecution': nextExecution.toISOString(),
      ':lastTxHash': txResult.signature || null,
      ':updatedAt': now.toISOString()
    }
  };
  
  await dynamoDB.send(new UpdateCommand(params));
}

/**
 * Update strategy with error information
 */
async function updateStrategyWithError(strategy, error) {
  const now = new Date();
  const nextExecution = calculateNextExecution(now, strategy.frequency);
  
  const params = {
    TableName: STRATEGIES_TABLE,
    Key: { 
      walletAddress: strategy.walletAddress, 
      id: strategy.id 
    },
    UpdateExpression: 'SET lastError = :lastError, nextExecution = :nextExecution, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':lastError': error.message,
      ':nextExecution': nextExecution.toISOString(),
      ':updatedAt': now.toISOString()
    }
  };
  
  await dynamoDB.send(new UpdateCommand(params));
}

/**
 * Calculate the next execution time based on frequency
 */
function calculateNextExecution(date, frequency) {
  const nextDate = new Date(date);
  
  switch (frequency) {
    case 'hourly':
      nextDate.setHours(nextDate.getHours() + 1);
      break;
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    default:
      nextDate.setDate(nextDate.getDate() + 1);
  }
  
  return nextDate;
}

/**
 * Get token price data from an API
 */
async function getTokenPriceData(tokenSymbol) {
  try {
    // This would be replaced with a real API call to get token price data
    // For simplicity, returning mock data
    const mockData = {
      'BONK': { price: 0.00000357, priceChange24h: 3.5 },
      'JTO': { price: 1.58, priceChange24h: -1.2 },
      'JUP': { price: 0.87, priceChange24h: 5.3 },
      'PYTH': { price: 0.47, priceChange24h: 0.8 }
    };
    
    return mockData[tokenSymbol] || { price: 0.1, priceChange24h: 1.0 };
  } catch (error) {
    console.error('Error fetching token price data:', error);
    throw error;
  }
}

/**
 * Check if a wallet is still delegated using Privy API
 */
async function checkDelegation(userId, walletAddress) {
  try {
    console.log(`Checking delegation for user ${userId}, wallet ${walletAddress}`);
    
    // First, try to get all wallets to find the ID of the specific wallet
    console.log(`Calling API: GET ${PRIVY_API_URL}/wallets`);
    const response = await axios.get(
      `${PRIVY_API_URL}/wallets`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'privy-app-id': PRIVY_APP_ID
        }
      }
    );
    
    if (response.status !== 200) {
      console.warn(`Failed to list wallets: ${response.statusText}`);
      return false;
    }
    
    // Find the wallet that matches our address
    const wallets = response.data?.wallets || [];
    console.log(`Found ${wallets.length} wallets in Privy`);
    
    const wallet = wallets.find(w => w.address.toLowerCase() === walletAddress.toLowerCase());
    
    if (!wallet) {
      console.warn(`Wallet ${walletAddress} not found in Privy wallets list`);
      return false;
    }
    
    console.log(`Found matching wallet in Privy with ID: ${wallet.id}`);
    
    // Check if we can access the wallet (if we can, it means it's delegated to us)
    console.log(`Calling API: GET ${PRIVY_API_URL}/wallets/${wallet.id}`);
    const walletCheckResponse = await axios.get(
      `${PRIVY_API_URL}/wallets/${wallet.id}`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'privy-app-id': PRIVY_APP_ID
        }
      }
    );
    
    const isDelegated = walletCheckResponse.status === 200;
    console.log(`Wallet delegation check result: ${isDelegated ? 'Delegated' : 'Not delegated'}`);
    return isDelegated;
  } catch (error) {
    console.error('Error checking wallet access:', error);
    
    // For debugging, log more details about the error
    if (error.response) {
      console.error('Error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('Error request:', {
        method: error.request.method,
        path: error.request.path,
        headers: error.request.getHeaders()
      });
    }
    
    // If we can't check, assume delegation is not valid for safety
    return false;
  }
}

/**
 * Execute a swap transaction using Privy delegated wallet
 */
async function executeSwap(userId, walletAddress, fromToken, toToken, amount) {
  try {
    console.log(`Executing swap: ${amount} ${fromToken} → ${toToken} for wallet ${walletAddress}`);
    
    // Get all wallets to find the ID of our target wallet
    const walletsResponse = await axios.get(
      `${PRIVY_API_URL}/wallets`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'privy-app-id': PRIVY_APP_ID
        }
      }
    );
    
    if (walletsResponse.status !== 200) {
      throw new Error(`Failed to get wallets list: ${walletsResponse.statusText}`);
    }
    
    // Find the wallet ID that matches our address
    const wallets = walletsResponse.data?.wallets || [];
    const wallet = wallets.find(w => w.address.toLowerCase() === walletAddress.toLowerCase());
    
    if (!wallet) {
      throw new Error(`Wallet ${walletAddress} not found in wallets list`);
    }
    
    // Use the wallet ID to make the RPC call
    const walletId = wallet.id;
    
    // We'll build a proper Jupiter swap transaction here
    // For now, this is a simplified version that transfers SOL
    const rpcResponse = await axios.post(
      `${PRIVY_API_URL}/wallets/${walletId}/rpc`,
      {
        method: "solana_sendTransaction",
        caip2: "solana:mainnet",
        chain_type: "solana",
        params: {
          // This would be a proper Jupiter swap transaction in production
          transaction: {
            to: getTokenAddress(toToken),
            value: parseFloat(amount) * 1000000000 // Convert SOL to lamports
          }
        }
      },
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'privy-app-id': PRIVY_APP_ID
        }
      }
    );
    
    if (rpcResponse.status !== 200) {
      throw new Error(`Failed to send transaction: ${rpcResponse.statusText}`);
    }
    
    // Return the result
    return {
      success: true,
      signature: rpcResponse.data.data.hash
    };
  } catch (error) {
    console.error('Error executing swap:', error);
    throw error;
  }
}

/**
 * Helper function to get token address from symbol
 */
function getTokenAddress(symbol) {
  // This would be replaced with actual token addresses
  const tokenAddresses = {
    'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    'JTO': '7R7rZ7SsLDXkYAfJyRCBScpnMYLg94McMufssfKvfwzM',
    'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZxfrCmdi',
    'PYTH': 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3'
  };
  
  return tokenAddresses[symbol] || symbol;
}

/**
 * Helper function to update a strategy's status
 */
async function updateStrategyStatus(strategy, newStatus, reason = null) {
  const now = new Date();
  console.log(`Updating strategy ${strategy.id} status to ${newStatus}${reason ? ` with reason: ${reason}` : ''}`);
  
  const params = {
    TableName: STRATEGIES_TABLE,
    Key: { 
      walletAddress: strategy.walletAddress, 
      id: strategy.id 
    },
    UpdateExpression: 'SET #statusField = :statusValue, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#statusField': 'status'
    },
    ExpressionAttributeValues: {
      ':statusValue': newStatus,
      ':updatedAt': now.toISOString()
    }
  };
  
  if (reason) {
    params.UpdateExpression += ', statusReason = :reason';
    params.ExpressionAttributeValues[':reason'] = reason;
  }
  
  try {
    await dynamoDB.send(new UpdateCommand(params));
    console.log(`Successfully updated strategy ${strategy.id} status to ${newStatus}`);
  } catch (error) {
    console.error(`Failed to update strategy status: ${error.message}`);
    throw error;
  }
} 