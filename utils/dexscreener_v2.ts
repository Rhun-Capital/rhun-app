// utils/dynamodb.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  QueryCommand, 
  ScanCommand, 
  GetCommand 
} from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "DexscreenerTokens";

/**
 * Get a token by its full ID (chainId:tokenAddress)
 */
export async function getTokenById(id: string) {
  try {
    // Get the latest record for this ID
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": id.toLowerCase(),
      },
      Limit: 1,
      ScanIndexForward: false, // Sort descending to get most recent first
    });
    
    const response = await docClient.send(command);
    
    if (!response.Items || response.Items.length === 0) {
      return null;
    }
    
    return response.Items[0];
  } catch (error) {
    console.error("Error getting token by ID:", error);
    throw error;
  }
}

/**
 * Get a token by address and chain
 */
export async function getTokenByAddressAndChain(tokenAddress: string, chainId: string) {
  try {
    // Construct the ID
    const id = `${chainId.toLowerCase()}:${tokenAddress.toLowerCase()}`;
    
    // Use the getTokenById function
    return getTokenById(id);
  } catch (error) {
    console.error("Error getting token by address and chain:", error);
    throw error;
  }
}

interface TokenOptions {
  limit?: number;
  paginationToken?: string | null;
  sortDescending?: boolean;
  filterBoosted?: boolean;
  filterWithOrders?: boolean;
  chains?: string[];
  minTimestamp?: number; // Minimum timestamp in milliseconds
  minLiquidity?: number; // Minimum liquidity in USD
  maxLiquidity?: number; // Maximum liquidity in USD
  minVolume?: number; // Minimum 24h volume in USD
  maxVolume?: number; // Maximum 24h volume in USD
  minTxCount?: number; // Minimum number of transactions in 24h
  maxTxCount?: number; // Maximum number of transactions in 24h
  minBuys?: number; // Minimum number of buys in 24h
  maxBuys?: number; // Maximum number of buys in 24h
  minSells?: number; // Minimum number of sells in 24h
  maxSells?: number; // Maximum number of sells in 24h
  maxAgeDays?: number; // Maximum age in days
  minMarketCap?: number; // Minimum market cap in USD
  maxMarketCap?: number; // Maximum market cap in USD
  uniqueDexes?: string[]; // Filter by specific DEXes
  sortBy?: 'age' | 'volume' | 'liquidity' | 'transactions' | 'market_cap' | 'created_at'; // Field to sort by
}

/**
 * Get tokens by chain
 */
export async function getTokensByChain(chainId: string, options: TokenOptions = {}) {
  try {
    const { 
      limit = 20, 
      paginationToken = null,
      sortDescending = true  // newest first by default
    } = options;
    
    // Get the tokens for a specific chain
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "ChainIndex",
      KeyConditionExpression: "GSI1PK = :chainId",
      ExpressionAttributeValues: {
        ":chainId": `CHAIN#${chainId.toLowerCase()}`,
      },
      Limit: limit,
      ScanIndexForward: !sortDescending, // false = descending order (newest first)
    });
    
    // Handle pagination with ExclusiveStartKey if needed
    if (paginationToken) {
      try {
        // @ts-ignore - ExclusiveStartKey exists at runtime
        command.ExclusiveStartKey = JSON.parse(
          Buffer.from(paginationToken, "base64").toString()
        );
      } catch (error) {
        console.error("Invalid pagination token:", error);
      }
    }
    
    const response = await docClient.send(command);
    
    // Generate pagination token for next page
    let nextPaginationToken = null;
    if (response.LastEvaluatedKey) {
      nextPaginationToken = Buffer.from(
        JSON.stringify(response.LastEvaluatedKey)
      ).toString("base64");
    }
    
    return {
      items: response.Items || [],
      pagination: {
        hasMore: !!response.LastEvaluatedKey,
        nextPaginationToken,
      },
    };
  } catch (error) {
    console.error("Error getting tokens by chain:", error);
    throw error;
  }
}

