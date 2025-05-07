import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export const HOLDERS_ACTIVITY_TABLE_NAME = process.env.DYNAMODB_HOLDERS_ACTIVITY_TABLE_NAME || "TokenHoldersActivity";
export const TOKEN_HOLDERS_MAPPING_TABLE_NAME = process.env.DYNAMODB_TOKEN_HOLDERS_MAPPING_TABLE_NAME || "TokenHolderMapping";

// Define token holder activity interface
export interface TokenHolderActivity {
  signature: string;          // Transaction signature (partition key)
  timestamp: number;          // Unix timestamp (sort key)
  type: string;               // Transaction type (e.g., 'SWAP')
  description: string;        // Human readable description
  holder_address: string;     // The holder's address
  native_balance_change: number; // SOL balance change
  token_transfers: any[];     // Token balance changes
  fromToken?: {              // Added for swap events
    symbol: string;
    amount: number;
    metadata?: any;
  };
  toToken?: {                // Added for swap events
    symbol: string;
    amount: number;
    metadata?: any;
  };
}

// Define token holder mapping interface
export interface TokenHolderMapping {
  holder_address: string;     // The holder's address (partition key)
  token_address: string;      // The token address (sort key)
  token_symbol: string;       // The token symbol
  token_name: string;         // The token name
  added_at: number;           // When this mapping was created
  webhook_id: string;         // ID of the webhook that tracks this holder
}

// Create a function to get the DynamoDB client
let dynamoClient: DynamoDBClient | null = null;
let docClient: DynamoDBDocumentClient | null = null;

