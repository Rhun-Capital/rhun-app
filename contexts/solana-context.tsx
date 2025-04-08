'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { makeSolscanRequest } from '@/utils/solscan-api';
import { parseQueryToSchema, SolanaQuery } from '@/utils/solana-schema';
import { useChat } from 'ai/react';

interface SolanaContextType {
  executeQuery: (query: string, addresses: string[]) => Promise<any>;
  isLoading: boolean;
  error: string | null;
}

const SolanaContext = createContext<SolanaContextType | undefined>(undefined);

export function SolanaProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { messages, append } = useChat();

  const executeQuery = useCallback(async (query: string, addresses: string[]) => {
    setIsLoading(true);
    setError(null);

    try {
      // Parse the query using AI
      const structuredQuery = await parseQueryToSchema(query);
      
      // Map the structured query to Solscan parameters
      const params = mapQueryToParams(structuredQuery);
      
      const results = await Promise.all(
        addresses.map(async (address) => {
          const response = await makeSolscanRequest(
            getEndpointFromIntent(structuredQuery.intent),
            { ...params, address }
          );
          return { address, data: response };
        })
      );

      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <SolanaContext.Provider value={{ executeQuery, isLoading, error }}>
      {children}
    </SolanaContext.Provider>
  );
}

function getEndpointFromIntent(intent: SolanaQuery['intent']): string {
  const endpointMap: Record<SolanaQuery['intent'], string> = {
    get_transactions: 'account_transactions',
    get_token_holdings: 'account_tokens',
    get_account_details: 'account_details',
    get_token_holders: 'token_holders',
    get_defi_activities: 'account_activities'
  };
  return endpointMap[intent];
}

function mapQueryToParams(query: SolanaQuery): Record<string, any> {
  const params: Record<string, any> = {};

  // Endpoint-specific parameters
  if (query.intent === 'get_transactions') {
    // For transactions, we only use limit and before (for pagination)
    if (query.limit) {
      // Ensure limit is one of the allowed values: 10, 20, 30, 40
      const allowedLimits = [10, 20, 30, 40];
      params.limit = allowedLimits.includes(query.limit) ? query.limit : 10;
    }

    // Remove all other parameters as they're not supported by this endpoint
    Object.keys(params).forEach(key => {
      if (key !== 'limit' && key !== 'before') {
        delete params[key];
      }
    });
  } else if (query.intent === 'get_token_holdings') {
    // For token accounts, we use the correct parameters
    params.type = 'token'; // Default to token type
    params.page = 1;
    params.page_size = Math.min(query.limit || 10, 40); // Max page_size is 40
    params.hide_zero = 'true';

    // Remove parameters that aren't supported by this endpoint
    delete params.limit;
    delete params.sort_by;
    delete params.sort_order;
    delete params.from;
    delete params.to;
  } else if (query.intent === 'get_account_details') {
    // For account details, we only need the address parameter
    // Remove all other parameters as they're not supported
    Object.keys(params).forEach(key => delete params[key]);
  } else if (query.intent === 'get_token_holders') {
    // For token holders, we use the correct parameters
    params.page = 1;
    params.page_size = Math.min(query.limit || 10, 40); // Max page_size is 40

    // Handle amount filters if specified
    if (query.filters?.minAmount) {
      params.from_amount = query.filters.minAmount.toString();
    }
    if (query.filters?.maxAmount) {
      params.to_amount = query.filters.maxAmount.toString();
    }

    // Remove parameters that aren't supported by this endpoint
    delete params.limit;
    delete params.sort_by;
    delete params.sort_order;
    delete params.from;
    delete params.to;
    delete params.hide_zero;
  } else if (query.intent === 'get_defi_activities') {
    // For DeFi activities, we use the correct parameters
    params.page = 1;
    params.page_size = Math.min(query.limit || 10, 100); // Max page_size is 100 for this endpoint

    // Handle time range if specified
    if (query.timeFrame?.type === 'last_days' && typeof query.timeFrame.value === 'number') {
      const fromDate = new Date(Date.now() - query.timeFrame.value * 24 * 60 * 60 * 1000);
      params.from_time = Math.floor(fromDate.getTime() / 1000); // Convert to Unix timestamp
      params.to_time = Math.floor(Date.now() / 1000);
    }

    // Handle filters
    if (query.filters) {
      if (query.filters.platform?.length) {
        params.platform = query.filters.platform.slice(0, 5); // Max 5 platforms
      }
      if (query.filters.activityType?.length) {
        params.activity_type = query.filters.activityType;
      }
      if (query.filters.token) {
        params.token = query.filters.token;
      }
    }

    // Handle sorting
    if (query.sortBy === 'block_time') {
      params.sort_by = 'block_time';
      params.sort_order = query.sortOrder || 'desc';
    }

    // Remove parameters that aren't supported by this endpoint
    delete params.limit;
    delete params.hide_zero;
  } else {
    // For other endpoints, keep existing logic
    params.page = 1;
    params.page_size = query.limit || 10;
    params.hide_zero = 'true';

    if (query.timeFrame?.type === 'last_days' && typeof query.timeFrame.value === 'number') {
      const fromDate = new Date(Date.now() - query.timeFrame.value * 24 * 60 * 60 * 1000);
      params.from = fromDate.toISOString();
      params.to = new Date().toISOString();
    }

    if (query.sortBy) {
      params.sort_by = query.sortBy;
    }

    if (query.sortOrder) {
      params.sort_order = query.sortOrder;
    }

    if (query.filters) {
      if (query.filters.token) {
        params.token = query.filters.token;
      }
      if (query.filters.platform?.length) {
        params['platform[]'] = query.filters.platform;
      }
      if (query.filters.activityType?.length) {
        params['activity_type[]'] = query.filters.activityType;
      }
    }
  }

  return params;
}

export function useSolana() {
  const context = useContext(SolanaContext);
  if (context === undefined) {
    throw new Error('useSolana must be used within a SolanaProvider');
  }
  return context;
} 