/**
 * Get tokens by symbol
 */
export async function getTokensBySymbol(symbol: string, options: TokenOptions = {}) {
  try {
    const { 
      limit = 20, 
      paginationToken = null,
      sortDescending = true  // newest first by default
    } = options;
    
    // Get the tokens for a specific symbol
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "SymbolIndex",
      KeyConditionExpression: "GSI2PK = :symbol",
      ExpressionAttributeValues: {
        ":symbol": `SYMBOL#${symbol.toLowerCase()}`,
      },
      Limit: limit,
      ScanIndexForward: !sortDescending, // false = descending order (newest first)
    });
    
    // Handle pagination with ExclusiveStartKey if needed
    if (paginationToken) {
      try {
        // @ts-ignore - ExclusiveStartKey exists at runtime
        command.ExclusiveStartKey = JSON.parse(
          Buffer.from(paginationToken, "base64").toString()
        );
      } catch (error) {
        console.error("Invalid pagination token:", error);
      }
    }
    
    const response = await docClient.send(command);
    
    // Generate pagination token for next page
    let nextPaginationToken = null;
    if (response.LastEvaluatedKey) {
      nextPaginationToken = Buffer.from(
        JSON.stringify(response.LastEvaluatedKey)
      ).toString("base64");
    }
    
    return {
      items: response.Items || [],
      pagination: {
        hasMore: !!response.LastEvaluatedKey,
        nextPaginationToken,
      },
    };
  } catch (error) {
    console.error("Error getting tokens by symbol:", error);
    throw error;
  }
}

/**
 * Get latest tokens with optional filters
 */
