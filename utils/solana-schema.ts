import { z } from 'zod';

// Define the schema for Solana queries
export const solanaQuerySchema = z.object({
  intent: z.enum([
    'get_transactions',
    'get_token_holdings',
    'get_account_details',
    'get_token_holders',
    'get_defi_activities'
  ]),
  timeFrame: z.object({
    type: z.enum(['last_days', 'last_hours', 'last_weeks']),
    value: z.number()
  }).optional(),
  filters: z.object({
    token: z.string().optional(),
    platform: z.array(z.string()).optional(),
    activityType: z.array(z.string()).optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional()
  }).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().optional()
});

export type SolanaQuery = z.infer<typeof solanaQuerySchema>;

// Helper function to extract time frame from query
function extractTimeFrame(query: string): { type: 'last_days' | 'last_hours' | 'last_weeks', value: number } | undefined {
  const timePatterns: { regex: RegExp; type: 'last_days' | 'last_hours' | 'last_weeks' }[] = [
    { regex: /last (\d+) days?/i, type: 'last_days' },
    { regex: /last (\d+) hours?/i, type: 'last_hours' },
    { regex: /last (\d+) weeks?/i, type: 'last_weeks' },
    { regex: /past (\d+) days?/i, type: 'last_days' },
    { regex: /past (\d+) hours?/i, type: 'last_hours' },
    { regex: /past (\d+) weeks?/i, type: 'last_weeks' }
  ];

  for (const pattern of timePatterns) {
    const match = query.match(pattern.regex);
    if (match) {
      return { type: pattern.type, value: parseInt(match[1]) };
    }
  }
  return undefined;
}

// Helper function to extract filters from query
function extractFilters(query: string): { token?: string; platform?: string[]; activityType?: string[] } {
  const filters: { token?: string; platform?: string[]; activityType?: string[] } = {};
  
  // Extract token filters
  const tokenMatch = query.match(/(?:involving|with|for) (USDC|SOL|USDT|RAY|SRM)/i);
  if (tokenMatch) {
    filters.token = tokenMatch[1];
  }

  // Extract platform filters
  const platforms = ['Raydium', 'Jupiter', 'Orca', 'Serum'];
  const platformMatches = platforms.filter(platform => 
    query.toLowerCase().includes(platform.toLowerCase())
  );
  if (platformMatches.length > 0) {
    filters.platform = platformMatches;
  }

  // Extract activity type filters
  const activityTypes = ['swap', 'stake', 'lend', 'borrow'];
  const activityMatches = activityTypes.filter(type => 
    query.toLowerCase().includes(type)
  );
  if (activityMatches.length > 0) {
    filters.activityType = activityMatches;
  }

  return filters;
}

// Helper function to extract sorting preferences
function extractSorting(query: string): { sortBy?: string; sortOrder?: 'asc' | 'desc' } {
  const sorting: { sortBy?: string; sortOrder?: 'asc' | 'desc' } = {};
  
  if (query.includes('largest') || query.includes('highest')) {
    sorting.sortBy = 'amount';
    sorting.sortOrder = 'desc';
  } else if (query.includes('smallest') || query.includes('lowest')) {
    sorting.sortBy = 'amount';
    sorting.sortOrder = 'asc';
  } else if (query.includes('newest') || query.includes('recent')) {
    sorting.sortBy = 'timestamp';
    sorting.sortOrder = 'desc';
  } else if (query.includes('oldest')) {
    sorting.sortBy = 'timestamp';
    sorting.sortOrder = 'asc';
  }

  return sorting;
}

// Main parsing function
export async function parseQueryToSchema(query: string): Promise<SolanaQuery> {
  // Determine intent based on query content
  let intent: SolanaQuery['intent'];
  if (query.includes('transaction') || query.includes('tx')) {
    intent = 'get_transactions';
  } else if (query.includes('token') || query.includes('holding')) {
    intent = 'get_token_holdings';
  } else if (query.includes('holder') || query.includes('distribution')) {
    intent = 'get_token_holders';
  } else if (query.includes('defi') || query.includes('activity')) {
    intent = 'get_defi_activities';
  } else {
    intent = 'get_account_details';
  }

  // Extract components
  const timeFrame = extractTimeFrame(query);
  const filters = extractFilters(query);
  const sorting = extractSorting(query);

  // Create the structured query
  const structuredQuery = {
    intent,
    ...(timeFrame && { timeFrame }),
    ...(Object.keys(filters).length > 0 && { filters }),
    ...(sorting.sortBy && { sortBy: sorting.sortBy }),
    ...(sorting.sortOrder && { sortOrder: sorting.sortOrder }),
    limit: 10 // Default limit
  };

  // Validate against schema
  return solanaQuerySchema.parse(structuredQuery);
} 