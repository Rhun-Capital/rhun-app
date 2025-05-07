import { NextResponse } from 'next/server';
import { storeTokenHolderMapping, deleteTokenHolderMappingsForWebhook, ensureTokenHoldersMappingTableExists, TOKEN_HOLDERS_MAPPING_TABLE_NAME } from '@/utils/aws-config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/solana/webhooks
 * Get all registered webhooks
 */
export async function GET(request: Request) {
  try {
    if (!process.env.HELIUS_API_KEY) {
      throw new Error('HELIUS_API_KEY is required in environment variables');
    }

    // Implement retry logic for fetch operation
    let response;
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        console.log(`Fetching webhooks from Helius (attempts remaining: ${retries})`);
        
        response = await fetch(
          `https://api.helius.xyz/v0/webhooks?api-key=${process.env.HELIUS_API_KEY}`,
          {
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(15000) // 15 second timeout
          }
        );
        
        // If fetch succeeded, break out of retry loop
        break;
      } catch (error: any) {
        lastError = error;
        console.error(`Webhook fetch attempt failed (${retries} left):`, error);
        retries--;
        
        if (retries > 0) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
        }
      }
    }

    // If all retries failed
    if (!response) {
      throw new Error(`Failed to connect to Helius API after multiple attempts: ${lastError?.message || 'Unknown error'}`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP error ${response!.status}` }));
      throw new Error(errorData.message || `Failed to fetch webhooks: HTTP ${response.status}`);
    }

    const webhooks = await response.json();
    return NextResponse.json(webhooks);
  } catch (error: any) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch webhooks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/solana/webhooks
 * Register a new webhook
 */
export async function POST(request: Request) {
  try {
    if (!process.env.HELIUS_API_KEY) {
      throw new Error('HELIUS_API_KEY is required in environment variables');
    }

    const body = await request.json();
    const { webhookURL, transactionTypes, accountAddresses, webhookType, tokenAddress, tokenSymbol, tokenName } = body;

    console.log('Webhook registration payload:', JSON.stringify({
      webhookURL,
      transactionTypes,
      accountAddresses: accountAddresses ? `[${accountAddresses.length} addresses]` : null,
      webhookType,
      tokenInfo: {
        tokenAddress,
        tokenSymbol,
        tokenName
      }
    }));

    if (!webhookURL || !accountAddresses || accountAddresses.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate webhook URL (must be publicly accessible)
    if (webhookURL.includes('localhost') || 
        (!webhookURL.startsWith('http://') && !webhookURL.startsWith('https://'))) {
      return NextResponse.json(
        { error: 'Webhook URL must be a publicly accessible HTTPS URL' },
        { status: 400 }
      );
    }

    // Helius does not accept more than 100 account addresses
    if (accountAddresses.length > 100) {
      return NextResponse.json(
        { error: 'Maximum of 100 account addresses allowed' },
        { status: 400 }
      );
    }

    // Construct the webhook data to send to Helius
    const webhookData: any = {
      webhookURL,
      transactionTypes: transactionTypes || ['ANY'],
      accountAddresses,
      webhookType: webhookType || 'enhanced',
      txnStatus: 'success'
    };
    
    // Remove the metadata field from webhookData - it's not supported by Helius API
    // We'll still store the token info in our database after successful registration

    // Implement retry logic for fetch operation
    let response;
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        console.log(`Attempting to register webhook with Helius (attempts remaining: ${retries})`);
        
        response = await fetch(
          `https://api.helius.xyz/v0/webhooks?api-key=${process.env.HELIUS_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookData),
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(15000) // 15 second timeout
          }
        );
        
        // If fetch succeeded, break out of retry loop
        break;
      } catch (error: any) {
        lastError = error;
        console.error(`Webhook registration attempt failed (${retries} left):`, error);
        retries--;
        
        if (retries > 0) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
        }
      }
    }

    // If all retries failed
    if (!response) {
      throw new Error(`Failed to connect to Helius API after multiple attempts: ${lastError?.message || 'Unknown error'}`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP error ${response!.status}` }));
      console.error('Helius API error response:', JSON.stringify(errorData));
      throw new Error(errorData.message || `Failed to register webhook: HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // Store token holder mappings in database if token info was provided
    if (tokenAddress && data.webhookID) {
      try {
        // Ensure the table exists
        await ensureTokenHoldersMappingTableExists();
        
        // Log the table name being used
        console.log(`Using DynamoDB table: ${TOKEN_HOLDERS_MAPPING_TABLE_NAME}`);
        
        // Store mappings for each account address
        const storageTasks = accountAddresses.map((address: string) => 
          storeTokenHolderMapping(
            address,
            tokenAddress,
            tokenSymbol || 'Unknown',
            tokenName || 'Unknown Token',
            data.webhookID
          )
        );
        
        await Promise.all(storageTasks);
        console.log(`Stored ${accountAddresses.length} token holder mappings for webhook ${data.webhookID}`);
      } catch (dbError: any) {
        console.error('Error storing token holder mappings:', dbError);
        console.error('Error details:', {
          tableName: TOKEN_HOLDERS_MAPPING_TABLE_NAME,
          errorName: dbError.name,
          errorType: dbError.__type,
          errorMessage: dbError.message,
          statusCode: dbError.$metadata?.httpStatusCode
        });
        // Continue even if storage fails - the webhook was created successfully
      }
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error registering webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register webhook' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/solana/webhooks/[id]
 * Delete a webhook
 */
export async function DELETE(request: Request) {
  try {
    if (!process.env.HELIUS_API_KEY) {
      throw new Error('HELIUS_API_KEY is required in environment variables');
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    // Delete token holder mappings for this webhook
    try {
      await deleteTokenHolderMappingsForWebhook(webhookId);
    } catch (dbError) {
      console.error('Error deleting token holder mappings:', dbError);
      // Continue even if deletion fails
    }

    // Implement retry logic for fetch operation
    let response;
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        console.log(`Attempting to delete webhook from Helius (attempts remaining: ${retries})`);
        
        response = await fetch(
          `https://api.helius.xyz/v0/webhooks/${webhookId}?api-key=${process.env.HELIUS_API_KEY}`,
          {
            method: 'DELETE',
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(15000) // 15 second timeout
          }
        );
        
        // If fetch succeeded, break out of retry loop
        break;
      } catch (error: any) {
        lastError = error;
        console.error(`Webhook deletion attempt failed (${retries} left):`, error);
        retries--;
        
        if (retries > 0) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
        }
      }
    }

    // If all retries failed
    if (!response) {
      throw new Error(`Failed to connect to Helius API after multiple attempts: ${lastError?.message || 'Unknown error'}`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP error ${response!.status}` }));
      throw new Error(errorData.message || `Failed to delete webhook: HTTP ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete webhook' },
      { status: 500 }
    );
  }
} 