export async function getLatestTokens(options: TokenOptions = {}) {
  try {
    const { 
      limit = 20, 
      paginationToken = null,
      filterBoosted = false,
      filterWithOrders = false,
      chains = ["solana", "base"],
      minTimestamp = undefined,
      minLiquidity = undefined,
      maxLiquidity = undefined,
      minVolume = undefined,
      maxVolume = undefined,
      minTxCount = undefined,
      maxTxCount = undefined,
      minBuys = undefined,
      maxBuys = undefined,
      minSells = undefined,
      maxSells = undefined,
      maxAgeDays = undefined,
      minMarketCap = undefined, 
      maxMarketCap = undefined,
      uniqueDexes = undefined,
      sortBy = 'created_at'
    } = options;
    
    let filterExpressions: string[] = [];
    let expressionAttributeValues: Record<string, any> = {};
    let expressionAttributeNames: Record<string, string> = {};
    
    // Build chain filter (e.g., "begins_with(id, :solana) OR begins_with(id, :base)")
    const chainFilters = chains.map((chain: string, index: number) => {
      const placeholder = `:chain${index}`;
      expressionAttributeValues[placeholder] = `${chain.toLowerCase()}:`;
      return `begins_with(id, ${placeholder})`;
    });
    
    if (chainFilters.length > 0) {
      filterExpressions.push(`(${chainFilters.join(" OR ")})`);
    }
    
    // Add boosted filter if requested
    if (filterBoosted) {
      filterExpressions.push("attribute_exists(is_latest_boosted)");
      // Alternative if the attribute is boolean: "#boost = :isBoosted"
      // expressionAttributeNames["#boost"] = "is_latest_boosted";
      // expressionAttributeValues[":isBoosted"] = true;
    }
    
    // Add orders filter if requested
    if (filterWithOrders) {
      filterExpressions.push("attribute_exists(has_recent_orders)");
      // Alternative if the attribute is boolean: "#orders = :hasOrders"
      // expressionAttributeNames["#orders"] = "has_recent_orders";
      // expressionAttributeValues[":hasOrders"] = true;
    }
    
    // Add timestamp filter if minTimestamp is provided
    if (minTimestamp !== undefined) {
      // Filter by various timestamp fields using OR conditions
      expressionAttributeNames["#sk"] = "sk";
      expressionAttributeNames["#created_at"] = "created_at";
      expressionAttributeNames["#timestamp"] = "timestamp";
      expressionAttributeNames["#pairCreatedAt"] = "pairCreatedAt";
      expressionAttributeValues[":minTimestamp"] = minTimestamp;
      
      const timestampConditions = [
        "#sk >= :minTimestamp",
        "attribute_exists(#created_at) AND #created_at >= :minTimestamp",
        "attribute_exists(#timestamp) AND #timestamp >= :minTimestamp",
        "attribute_exists(#pairCreatedAt) AND #pairCreatedAt >= :minTimestamp"
      ];
      
      filterExpressions.push(`(${timestampConditions.join(" OR ")})`);
    }
    
    // Add liquidity filters
    if (minLiquidity !== undefined) {
      expressionAttributeNames["#liquidity"] = "liquidity_usd";
      expressionAttributeValues[":minLiquidity"] = minLiquidity;
      filterExpressions.push("attribute_exists(#liquidity) AND #liquidity >= :minLiquidity");
    }
    
    if (maxLiquidity !== undefined) {
      if (!expressionAttributeNames["#liquidity"]) {
        expressionAttributeNames["#liquidity"] = "liquidity_usd";
      }
      expressionAttributeValues[":maxLiquidity"] = maxLiquidity;
      filterExpressions.push("attribute_exists(#liquidity) AND #liquidity <= :maxLiquidity");
    }
    
    // Add volume filters
    if (minVolume !== undefined) {
      expressionAttributeNames["#volume"] = "volume_24h";
      expressionAttributeValues[":minVolume"] = minVolume;
      filterExpressions.push("attribute_exists(#volume) AND #volume >= :minVolume");
    }
    
    if (maxVolume !== undefined) {
      if (!expressionAttributeNames["#volume"]) {
        expressionAttributeNames["#volume"] = "volume_24h";
      }
      expressionAttributeValues[":maxVolume"] = maxVolume;
      filterExpressions.push("attribute_exists(#volume) AND #volume <= :maxVolume");
    }
    
    // Add transaction count filters
    if (minTxCount !== undefined) {
      expressionAttributeNames["#txns"] = "total_txns_24h";
      expressionAttributeValues[":minTxCount"] = minTxCount;
      filterExpressions.push("attribute_exists(#txns) AND #txns >= :minTxCount");
    }
    
    if (maxTxCount !== undefined) {
      if (!expressionAttributeNames["#txns"]) {
        expressionAttributeNames["#txns"] = "total_txns_24h";
      }
      expressionAttributeValues[":maxTxCount"] = maxTxCount;
      filterExpressions.push("attribute_exists(#txns) AND #txns <= :maxTxCount");
    }
    
    // Add buys filters
    if (minBuys !== undefined) {
      expressionAttributeNames["#buys"] = "buys_24h";
      expressionAttributeValues[":minBuys"] = minBuys;
      filterExpressions.push("attribute_exists(#buys) AND #buys >= :minBuys");
    }
    
    if (maxBuys !== undefined) {
      if (!expressionAttributeNames["#buys"]) {
        expressionAttributeNames["#buys"] = "buys_24h";
      }
      expressionAttributeValues[":maxBuys"] = maxBuys;
      filterExpressions.push("attribute_exists(#buys) AND #buys <= :maxBuys");
    }
    
    // Add sells filters
    if (minSells !== undefined) {
      expressionAttributeNames["#sells"] = "sells_24h";
      expressionAttributeValues[":minSells"] = minSells;
      filterExpressions.push("attribute_exists(#sells) AND #sells >= :minSells");
    }
    
    if (maxSells !== undefined) {
      if (!expressionAttributeNames["#sells"]) {
        expressionAttributeNames["#sells"] = "sells_24h";
      }
      expressionAttributeValues[":maxSells"] = maxSells;
      filterExpressions.push("attribute_exists(#sells) AND #sells <= :maxSells");
    }
    
    // Add age filter
    if (maxAgeDays !== undefined) {
      expressionAttributeNames["#age"] = "age_days";
      expressionAttributeValues[":maxAgeDays"] = maxAgeDays;
      filterExpressions.push("attribute_exists(#age) AND #age <= :maxAgeDays");
    }
    
    // Add market cap filters
    if (minMarketCap !== undefined) {
      expressionAttributeNames["#market_cap"] = "market_cap";
      expressionAttributeValues[":minMarketCap"] = minMarketCap;
      filterExpressions.push("attribute_exists(#market_cap) AND #market_cap >= :minMarketCap");
    }
    
    if (maxMarketCap !== undefined) {
      if (!expressionAttributeNames["#market_cap"]) {
        expressionAttributeNames["#market_cap"] = "market_cap";
      }
      expressionAttributeValues[":maxMarketCap"] = maxMarketCap;
      filterExpressions.push("attribute_exists(#market_cap) AND #market_cap <= :maxMarketCap");
    }
    
    // Add DEX filter
    if (uniqueDexes !== undefined && uniqueDexes.length > 0) {
      expressionAttributeNames["#dexes"] = "unique_dexes";
      
      // For DynamoDB, we need to check if ANY of the dexes in our filter are in the array
      const dexConditions = uniqueDexes.map((dex, index) => {
        const placeholder = `:dex${index}`;
        expressionAttributeValues[placeholder] = dex.toLowerCase();
        return `contains(#dexes, ${placeholder})`;
      });
      
      filterExpressions.push(`(${dexConditions.join(" OR ")})`);
    }
    
    // Combine all filter expressions
    const filterExpression = filterExpressions.length > 0 
      ? filterExpressions.join(" AND ")
      : undefined;
    
    // Use a scan operation since we're not querying any specific index
    // Note: In production, consider using more efficient access patterns
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 
        ? expressionAttributeValues 
        : undefined,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 
        ? expressionAttributeNames 
        : undefined,
      // Increase limit to account for sorting and slicing
      Limit: limit * 3, // Request more items since we'll filter and sort
    });
    
    // Handle pagination with ExclusiveStartKey if needed
    if (paginationToken) {
      try {
        // @ts-ignore - ExclusiveStartKey exists at runtime
        command.ExclusiveStartKey = JSON.parse(
          Buffer.from(paginationToken, "base64").toString()
        );
      } catch (error) {
        console.error("Invalid pagination token:", error);
      }
    }
    
    const response = await docClient.send(command);
    
    // Determine sort field and direction
    const getSortValue = (item: any) => {
      switch(sortBy) {
        case 'age':
          return item.age_days || Number.MAX_SAFE_INTEGER;
        case 'volume':
          return item.volume_24h || 0;
        case 'liquidity':
          return item.liquidity_usd || 0;
        case 'transactions':
          return item.total_txns_24h || 0;
        case 'market_cap':
          return item.market_cap || 0;
        case 'created_at':
        default:
          return item.created_at || item.timestamp || item.pairCreatedAt || item.sk || 0;
      }
    };
    
    // Sort items according to specified criteria
    const sortedItems = (response.Items || []).sort((a, b) => {
      const aValue = getSortValue(a);
      const bValue = getSortValue(b);
      
      // Always sort in descending order (higher values first)
      return bValue - aValue;
    });
    
    // Take only the requested number of items after sorting
    const limitedItems = sortedItems.slice(0, limit);
    
    // Generate pagination token for next page based on the last item in our sorted results
    let nextPaginationToken = null;
    if (response.LastEvaluatedKey && limitedItems.length >= limit) {
      nextPaginationToken = Buffer.from(
        JSON.stringify(response.LastEvaluatedKey)
      ).toString("base64");
    }
    
    return {
      items: limitedItems,
      pagination: {
        hasMore: !!response.LastEvaluatedKey && limitedItems.length >= limit,
        nextPaginationToken,
      },
    };
  } catch (error) {
    console.error("Error getting latest tokens:", error);
    throw error;
  }
}