// Initialize the DynamoDB clients
export const getDynamoClients = async () => {
  if (typeof window !== 'undefined') {
    throw new Error('AWS SDK can only be used on the server side');
  }
  
  if (!dynamoClient || !docClient) {
    try {
      // Dynamically import AWS SDK modules
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
      const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb');
      
      // Validate that credentials are present
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error('AWS credentials are not set in environment variables');
        throw new Error('AWS credentials missing');
      }
      
      dynamoClient = new DynamoDBClient({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      
      docClient = DynamoDBDocumentClient.from(dynamoClient);
    } catch (error) {
      console.error('Error initializing AWS clients:', error);
      throw error;
    }
  }
  
  return { dynamoClient, docClient };
};

/**
 * Store token holder activity in DynamoDB
 */
export async function storeTokenHolderActivity(
  activity: TokenHolderActivity
): Promise<void> {
  try {
    const { docClient } = await getDynamoClients();
    const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
    
    const item = {
      signature: activity.signature,
      timestamp: activity.timestamp,
      type: activity.type,
      description: activity.description,
      holder_address: activity.holder_address,
      native_balance_change: activity.native_balance_change,
      token_transfers: activity.token_transfers,
      fromToken: activity.fromToken,
      toToken: activity.toToken,
      created_at: Date.now()
    };

    const command = new PutCommand({
      TableName: HOLDERS_ACTIVITY_TABLE_NAME,
      Item: item
    });

    await docClient.send(command);
  } catch (error) {
    console.error('Error storing token holder activity:', error);
    throw error;
  }
}

/**
 * Ensure the TokenHoldersActivity table exists
 */
export async function ensureTokenHoldersActivityTableExists(): Promise<boolean> {
  try {
    const { dynamoClient } = await getDynamoClients();
    const { 
      CreateTableCommand,
      DescribeTableCommand,
      ResourceInUseException,
      DeleteTableCommand
    } = await import('@aws-sdk/client-dynamodb');

    // First check if table exists
    try {
      await dynamoClient.send(new DescribeTableCommand({
        TableName: HOLDERS_ACTIVITY_TABLE_NAME
      }));
      
      // Table exists, let's recreate it with new schema
      console.log(`Table ${HOLDERS_ACTIVITY_TABLE_NAME} exists, recreating with new schema...`);
      try {
        await dynamoClient.send(new DeleteTableCommand({
          TableName: HOLDERS_ACTIVITY_TABLE_NAME
        }));
        // Wait for table deletion
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error('Error deleting existing table:', error);
      }
    } catch (error: any) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
    }

    // Create table with new schema
    const createTableCommand = new CreateTableCommand({
      TableName: HOLDERS_ACTIVITY_TABLE_NAME,
      KeySchema: [
        { AttributeName: 'signature', KeyType: 'HASH' },  // Partition key
        { AttributeName: 'timestamp', KeyType: 'RANGE' }  // Sort key
      ],
      AttributeDefinitions: [
        { AttributeName: 'signature', AttributeType: 'S' },
        { AttributeName: 'timestamp', AttributeType: 'N' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    });

    try {
      await dynamoClient.send(createTableCommand);
      console.log(`Created table ${HOLDERS_ACTIVITY_TABLE_NAME} with new schema`);
      return true;
    } catch (error: any) {
      if (error.name === 'ResourceInUseException') {
        // Table was created by another process
        return true;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error ensuring table exists:', error);
    throw error;
  }
}

/**
 * Ensure the TokenHoldersMapping table exists
 */
export async function ensureTokenHoldersMappingTableExists(): Promise<boolean> {
  try {
    const { dynamoClient } = await getDynamoClients();
    const { 
      CreateTableCommand,
      DescribeTableCommand,
      ResourceInUseException
    } = await import('@aws-sdk/client-dynamodb');

    // First check if table exists
    try {
      await dynamoClient.send(new DescribeTableCommand({
        TableName: TOKEN_HOLDERS_MAPPING_TABLE_NAME
      }));
      
      // Table exists
      return true;
    } catch (error: any) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
    }

    // Create table with new schema
    const createTableCommand = new CreateTableCommand({
      TableName: TOKEN_HOLDERS_MAPPING_TABLE_NAME,
      KeySchema: [
        { AttributeName: 'holder_address', KeyType: 'HASH' },  // Partition key
        { AttributeName: 'token_address', KeyType: 'RANGE' }   // Sort key
      ],
      AttributeDefinitions: [
        { AttributeName: 'holder_address', AttributeType: 'S' },
        { AttributeName: 'token_address', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    });

    try {
      await dynamoClient.send(createTableCommand);
      console.log(`Created table ${TOKEN_HOLDERS_MAPPING_TABLE_NAME}`);
      return true;
    } catch (error: any) {
      if (error.name === 'ResourceInUseException') {
        // Table was created by another process
        return true;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error ensuring token holders mapping table exists:', error);
    throw error;
  }
}

/**
 * Store token holder mapping in DynamoDB
 */
export async function storeTokenHolderMapping(
  holderAddress: string,
  tokenAddress: string,
  tokenSymbol: string,
  tokenName: string,
  webhookId: string
): Promise<void> {
  try {
    const { docClient } = await getDynamoClients();
    const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
    
    const item: TokenHolderMapping = {
      holder_address: holderAddress,
      token_address: tokenAddress,
      token_symbol: tokenSymbol,
      token_name: tokenName,
      added_at: Date.now(),
      webhook_id: webhookId
    };

    const command = new PutCommand({
      TableName: TOKEN_HOLDERS_MAPPING_TABLE_NAME,
      Item: item
    });

    await docClient.send(command);
  } catch (error) {
    console.error('Error storing token holder mapping:', error);
    throw error;
  }
}

/**
 * Get token information for a holder address
 */
export async function getTokenInfoForHolder(
  holderAddress: string
): Promise<TokenHolderMapping | null> {
  try {
    const { docClient } = await getDynamoClients();
    const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');
    
    const command = new QueryCommand({
      TableName: TOKEN_HOLDERS_MAPPING_TABLE_NAME,
      KeyConditionExpression: 'holder_address = :holder',
      ExpressionAttributeValues: {
        ':holder': holderAddress
      },
      Limit: 1 // Get the first mapping, typically there will only be one per holder
    });

    const response = await docClient.send(command);
    
    if (response.Items && response.Items.length > 0) {
      return response.Items[0] as TokenHolderMapping;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting token info for holder:', error);
    return null;
  }
}

/**
 * Get all token holder mappings for a specific webhook
 */
export async function getTokenHolderMappingsForWebhook(
  webhookId: string
): Promise<TokenHolderMapping[]> {
  try {
    const { docClient } = await getDynamoClients();
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    
    const command = new ScanCommand({
      TableName: TOKEN_HOLDERS_MAPPING_TABLE_NAME,
      FilterExpression: 'webhook_id = :webhookId',
      ExpressionAttributeValues: {
        ':webhookId': webhookId
      }
    });

    const response = await docClient.send(command);
    
    if (response.Items) {
      return response.Items as TokenHolderMapping[];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting token holder mappings for webhook:', error);
    return [];
  }
}

/**
 * Delete all token holder mappings for a specific webhook
 */
export async function deleteTokenHolderMappingsForWebhook(
  webhookId: string
): Promise<void> {
  try {
    const mappings = await getTokenHolderMappingsForWebhook(webhookId);
    
    if (mappings.length === 0) {
      return;
    }
    
    const { docClient } = await getDynamoClients();
    const { BatchWriteCommand } = await import('@aws-sdk/lib-dynamodb');
    
    // DynamoDB BatchWrite can only handle 25 items at once
    const batchSize = 25;
    for (let i = 0; i < mappings.length; i += batchSize) {
      const batch = mappings.slice(i, i + batchSize);
      
      const deleteRequests = batch.map(mapping => ({
        DeleteRequest: {
          Key: {
            holder_address: mapping.holder_address,
            token_address: mapping.token_address
          }
        }
      }));
      
      const command = new BatchWriteCommand({
        RequestItems: {
          [TOKEN_HOLDERS_MAPPING_TABLE_NAME]: deleteRequests
        }
      });
      
      await docClient.send(command);
    }
  } catch (error) {
    console.error('Error deleting token holder mappings:', error);
    throw error;
  }
} 