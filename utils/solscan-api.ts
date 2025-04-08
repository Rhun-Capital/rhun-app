interface SolscanEndpoint {
  path: string;
  method: 'GET' | 'POST';
  params: string[];
  description: string;
}

const SOLSCAN_ENDPOINTS: Record<string, SolscanEndpoint> = {
  account_transactions: {
    path: '/account/transactions',
    method: 'GET',
    params: ['address', 'limit', 'offset', 'from', 'to'],
    description: 'Get transaction history for an account'
  },
  account_tokens: {
    path: '/account/token-accounts',
    method: 'GET',
    params: ['address', 'type', 'page', 'page_size', 'hide_zero'],
    description: 'Get token holdings for an account'
  },
  account_details: {
    path: '/account/detail',
    method: 'GET',
    params: ['address'],
    description: 'Get account details'
  },
  account_activities: {
    path: '/account/defi/activities',
    method: 'GET',
    params: ['address', 'page', 'page_size', 'sort_by', 'sort_order', 'block_time[]', 'activity_type[]', 'platform[]', 'source[]', 'token'],
    description: 'Get DeFi activities for an account'
  },
  token_holders: {
    path: '/token/holders',
    method: 'GET',
    params: ['address', 'page', 'page_size'],
    description: 'Get token holders'
  }
};

export async function makeSolscanRequest(
  endpoint: string,
  params: Record<string, string | number | string[]>
): Promise<any> {
  const apiEndpoint = SOLSCAN_ENDPOINTS[endpoint];
  if (!apiEndpoint) {
    throw new Error(`Unknown endpoint: ${endpoint}`);
  }

  const baseUrl = process.env.NEXT_PUBLIC_SOLSCAN_BASE_URL;
  const url = new URL(`${baseUrl}${apiEndpoint.path}`);

  // Add parameters to URL
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => url.searchParams.append(`${key}[]`, v.toString()));
    } else {
      url.searchParams.append(key, value.toString());
    }
  });

  const response = await fetch(url.toString(), {
    method: apiEndpoint.method,
    headers: {
      'Content-Type': 'application/json',
      'token': process.env.SOLSCAN_API_KEY || ''
    }
  });

  if (!response.ok) {
    throw new Error(`Solscan API error: ${response.status}`);
  }

  return response.json();
}

export function getEndpointForQuery(query: string): string | null {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('transaction') || queryLower.includes('activity')) {
    return 'account_transactions';
  }
  
  if (queryLower.includes('token') || queryLower.includes('holding')) {
    return 'account_tokens';
  }
  
  if (queryLower.includes('account') || queryLower.includes('wallet')) {
    return 'account_details';
  }
  
  if (queryLower.includes('holder') || queryLower.includes('ownership')) {
    return 'token_holders';
  }
  
  if (queryLower.includes('defi') || queryLower.includes('activity')) {
    return 'account_activities';
  }
  
  return null;
}

export function extractQueryParams(query: string): Record<string, string | number | string[]> {
  const params: Record<string, string | number | string[]> = {};
  
  // Extract time frame
  const timeMatch = query.match(/last (\d+) days?/i);
  if (timeMatch) {
    const days = parseInt(timeMatch[1]);
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    params['from'] = fromDate.toISOString();
    params['to'] = new Date().toISOString();
  }
  
  // Extract limit
  const limitMatch = query.match(/(?:show|get|fetch) (\d+) (?:results?|items?)/i);
  if (limitMatch) {
    params['limit'] = parseInt(limitMatch[1]);
  }
  
  // Extract sort order
  if (query.includes('latest') || query.includes('recent')) {
    params['sort_by'] = 'block_time';
    params['sort_order'] = 'desc';
  }
  
  return params;
} 