import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { retrieveContext, retrieveCoins, retrieveCoinsWithFilters, retrieveTrendingCoins, retrieveNfts, retrieveTrendingSolanaTokens, retrieveDexScreenerTokens, retrieveCryptoNews } from '@/utils/retrieval';
import { z } from 'zod';
import { TokenHolding } from "@/types";
import { 
  getAgentConfig, 
  getPortfolioValue, 
  getFearGreedIndex, 
  getTransactionVolumeAndCount, 
  getTokenInfo, 
  getMarketMovers,
  searchTokens,
  getTotalCryptoMarketCap,
  getMarketCategories,
  getDerivativesExchanges,
  getTopHolders,
  getTokenHoldings,
  getFinancialData,
  getFredSeries
 } from '@/utils/agent-tools';
import { getAccountDetails } from '@/utils/solscan';
import { createTask, getTaskStatus, getTaskDetails, waitForTaskCompletion } from '@/utils/browser-use';
import { parseQueryToSchema } from '@/utils/solana-schema';
import { makeSolscanRequest } from '@/utils/solscan';


export interface DexScreenerToken {
  tokenAddress: string;
  chainId: string;
  name?: string;
  symbol?: string;
  url?: string;
  description?: string;
  icon?: string;
  price?: {
    value: number;
    formatted: string;
  };
  metrics?: {
    marketCap?: number;
    fullyDilutedValuation?: number;
    volume24h?: number;
    liquidity?: number;
    totalPairs?: number;
    buys24h?: number;
    sells24h?: number;
    totalTransactions24h?: number;
    buySellRatio?: number;
  };
  links?: {
    total: number;
    socialLinks: string[];
    websiteUrls: string[];
    otherLinks: {
      url: string;
      description: string;
    }[];
  };
  details?: {
    createdAt?: string;
    ageDays?: number;
    labels?: string[];
    uniqueDexes?: string[];
  };
  last_updated: string;
  score: number;
  network?: string;
}

// Interface for token retrieval filters
export interface DexScreenerTokenFilters {
  chainId?: string;
  minLinks?: number;
  hasDescription?: boolean;
  hasIcon?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
  minVolume?: number;
  minAge?: number;
  maxAge?: number;
  minLiquidity?: number;
  hasLabels?: boolean;
  minBuySellRatio?: number;
  network?: string;
  searchText?: string; // Text search filter for name/symbol
}

// Types for task results
export interface BrowserUseTaskResult {
  id: string;
  task: string;
  live_url?: string;
  output: string;
  status: 'created' | 'running' | 'paused' | 'finished' | 'failed' | 'stopped';
  created_at: string;
  finished_at?: string;
  steps?: {
    id: string;
    step: number;
    evaluation_previous_goal?: string;
    next_goal?: string;
  }[];
  browser_data?: {
    cookies?: any[];
  };
}


function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000000) {
    return `${(num / 1000000000).toFixed(2)}B`;
  }
  if (Math.abs(num) >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  }
  // For very small numbers (like ratios)
  if (Math.abs(num) < 0.01) {
    return num.toFixed(4);
  }
  return num.toFixed(2);
}

function metricsToText(metricsArray: any[]): string {
  // Get the latest data entry
  const latestMetrics = metricsArray.find(item => 
    typeof item.metadata.Price === 'number'
  )?.metadata;

  if (!latestMetrics) return "No metrics data available.";

  const sections: { [key: string]: string[] } = {
    price: [],
    market: [],
    users: [],
    transactions: [],
    financial: [],
    token: [],
    ratios: [],
    network: []
  };

  // Price and Market Cap
  sections.price.push(`Solana's current price is $${latestMetrics.Price.toFixed(2)}`);
  sections.market = [
    `The circulating market cap is $${formatNumber(latestMetrics['Market cap (circulating)'])}`,
    `with a fully diluted market cap of $${formatNumber(latestMetrics['Market cap (fully diluted)'])}`,
    `and a circulating supply of ${formatNumber(latestMetrics['Circulating supply'])} tokens`
  ];

  // Users and Addresses
  sections.users = [
    'User Activity:',
    `• Daily: ${formatNumber(latestMetrics['Active users (daily)'])} users / ${formatNumber(latestMetrics['Active addresses (daily)'])} addresses`,
    `• Weekly: ${formatNumber(latestMetrics['Active users (weekly)'])} users / ${formatNumber(latestMetrics['Active addresses (weekly)'])} addresses`,
    `• Monthly: ${formatNumber(latestMetrics['Active users (monthly)'])} users / ${formatNumber(latestMetrics['Active addresses (monthly)'])} addresses`
  ];

  // Transactions
  sections.transactions = [
    'Transaction Metrics:',
    `• Count: ${formatNumber(latestMetrics['Transaction count'])} total transactions`,
    `• Speed: ${formatNumber(latestMetrics['Transactions per second'])} TPS`,
    `• Average Fee: $${latestMetrics['Average transaction fee'].toFixed(4)}`
  ];

  // Financial Metrics
  sections.financial = [
    'Financial Overview:',
    `• Revenue: $${formatNumber(latestMetrics.Revenue)}`,
    `• Fees: $${formatNumber(latestMetrics.Fees)}`,
    `• Expenses: $${formatNumber(latestMetrics.Expenses)}`,
    `• Earnings: $${formatNumber(latestMetrics.Earnings)}`,
    `• Supply-side Fees: $${formatNumber(latestMetrics['Supplyside fees'])}`,
    `• Token Incentives: $${formatNumber(latestMetrics['Token incentives'])}`
  ];

  // Per User Metrics
  sections.financial.push(
    'Per User Metrics:',
    `• ARPU: $${latestMetrics['Average revenue per user (ARPU)'].toFixed(4)}`,
    `• AFPU: $${latestMetrics['Average fee per user (AFPU)'].toFixed(4)}`
  );

  // Token Metrics
  sections.token = [
    'Token Metrics:',
    `• Trading Volume: $${formatNumber(latestMetrics['Token trading volume'])}`,
    `• Turnover (Circulating): ${latestMetrics['Token turnover (circulating)'].toFixed(4)}`,
    `• Turnover (Fully Diluted): ${latestMetrics['Token turnover (fully diluted)'].toFixed(4)}`
  ];

  // Ratios
  sections.ratios = [
    'Market Ratios:',
    `• P/F Ratio (Circulating): ${latestMetrics['PF ratio (circulating)'].toFixed(2)}`,
    `• P/F Ratio (Fully Diluted): ${latestMetrics['PF ratio (fully diluted)'].toFixed(2)}`,
    `• P/S Ratio (Circulating): ${latestMetrics['PS ratio (circulating)'].toFixed(2)}`,
    `• P/S Ratio (Fully Diluted): ${latestMetrics['PS ratio (fully diluted)'].toFixed(2)}`
  ];

  // Network Development
  sections.network = [
    'Network Development:',
    `• Core Developers: ${latestMetrics['Core developers']}`,
    `• Recent Code Commits: ${latestMetrics['Code commits']}`
  ];

  // Combine all sections with proper spacing
  return Object.values(sections)
    .filter(section => section.length > 0)
    .map(section => section.join('\n'))
    .join('\n\n');
}


export async function POST(req: Request) {
  const { messages, user, agent } = await req.json();

  // Validate required fields
  if (!agent || !agent.id || !agent.userId) {
    return new Response(
      JSON.stringify({ error: 'Invalid agent data' }),
      { status: 400 }
    );
  }

  // Get the latest user message
  const latestMessage = messages[messages.length - 1];

  // Fetch context, agent configuration, and coin data in parallel
  const [context, agentConfig] = await Promise.all([
    retrieveContext(latestMessage.content, agent.id),
    getAgentConfig(agent.userId, agent.id),
  ]);


  const allTools: { [key: string]: { description: string; parameters: any; execute: (args: any) => Promise<any> } } =
  { 
  
    getUserPortfolioValue: {
      description: "show the user's portfolio value for their connected wallet to the user",
      parameters: z.object({ userDetails: z.string() }),
      execute: async ({}: { user: string }) => {
        const data = await getPortfolioValue(user.wallet.address);
      // Calculate portfolio metrics
      const totalValue = typeof data === 'object' && 'holdings' in data ? data.holdings.reduce(
        (sum: number, token: TokenHolding) => sum + token.usdValue,
        0
      ) : 0;
      return {
        totalValue,
      }
  
      } 
    }, 
  
    getAgentPortfolioValue: {
      description: "show the agent's portfolio value for their embedded wallet to the user",
      parameters: z.object({ agent: z.string() }),
      execute: async ({}: { agentDetails: string }) => {
        const data = await getPortfolioValue(agentConfig.wallets.solana);
  
       // Calculate portfolio metrics
      const totalValue = typeof data === 'object' && 'holdings' in data ? data.holdings.reduce(
        (sum: number, token: TokenHolding) => sum + token.usdValue,
        0
      ) : 0;
      return {totalValue}
  
      }
    },
    
    getUserTokenHoldings: {
      description: "show the user's token holdings for their connected wallet",
      parameters: z.object({ userDetails: z.string() }),
      execute: async ({}: { userDetails: string }) => {
        const data = await getTokenHoldings(user.wallet.address);
        return data;
      }
    },
  
    getAgentTokenHoldings: {
      description: "show the agents token holdings for their embedded wallet to the user",
      parameters: z.object({ agentDetails: z.string() }),
      execute: async ({}: { agentDetails: string }) => {
        const data = await getTokenHoldings(agentConfig.wallets.solana);
        return data;
      }
    },
    
    getFearAndGreedIndex: {
      description: "Show market sentiment metrics for Fear & Greed Index",
      parameters: z.object({ metrics: z.string() }),
      execute: async ({}: { metrics: string }) => {
        const fearAndGreed = await getFearGreedIndex();
        return fearAndGreed;
      },
    },   
    
    getSolanaTransactionVolume: {
      description: "Show Solana transaction volume for the lst 24 hours",
      parameters: z.object({ timeframe: z.string() }),
      execute: async ({ timeframe }: { timeframe: string }) => {
        const response = await getTransactionVolumeAndCount(timeframe);
        return response;
      },
    },  
  
    getTokenInfo: {
      description: "Get detailed information about a specific Solana token using its contract address.",
      parameters: z.object({ 
        contractAddress: z.string().describe('The contract address of the solana token'),
      }),
      execute: async ({ contractAddress }: { contractAddress: string }) => {
        const response = await getTokenInfo(contractAddress);
        return response;
      },
    },
  
    getMarketMovers: {
      description: "Get top gaining and losing cryptocurrencies in the last 24 hours",
      parameters: z.object({}), // No parameters needed
      execute: async () => {
        const response = await getMarketMovers();
        return response;
  
      },
    },   

    getTopNfts: {
      description: "Get the top NFTs by market cap, volume, and other relevant metrics. You can filter by floor price, market cap, volume, platform, and minimum holders.",
      parameters: z.object({
        minFloorPrice: z.number().optional()
          .describe("Minimum floor price in USD"),
        maxFloorPrice: z.number().optional()
          .describe("Maximum floor price in USD"),
        minMarketCap: z.number().optional()
          .describe("Minimum market cap in USD"),
        maxMarketCap: z.number().optional()
          .describe("Maximum market cap in USD"),
        platform: z.enum(["ethereum", "solana", "polygon"]).optional()
          .describe("Filter by blockchain platform"),
        minVolume: z.number().optional()
          .describe("Minimum 24h volume in USD"),
        minHolders: z.number().optional()
          .describe("Minimum number of unique holders"),
        query: z.string().optional()
          .describe("Search query to filter NFTs by name or description")
      }),
      execute: async (params) => {
        const topNfts = await retrieveNfts(
          params.query,
          {
            minFloorPrice: params.minFloorPrice,
            maxFloorPrice: params.maxFloorPrice,
            minMarketCap: params.minMarketCap,
            maxMarketCap: params.maxMarketCap,
            platform: params.platform,
            minVolume: params.minVolume,
            minHolders: params.minHolders
          }
        );
        return topNfts;
      },
    },
  
    getTrendingTokens: {
      description: "Get trending tokens and cryptocurrencies with optional filters. Supports both global trending data and Solana-specific data with filtering options.",
      parameters: z.object({
        chain: z.enum(['all', 'solana'])
          .describe("Which blockchain to get trending tokens for. Use 'all' for trending across all chains, or 'solana' for Solana-specific tokens")
          .default('all'),
        filters: z.object({
          minPrice: z.number().optional()
            .describe("Minimum price in USD"),
          maxPrice: z.number().optional()
            .describe("Maximum price in USD"),
          minMarketCap: z.number().optional()
            .describe("Minimum market cap in USD"),
          maxMarketCap: z.number().optional()
            .describe("Maximum market cap in USD"),
          minHolders: z.number().optional()
            .describe("Minimum number of token holders (Solana only)"),
          minVolume: z.number().optional()
            .describe("Minimum 24h trading volume in USD"),
          minPriceChange: z.number().optional()
            .describe("Filter for tokens with minimum price increase percentage in 24h"),
        }).optional(),
        maxResults: z.number().optional()
          .describe("Maximum number of tokens to return")
          .default(100),
        sortBy: z.enum(['trending', 'price_change', 'market_cap', 'volume', 'holders'])
          .describe("How to sort the results")
          .default('trending'),
      }),
      execute: async ({ chain, filters, maxResults, sortBy }) => {
        if (chain === 'solana') {
          let trendingTokens = await retrieveTrendingSolanaTokens(undefined, filters);
          
          // Apply sorting using numeric fields
          if (sortBy === 'price_change') {
            trendingTokens = trendingTokens
              .filter(token => token.price_change_24h && token.price_change_24h > (filters?.minPriceChange || 0))
              .sort((a, b) => (b.price_change_24h || 0) - (a.price_change_24h || 0));
          } else if (sortBy === 'market_cap') {
            trendingTokens = trendingTokens
              .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0)); // Now uses numeric field
          } else if (sortBy === 'volume') {
            trendingTokens = trendingTokens
              .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0)); // Now uses numeric field
          } else if (sortBy === 'holders') {
            trendingTokens = trendingTokens
              .sort((a, b) => (b.holder || 0) - (a.holder || 0));
          }
    
          return trendingTokens.slice(0, maxResults)
        }
        
        const trendingCoins = await retrieveTrendingCoins(filters);
        return trendingCoins.slice(0, maxResults)
      },
    },
 
    getRecentlyLaunchedCoins: {
      description: "Search and retrieve information about recent cryptocurrencies. Filter by time ranges, market cap, volume, and more.",
      parameters: z.object({ 
        query: z.string().describe('Search query for finding recent cryptocurrencies'),
        filters: z.object({
          minPrice: z.number().optional(),
          maxPrice: z.number().optional(),
          categories: z.array(z.string()).optional(),
          marketCap: z.object({
            min: z.number().optional(),
            max: z.number().optional()
          }).optional(),
          volume: z.object({  // Added volume filter
            min: z.number().optional(),
            max: z.number().optional()
          }).optional(),
          timeRange: z.object({
            hours: z.number().optional(),
            days: z.number().optional()
          }).optional()
        }).optional()
      }),
      execute: async ({ query, filters }: { 
        query: string; 
        filters?: { 
          minPrice?: number; 
          maxPrice?: number; 
          categories?: string[]; 
          nameContains?: string; 
          marketCap?: { 
            min?: number; 
            max?: number 
          }; 
          volume?: {  // Added volume filter
            min?: number;
            max?: number;
          };
          timeRange?: { 
            hours?: number; 
            days?: number 
          } 
        } 
      }) => {
        if (filters) {
          const results = await retrieveCoinsWithFilters(filters);
          return results;
        }
        const results = await retrieveCoins(query);
        return results;
      }
    },
  
    searchTokens: {
      description: "Search for cryptocurrencies by name or symbol. Always tell the user they can click the result to get more information about the token like the contract adress.",
      parameters: z.object({
        query: z.string().describe('The search query for finding tokens')
      }),
      execute: async ({ query }: { query: string }) => {
        const response = await searchTokens(query);
        return response;
      },
    },
  
    getTotalCryptoMarketCap: {
      description: "Show the total market capitalization of all cryptocurrencies",
      parameters: z.object({}),
      execute: async () => {
        const response = await getTotalCryptoMarketCap();
        return response;
      },
    },
  
    getMarketCategories: {
      description: "Get coin categories with market data (market cap, volume, etc.)",
      parameters: z.object({}),
      execute: async () => {
        const response = await getMarketCategories();
        return response;
      },
    },
  
    getDerivativesExchanges: {  
      description: "Get information about derivatives exchanges and their trading volume, name, open interest, website, etc.",
      parameters: z.object({}),
      execute: async () => {
        const response = await getDerivativesExchanges();
        return response;
      },
    },
  
    getContractAddress: { 
      description: "Get the contract address of a token by name or symbol. Never tell the user However, there is no on-chain data available for this token, which means I don't have the contract address. You might want to check on a blockchain explorer or the official website of the token for more information. Always tell the user they will beed to click the result to get more information about the token.",
      parameters: z.object({ tokenNameOrSymbol: z.string().describe('the token name or symbol used to search for the contract address.') }),
      execute: async ({ tokenNameOrSymbol }: { tokenNameOrSymbol: string }) => {
        const response = await searchTokens(tokenNameOrSymbol);
        return response;
      },
    },
  
    getAccountDetails: {
      description: "Get detailed information and activity about a Solana account (wallet) using its address",
      parameters: z.object({ 
        address: z.string().describe('The Solana account address to look up')
      }),
      execute: async ({ address }: { address: string }) => {
        const response = await getAccountDetails(address);
        return response;
      },
    },             
  
    getTopHolders: {
      description: "Get the top holders of a Solana token by contract address.",
      parameters: z.object({ address: z.string().describe('The address of the token to get top holders for') }),
      execute: async ({ address }: { address: string }) => {
        const holders = await getTopHolders(address);
        return holders;
      }
    },
  
    getFredSeries: {
      description: "Get economic data series from FRED (Federal Reserve Economic Data) by series ID",
      parameters: z.object({ 
        seriesId: z.string().describe('The FRED series ID to fetch data for (e.g. GDP, UNRATE, CPIAUCSL)')
      }),
      execute: async ({ seriesId }: { seriesId: string }) => {
        const seriesData = await getFredSeries(seriesId);
        return seriesData;
      }
    },
  
    swap: {
      description: "Execute the swap. The fromToken, toToken, amount, slippage are passed in but the user does not supply those, they just supply the names or contract address and the amount",
      parameters: z.object({
        fromToken: z.string().describe('Input token name or contract address'),
        toToken: z.string().describe('Output token name or contract address'),
        amount: z.string().describe('Amount to swap '),
        slippage: z.number().optional().default(1.0).describe('Slippage tolerance in percentage') 
      }),
      execute: async ({ fromToken, toToken, amount }) => {
        return {fromToken, toToken, amount}  
      },
    },

    getRecentDexScreenerTokens: {
      description: "Get recent tokens from DexScreener with optional filters and search",
      parameters: z.object({
        chain: z.enum(['all', 'solana', 'ethereum', 'polygon', 'bsc', 'avalanche', 'fantom', 'arbitrum'])
          .describe("Which blockchain to get recent tokens for")
          .default('all'),
        searchText: z.string().optional()
          .describe("Search for tokens by name or symbol (case-insensitive)"),
        filters: z.object({
          minLinks: z.number().optional()
            .describe("Minimum number of links"),
          minPrice: z.number().optional()
            .describe("Minimum price in USD"),
          maxPrice: z.number().optional()
            .describe("Maximum price in USD"),
          minMarketCap: z.number().optional()
            .describe("Minimum market cap in USD"),
          maxMarketCap: z.number().optional()
            .describe("Maximum market cap in USD"),
          minVolume: z.number().optional()
            .describe("Minimum 24h volume in USD"),
          minLiquidity: z.number().optional()
            .describe("Minimum liquidity in USD"),
          minAge: z.number().optional()
            .describe("Minimum age in days"),
          maxAge: z.number().optional()
            .describe("Maximum age in days"),
          hasDescription: z.boolean().optional()
            .describe("Filter for tokens with/without description"),
          hasIcon: z.boolean().optional()
            .describe("Filter for tokens with/without icon"),
          hasLabels: z.boolean().optional()
            .describe("Filter for tokens with labels"),
          minBuySellRatio: z.number().optional()
            .describe("Minimum ratio of buys to sells in 24h")
        }).optional(),
        maxResults: z.number().optional()
          .describe("Maximum number of tokens to return")
          .default(100),
        sortBy: z.enum(['score', 'links', 'recent', 'volume', 'market_cap', 'liquidity', 'transactions', 'price'])
          .describe("How to sort the results")
          .default('score'),
      }),
      execute: async ({ chain, searchText, filters, maxResults, sortBy }) => {
        // Prepare chain-specific filters
        const chainFilters: DexScreenerTokenFilters = { ...filters };
        
        // If specific chain is specified, add chain filter
        if (chain !== 'all') {
          chainFilters.chainId = chain;
        }
        
        // Add search text if provided
        if (searchText) {
          chainFilters.searchText = searchText;
        }
    
        // Retrieve tokens
        let trendingTokens = await retrieveDexScreenerTokens(
          undefined, // No semantic query needed for trending/filtering
          chainFilters, 
          maxResults || 100
        );
    
        // Apply sorting
        switch (sortBy) {
          case 'links':
            trendingTokens = trendingTokens.sort((a, b) => (b.links?.total || 0) - (a.links?.total || 0));
            break;
          case 'recent':
            trendingTokens = trendingTokens.sort((a, b) => {
              const aDate = new Date(a.last_updated || 0).getTime();
              const bDate = new Date(b.last_updated || 0).getTime();
              return bDate - aDate;
            });
            break;
          case 'volume':
            trendingTokens = trendingTokens.sort((a, b) => (b.metrics?.volume24h || 0) - (a.metrics?.volume24h || 0));
            break;
          case 'market_cap':
            trendingTokens = trendingTokens.sort((a, b) => (b.metrics?.marketCap || 0) - (a.metrics?.marketCap || 0));
            break;
          case 'liquidity':
            trendingTokens = trendingTokens.sort((a, b) => (b.metrics?.liquidity || 0) - (a.metrics?.liquidity || 0));
            break;
          case 'transactions':
            trendingTokens = trendingTokens.sort((a, b) => (b.metrics?.totalTransactions24h || 0) - (a.metrics?.totalTransactions24h || 0));
            break;
          case 'price':
            trendingTokens = trendingTokens.sort((a, b) => (b.price?.value || 0) - (a.price?.value || 0));
            break;
          default:
            // Default to sorting by score
            trendingTokens = trendingTokens.sort((a, b) => b.score - a.score);
        }
    
        return trendingTokens;
      }
    },

    getCryptoNews: {
      description: "Get recent cryptocurrency news with semantic search",
      parameters: z.object({
        query: z.string()
          .describe("Semantic search query - find articles related to this topic"),
        maxResults: z.number().optional()
          .describe("Maximum number of articles to return")
          .default(10),
      }),
      execute: async ({ query, maxResults }) => {
        
        // Retrieve news articles
        let newsArticles = await retrieveCryptoNews(
          query, // Semantic query
          {},    // No filters
          maxResults || 10
        );
        
        // Format the results for display
        return newsArticles.map(article => ({
          id: article.id,
          title: article.title,
          summary: article.body.length > 150 ? `${article.body.substring(0, 150)}...` : article.body,
          full_text: article.body,
          url: article.url,
          published_date: article.published_date,
          source: article.source_name || "Unknown",
          sentiment: article.sentiment || "NEUTRAL",
          categories: article.categories || [],
          image_url: article.image_url,
          score: article.score
        }));
      }
    },

    // Add these to your allTools object
    stockAnalysis: {
      description: "Analyze financial stock data using yfinance, showing comprehensive analysis of financials, news sentiment, and technical indicators",
      parameters: z.object({ 
        ticker: z.string().describe('The stock ticker symbol (e.g., AAPL, MSFT, GOOGL)')
      }),
      execute: async ({ ticker }: { ticker: string }) => {
        try {
          // Use your existing getFinancialData function
          const result = await getFinancialData([ticker], 'comprehensive');
          return result;
        } catch (error) {
          console.error('Error in stock analysis:', error);
          return { 
            error: 'Failed to analyze stock data',
            ticker 
          };
        }
      }
    },   

    webResearch: {
      description: "Perform comprehensive web research using browser automation",
      parameters: z.object({
        query: z.string().describe("Research query describing what information to find"),
        sites: z.array(z.string()).optional().describe("Specific websites to search (e.g., ['coinmarketcap.com', 'defillama.com'])"),
        dataFormat: z.enum(['text', 'json']).optional().default('text').describe("Format for the output data"),
        depth: z.enum(['basic', 'detailed', 'comprehensive']).optional().default('detailed').describe("Level of detail for the research"),
        includeSources: z.boolean().optional().default(true).describe("Whether to include source URLs in the report")
      }),
      execute: async ({ query, sites, dataFormat, depth, includeSources }: {
        query: string;
        sites?: string[];
        dataFormat?: 'text' | 'json';
        depth?: 'basic' | 'detailed' | 'comprehensive';
        includeSources?: boolean;
      }) => {
        try {
          // Construct improved research instructions
          let instructions = `Research the following topic thoroughly: ${query}`;
          
          // Add depth instructions
          if (depth === 'comprehensive') {
            instructions += `. Conduct exhaustive research and provide an in-depth analysis with multiple perspectives, historical context, latest developments, technical details, market implications, and expert opinions where available.`;
          } else if (depth === 'detailed') {
            instructions += `. Provide detailed information including key facts, recent developments, relevant statistics, and different viewpoints on the topic.`;
          } else {
            instructions += `. Focus on the most essential information and key points.`;
          }
          
          if (sites && sites.length > 0) {
            instructions += ` Focus your research on these sites: ${sites.join(', ')}.`;
          }
          
          // Guide the format and structure of the report
          if (dataFormat === 'json') {
            instructions += ` Return the results in a structured JSON format with the following sections: summary, keyPoints, marketData, technicalDetails, opinions, trends, and risks.`;
          } else {
            instructions += ` Structure your report with clear sections including: Executive Summary, Background, Current State, Technical Analysis, Market Implications, Expert Opinions, and Future Outlook. Use bullet points for key information and include numerical data where relevant.`;
            instructions += ` Add a space between paragraphs and use headings to separate different sections for clarity.`;
          }
          
          // Request sources if needed
          if (includeSources) {
            instructions += ` Include all source URLs for each piece of information to ensure traceability and verification.`;
          }
          
          // Additional guidance for thoroughness
          instructions += ` Don't limit your research to just the first few search results. Explore multiple pages and sources to ensure comprehensive coverage. Compare and contrast different viewpoints and provide context for conflicting information.`;

          // Instruct the agent to create a multi-parapgraph research paper type response
          instructions += ` Write a detailed research report with multiple paragraphs, each focusing on a different aspect of the topic. Include a summary at the beginning and a conclusion at the end.`;
          
          // Create the task and return immediately
          const taskResponse = await createTask(instructions);
          
          // Return task details for the client to start polling
          return {
            taskId: taskResponse.id,
            status: taskResponse.status || 'created',
            liveUrl: taskResponse.live_url,
            output: "Comprehensive research in progress...",
            steps: taskResponse.steps || []
          };
        } catch (error: any) {
          console.error('Error in web research:', error);
          return {
            error: error.message,
            query
          };
        }
      }
    },

    getTradingViewChart: {
      description: "Display a TradingView chart widget for a given symbol with customizable settings. By default, no technical indicators are shown. You can optionally specify indicators using natural language (e.g., 'Ichimoku Cloud', 'RSI', 'MACD') or their exact TradingView identifiers.",
      parameters: z.object({
        symbol: z.string().optional().describe('The trading symbol (e.g., BINANCE:BTCUSDT). If not provided, defaults to BINANCE:BTCUSDT'),
        interval: z.string().optional().describe('The chart interval (e.g., 1, 5, 15, 30, 60, 240, D, W, M)'),
        timezone: z.string().optional().describe('Chart timezone'),
        allow_symbol_change: z.boolean().optional().describe('Allow symbol change'),
        container_id: z.string().optional().describe('Container ID for the chart'),
        height: z.number().optional().describe('Chart height in pixels'),
        width: z.string().optional().describe('Chart width (e.g., "100%", "800px")'),
        studies: z.array(z.string()).optional().describe('Array of technical indicators to display. If not specified, no indicators will be shown. Can use natural language names (e.g., "Ichimoku Cloud", "RSI", "MACD") or exact TradingView identifiers.'),
      }),
      execute: async (params) => {
        // Mapping of natural language names to TradingView study identifiers
        const indicatorMap: { [key: string]: string } = {
          // Moving Averages
          "ema": "STD;EMA",
          "sma": "STD;SMA",
          "wma": "STD;WMA",
          "hull ma": "STD;Hull%1MA",
          "dem": "STD;DEMA",
          "tema": "STD;TEMA",
          "vwma": "STD;VWMA",
          "alma": "STD;Arnaud%1Legoux%1Moving%1Average",
          "lsma": "STD;Least%1Squares%1Moving%1Average",
          "mcginley dynamic": "STD;McGinley%1Dynamic",
          "ma ribbon": "STD;MA%Ribbon",
          "ma cross": "STD;MA%1Cross",
          
          // Momentum Indicators
          "rsi": "STD;RSI",
          "macd": "STD;MACD",
          "stochastic": "STD;Stochastic",
          "stochastic rsi": "STD;Stochastic_RSI",
          "cci": "STD;CCI",
          "momentum": "STD;Momentum",
          "roc": "STD;ROC",
          "mfi": "STD;Money_Flow",
          "ultimate oscillator": "STD;Ultimate_Oscillator",
          "awesome oscillator": "STD;Awesome_Oscillator",
          "bull bear power": "STD;Bull%Bear%Power",
          "klinger oscillator": "STD;Klinger%1Oscillator",
          "true strength indicator": "STD;True%1Strength%1Indicator",
          "williams r": "STD;Willams_R",
          "woodies cci": "STD;Woodies%1CCI",
          
          // Volatility Indicators
          "bollinger bands": "STD;Bollinger_Bands",
          "bollinger bands b": "STD;Bollinger_Bands_B",
          "bollinger bands width": "STD;Bollinger_Bands_Width",
          "bollinger bars": "STD;Bollinger%1Bars",
          "atr": "STD;Average_True_Range",
          "keltner channels": "STD;Keltner_Channels",
          "donchian channels": "STD;Donchian_Channels",
          "volatility stop": "STD;Volatility_Stop",
          "historical volatility": "STD;Historical_Volatility",
          "chop zone": "STD;Chop%1Zone",
          "choppiness index": "STD;Choppiness_Index",
          
          // Volume Indicators
          "volume": "STD;Volume%1Delta",
          "volume oscillator": "STD;Volume%1Oscillator",
          "obv": "STD;On_Balance_Volume",
          "vwap": "STD;VWAP",
          "chaikin money flow": "STD;Chaikin_Money_Flow",
          "chaikin oscillator": "STD;Chaikin_Oscillator",
          "money flow": "STD;Money_Flow",
          "net volume": "STD;Net%1Volume",
          "volume delta": "STD;Volume%1Delta",
          "24h volume": "STD;24h%Volume",
          "cumulative volume delta": "STD;Cumulative%1Volume%1Delta",
          "cumulative volume index": "STD;Cumulative%1Volume%1Index",
          "up down volume": "STD;UP_DOWN_Volume",
          
          // Trend Indicators
          "adx": "STD;Average%1Directional%1Index",
          "dmi": "STD;DMI",
          "ichimoku cloud": "STD;Ichimoku%1Cloud",
          "parabolic sar": "STD;PSAR",
          "supertrend": "STD;Supertrend",
          "williams alligator": "STD;Williams_Alligator",
          "williams fractals": "STD;Whilliams_Fractals",
          "trend strength index": "STD;Trend%1Strength%1Index",
          "bb trend": "STD;BBTrend",
          "linear regression": "STD;Linear_Regression",
          "price oscillator": "STD;Price_Oscillator",
          "price target": "STD;Price%1Target",
          "price volume trend": "STD;Price_Volume_Trend",
          "trix": "STD;TRIX",
          "vortex indicator": "STD;Vortex%1Indicator",
          
          // Pivot Points
          "pivot points standard": "STD;Pivot%1Points%1Standard",
          "pivot points high low": "STD;Pivot%1Points%1High%1Low",
          "pivot points fibonacci": "STD;Pivot%1Points%1Fibonacci",
          "pivot points camarilla": "STD;Pivot%1Points%1Camarilla",
          "pivot points woodie": "STD;Pivot%1Points%1Woodie",
          "pivot points demark": "STD;Pivot%1Points%1Demark",
          
          // Other Indicators
          "aroon": "STD;Aroon",
          "average day range": "STD;Average%Day%Range",
          "balance of power": "STD;Balance%1of%1Power",
          "chande kroll stop": "STD;Chande%1Kroll%1Stop",
          "chande momentum oscillator": "STD;Chande_Momentum_Oscillator",
          "coppock curve": "STD;Coppock%1Curve",
          "dpo": "STD;DPO",
          "eom": "STD;EOM",
          "efi": "STD;EFI",
          "env": "STD;ENV",
          "fisher transform": "STD;Fisher_Transform",
          "gaps": "STD;Gaps",
          "know sure thing": "STD;Know_Sure_Thing",
          "mass index": "STD;Mass%1Index",
          "median": "STD;Median",
          "moon phases": "STD;Moon%1Phases",
          "performance": "STD;Performance",
          "rank correlation index": "STD;Rank_Correlation_Index",
          "rci ribbon": "STD;RCI_Ribbon",
          "relative vigor index": "STD;Relative_Vigor_Index",
          "relative volatility index": "STD;Relative_Volatility_Index",
          "relative volume at time": "STD;Relative%1Volume%1at%1Time",
          "seasonality": "STD;Seasonality",
          "smi": "STD;SMI",
          "smi ergodic indicator oscillator": "STD;SMI_Ergodic_Indicator_Oscillator",
          "smi ergodic oscillator": "STD;SMI_Ergodic_Oscillator",
          "smoothed moving average": "STD;Smoothed%1Moving%1Average",
          "technical ratings": "STD;Technical%1Ratings",
          "time weighted average price": "STD;Time%1Weighted%1Average%1Price",
          "trading sessions": "STD;Trading%1Sessions",
          "visible average price": "STD;Visible%1Average%1Price"
        };

        // Convert natural language indicator names to TradingView identifiers
        const convertedStudies = params.studies?.map((study: string) => {
          // If the study already starts with "STD;" or ends with "@tv-basicstudies", return as is
          if (study.startsWith("STD;") || study.endsWith("@tv-basicstudies")) {
            return study;
          }
          
          // Try to find a match in the indicator map (case-insensitive)
          const normalizedStudy = study.toLowerCase().trim();
          return indicatorMap[normalizedStudy] || study;
        });

        return {
          symbol: params.symbol || 'BINANCE:BTCUSDT',
          interval: params.interval,
          timezone: params.timezone,
          allow_symbol_change: params.allow_symbol_change,
          container_id: params.container_id,
          height: params.height,
          width: params.width,
          studies: convertedStudies || [], // Only include studies if they are specified
        };
      }
    },

    getTechnicalAnalysis: {
      description: "Get technical analysis and insights for a given trading symbol using CoinGecko data. This tool provides current price data, technical indicators, and market sentiment analysis.",
      parameters: z.object({
        symbol: z.string().describe('The trading symbol (e.g., bitcoin, ethereum, solana)'),
        days: z.number().optional().describe('Number of days of historical data to analyze (default: 200)')
      }),
      execute: async ({ symbol, days = 200 }) => {
        try {
          // First, try to get the coin ID from CoinGecko
          const searchResponse = await fetch(`https://api.coingecko.com/api/v3/search?query=${symbol}`);
          const searchData = await searchResponse.json();
          // time.sleep ahaalf second 
          await new Promise(resolve => setTimeout(resolve, 500));

          if (!searchResponse.ok) {
            throw new Error(`CoinGecko API error: ${searchData.error || 'Failed to search for coin'}`);
          }

          if (!searchData.coins || searchData.coins.length === 0) {
            return {
              error: 'Coin not found',
              message: `Could not find any coin matching "${symbol}". Please check the symbol and try again.`,
              suggestions: [
                'Make sure you are using the correct coin symbol (e.g., "bitcoin" instead of "BTC")',
                'Try searching for the coin on CoinGecko to find the correct symbol',
                'Check if the coin is listed on CoinGecko'
              ]
            };
          }

          // Get the first matching coin's ID
          const coinId = searchData.coins[0].id;

          // Get market data using the coin ID
          const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(`CoinGecko API error: ${data.error || 'Failed to fetch market data'}`);
          }

          // Get additional market data including price change percentages
          const marketDataResponse = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);
          const marketData = await marketDataResponse.json();

          if (!marketDataResponse.ok) {
            throw new Error(`CoinGecko API error: ${marketData.error || 'Failed to fetch market data'}`);
          }

          // Extract price data
          const prices = data.prices.map(([timestamp, price]: [number, number]) => ({
            timestamp: new Date(timestamp),
            price
          }));

          // Calculate basic price metrics
          const currentPrice = prices[prices.length - 1].price;
          const priceChange24h = marketData.market_data.price_change_percentage_24h;
          const priceChange7d = marketData.market_data.price_change_percentage_7d;
          const priceChange30d = marketData.market_data.price_change_percentage_30d;

          // Calculate various technical indicators
          const technicalIndicators: any = {
            sma: {
              '20': calculateSMA(prices, 20),
              '50': calculateSMA(prices, 50),
              '200': calculateSMA(prices, 200)
            },
            ema: {
              '9': calculateEMA(prices, 9),
              '21': calculateEMA(prices, 21),
              '50': calculateEMA(prices, 50)
            },
            rsi: calculateRSI(prices),
            macd: calculateMACD(prices),
            stochRSI: calculateStochRSI(prices),
            cci: calculateCCI(prices),
            mfi: calculateMFI(prices),
            adx: calculateADX(prices),
            dmi: calculateDMI(prices),
            ichimoku: calculateIchimoku(prices),
            aroon: calculateAroon(prices),
            bollingerBands: calculateBollingerBands(prices),
            atr: calculateATR(prices),
            volume: calculateVolumeMetrics(prices),
            obv: calculateOBV(prices),
            pivotPoints: calculatePivotPoints(prices),
            fibonacciRetracement: calculateFibonacciRetracement(prices)
          };

          // Calculate support and resistance levels
          const supportResistance = calculateSupportResistance(prices);

          // Calculate market sentiment
          const sentiment = calculateMarketSentiment(prices, technicalIndicators.rsi, technicalIndicators.bollingerBands);

          return {
            symbol: searchData.coins[0].symbol.toUpperCase(),
            name: searchData.coins[0].name,
            image: searchData.coins[0].large,
            currentPrice,
            priceChange: {
              '24h': priceChange24h,
              '7d': priceChange7d,
              '30d': priceChange30d
            },
            technicalIndicators,
            supportResistance,
            marketSentiment: sentiment,
            lastUpdated: new Date().toISOString(),
            analysisPeriod: {
              days
            }
          };
        } catch (error: any) {
          console.error('Error in technical analysis:', error);
          return {
            error: 'Failed to analyze chart data',
            message: error.message || 'An unexpected error occurred while analyzing the chart data.',
            suggestions: [
              'Check if the coin symbol is correct',
              'Try using the full coin name instead of the symbol',
              'Verify that the coin is listed on CoinGecko',
              'Check your internet connection and try again'
            ]
          };
        }
      }
    },

    // parseSolanaQuery: {
    //   description: "PRIMARY TOOL FOR SOLANA QUERIES: Parse natural language queries about Solana blockchain data and fetch from Solscan. Use this for ALL Solana-related queries including transactions, token holdings, DeFi activities, and account details. Handles time-based queries, filters, and sorting.",
    //   parameters: z.object({
    //     query: z.string().describe('The natural language query about Solana to parse'),
    //     addresses: z.array(z.string()).optional().describe('Optional array of Solana addresses to query')
    //   }),
    //   execute: async ({ query, addresses }: { query: string; addresses?: string[] }) => {
    //     try {
    //       // Parse the query using the schema
    //       const structuredQuery = await parseQueryToSchema(query);
    //       console.log('Parsed structured query:', structuredQuery);
          
    //       // If addresses are provided, query each one
    //       if (addresses && addresses.length > 0) {
    //         const results = await Promise.all(
    //           addresses.map(async (address) => {
    //             const endpoint = getEndpointFromIntent(structuredQuery.intent);
    //             const params = mapQueryToParams(structuredQuery);
    //             console.log('Making Solscan request with:');
    //             console.log('Endpoint:', endpoint);
    //             console.log('Params:', { ...params, address });
    //             const response = await makeSolscanRequest(endpoint, { ...params, address });
    //             return { address, data: response };
    //           })
    //         );
    //         return results;
    //       }
          
    //       return { query: structuredQuery };
    //     } catch (error) {
    //       console.error('Error parsing Solana query:', error);
    //       throw error;
    //     }
    //   }
    // },

  }

  // Define tool sets for different user tiers
  const availableTools = {
    getAgentPortfolioValue: allTools.getAgentPortfolioValue,
    getUserPortfolioValue: allTools.getUserPortfolioValue,
    getAgentTokenHoldings: allTools.getAgentTokenHoldings,
    getUserTokenHoldings: allTools.getUserTokenHoldings,
    getSolanaTransactionVolume: allTools.getSolanaTransactionVolume,
    getDerivativesExchanges: allTools.getDerivativesExchanges,
    getTopHolders: allTools.getTopHolders,
    getAccountDetails: allTools.getAccountDetails,
    getTrendingTokens: allTools.getTrendingTokens,
    getTokenInfo: allTools.getTokenInfo,
    getMarketMovers: allTools.getMarketMovers,
    searchTokens: allTools.searchTokens,
    getTotalCryptoMarketCap: allTools.getTotalCryptoMarketCap,
    getMarketCategories: allTools.getMarketCategories,
    getFearAndGreedIndex: allTools.getFearAndGreedIndex,
    getRecentlyLaunchedCoins: allTools.getRecentlyLaunchedCoins,
    getTopNfts: allTools.getTopNfts,
    swap: allTools.swap,
    getRecentDexScreenerTokens: allTools.getRecentDexScreenerTokens,
    getCryptoNews: allTools.getCryptoNews,
    stockAnalysis: allTools.stockAnalysis,
    webResearch: allTools.webResearch,
    getTradingViewChart: allTools.getTradingViewChart,
    getTechnicalAnalysis: allTools.getTechnicalAnalysis,
    getFredSeries: allTools.getFredSeries,
    // parseSolanaQuery: allTools.parseSolanaQuery
  };

// Format context for the prompt
const contextText = context
.map(item => `Relevant context from ${item.source}:\n${item.text}`)
.join('\n\n');   


// Generate tool documentation
function generateToolDocumentation(tools: { [key: string]: { description: string; parameters: any; execute: (args: any) => Promise<any> } }) {
  let documentation = "## Available Tools\n\n";
  
  // Loop through all tools and add their descriptions
  for (const [toolName, toolInfo] of Object.entries(tools)) {
    documentation += `### ${toolName}\n`;
    documentation += `${toolInfo.description}\n\n`;
  }
  
  return documentation;
}
const toolsDocumentation = generateToolDocumentation(availableTools);


const systemPrompt = `
## User Information (the user that's interacting with the agent):
- User's ID: ${user.id}
- User's Email: ${user.email || 'N/A'}
- User's Wallet: ${user.wallet?.address || 'N/A'}

## Agent Information (the agent that's answering the user's query):
- Agent's ID: ${agentConfig.id}
- Agent's Name: ${agentConfig.name}
- Agent's Description: ${agentConfig.description}
- Agent's Wallet: ${agentConfig.wallets?.solana || 'N/A'}

## Solana Query Handling
When a user asks about Solana data (transactions, tokens, DeFi activities, etc.), you MUST use the parseSolanaQuery tool first. This tool will:
1. Parse the natural language query into a structured format
2. Handle time-based queries (e.g., "last 3 days", "past week")
3. Apply filters (e.g., specific tokens, platforms)
4. Sort results as requested
5. Return data from Solscan

Examples of queries that should use parseSolanaQuery:
- "Show me transactions from the last 3 days for [address]"
- "What tokens does this wallet hold: [address]"
- "Get all Raydium transactions for [address]"
- "Show me USDC transactions sorted by amount for [address]"

DO NOT use other tools like getAccountDetails for Solana-specific queries. Always use parseSolanaQuery first.

## Core Capabilities & Knowledge Domains
${agentConfig.coreCapabilities}

### Interaction Style
${agentConfig.interactionStyle}

### Analysis Approach
${agentConfig.analysisApproach}

### Risk Communication
${agentConfig.riskCommunication}

## Response Format
${agentConfig.responseFormat}

## Limitations & Disclaimers
${agentConfig.limitationsDisclaimers}

## Prohibited Behaviors
${agentConfig.prohibitedBehaviors}

## Knowledge Updates
${agentConfig.knowledgeUpdates}

## Response Priority Order
${agentConfig.responsePriorityOrder}

## Special Instructions
${agentConfig.specialInstructions}

## Style Guide
${agentConfig.styleGuide}

# Tool Documentation
${toolsDocumentation}

# Relevant Context for This Query:
${contextText}

${agentConfig.userId === 'template' ? `
 If the users runs the Get Agent Portfolio tool (getAgentPortfolioValue), tell them this is a template agent and does not have a wallet. 
 Template agents do no have access to wallets and therefore cannot execute swaps. If they run the swap tool, tell them template agents cannot execute swaps and to create a new agent, fund the agent wallet to use this functionality.
`: ''}

## Browser Use Tools
Whenever the user asks to do "research" or "analysis" you should run the webResearch tool.
When you run the webResearch tool, you should only run the tool, not provide an answer in the next message. 
When the user runs the tool from the chat side bar it will say "Start research" Please confirm with the user what they'd like to reseaech first. 
When the user gives and answer, you can run the webResearch tool with the query and the sites they mentioned. Always try and run the tool. never say you can't.
Your AI agent can now perform browser automation tasks to gather real-time finance and cryptocurrency data:
- Web Research: Search and extract information from crypto, finance and economics websites

## Traditional Financial Analysis Capabilities
This agent can analyze stock market data using comprehensive financial tools:
- Stock Analysis: Get detailed financial data including ratios, price targets, and sentiment
- When users ask about stocks, the agent should use the stockAnalysis tool

## Response Format Guidelines
1. After using any tool, ALWAYS analyz the reponse and provide a summary and a recommmend suggested anlysis step. Also Suggest 2-3 relevant follow-up tools from our tool list. 
2. Format follow-up suggestions like this:
   \n\n---\n### What would you like to do next?\n
   1. [Suggestion 1]
   2. [Suggestion 2]
   3. [Suggestion 3]\n---\n

## Tool Relationships
When suggesting follow-ups, consider relevant relationships between tools

# Chatbot Tool Special Instructions:
When ever the user asks for information about their wallet you should ask what type of info they want. Token info, portfolio value, or detailed information including defi activities.
Don't add images to your response.
When using the getTradingViewChart tool do not show the coingecko image.
If you need a contract address to run another tool or query, ask the user to first click into the search result to get the contract address.
When your listing token holdings do not add the token image to the list.
When you're replying to the user and the reponses in not a tool, do not add images to the response.
When generating numbered lists make sure to format it correctly. Make sure the number and the result are on the same line. Also make sure that items do not use numbers. 
Only when using the getTopNfts tool, show the image of the NFT.
When using the swap tool, make sure to only say the swap has been submitted and to check the results above. you can mention the details of the swap. If the user doesn't specifiy a slippage, use the default of 1.0. Always ask to confirm the swap before executing it. They only need to confirm the slippage and the execution of the swap, nothign else.
When the users asks to get recent tokens ask them if thy'd like to get recent tokens on DexScreener, or recent coins listed on CoinGecko.
If the user asks to see trending tokens, ask them if they'd like to see trending tokens on Solscan or trending tokens on CoinGecko.
If the user wants to search for a token ask them if they'd like to search for a token listed on CoinGecko or recent tokens on DexScreener. If they say CoinGecko use the searchTokens tool. If they DexScreener use the getRecentDexScreenerTokens tool. If they dont specify which one to use, use the searchTokens tool.
if the user uses the searchTokens tool, and no results are found tell them they can try searching for the token on CoinGecko or DexScreener which might have different results.
When a user uses a tool, recommend other tools that they might find useful based on the tool they used.
Remember to use both the general context and cryptocurrency data when relevant to answer the user's query.`;


  const result = streamText({
    model: openai("gpt-4o") as any,
    system: systemPrompt,
    messages: messages,
    // async onFinish({ response }) {
    // },    
    tools: availableTools 
  });


  return result.toDataStreamResponse();
}

// Helper functions for technical analysis
function calculateSMA(prices: { timestamp: Date; price: number }[], period: number): number {
  if (prices.length < period) return 0;
  const sum = prices.slice(-period).reduce((acc, curr) => acc + curr.price, 0);
  return sum / period;
}

function calculateRSI(prices: { timestamp: Date; price: number }[], period: number = 14): number {
  if (prices.length < period + 1) return 0;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const difference = prices[prices.length - i].price - prices[prices.length - i - 1].price;
    if (difference >= 0) {
      gains += difference;
    } else {
      losses -= difference;
    }
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  
  return 100 - (100 / (1 + rs));
}

function calculateEMA(prices: { timestamp: Date; price: number }[], period: number): number {
  if (prices.length < period + 1) return 0;
  
  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i].price - ema) * multiplier + ema;
  }
  
  return ema;
}

function calculateMACD(prices: { timestamp: Date; price: number }[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  const signal = calculateEMA(prices.map((p, i) => ({ timestamp: p.timestamp, price: macd })), 9);
  const histogram = macd - signal;
  
  return { macd, signal, histogram };
}

function calculateStochRSI(prices: { timestamp: Date; price: number }[], period: number = 14): number {
  const rsi = calculateRSI(prices, period);
  const rsiValues = prices.map((_, i) => calculateRSI(prices.slice(0, i + 1), period));
  const minRSI = Math.min(...rsiValues);
  const maxRSI = Math.max(...rsiValues);
  
  return ((rsi - minRSI) / (maxRSI - minRSI)) * 100;
}

function calculateCCI(prices: { timestamp: Date; price: number }[], period: number = 20): number {
  if (prices.length < period) return 0;
  
  const typicalPrices = prices.map(p => (p.price + p.price + p.price) / 3);
  const sma = calculateSMA(prices, period);
  const meanDeviation = prices.slice(-period).reduce((acc, curr) => 
    acc + Math.abs(curr.price - sma), 0) / period;
  
  return (prices[prices.length - 1].price - sma) / (0.015 * meanDeviation);
}

function calculateMFI(prices: { timestamp: Date; price: number }[], period: number = 14): number {
  if (prices.length < period + 1) return 0;
  
  let positiveFlow = 0;
  let negativeFlow = 0;
  
  for (let i = 1; i <= period; i++) {
    const typicalPrice = (prices[prices.length - i].price + prices[prices.length - i].price + prices[prices.length - i].price) / 3;
    const prevTypicalPrice = (prices[prices.length - i - 1].price + prices[prices.length - i - 1].price + prices[prices.length - i - 1].price) / 3;
    
    if (typicalPrice > prevTypicalPrice) {
      positiveFlow += typicalPrice;
    } else {
      negativeFlow += typicalPrice;
    }
  }
  
  return 100 - (100 / (1 + positiveFlow / negativeFlow));
}

function calculateADX(prices: { timestamp: Date; price: number }[], period: number = 14): number {
  const dmi = calculateDMI(prices, period);
  const dx = Math.abs(dmi.plus - dmi.minus) / (dmi.plus + dmi.minus) * 100;
  return calculateEMA(prices.map((p, i) => ({ timestamp: p.timestamp, price: dx })), period);
}

function calculateDMI(prices: { timestamp: Date; price: number }[], period: number = 14): { plus: number; minus: number } {
  if (prices.length < period + 1) return { plus: 0, minus: 0 };
  
  let plusDM = 0;
  let minusDM = 0;
  
  for (let i = 1; i <= period; i++) {
    const highDiff = prices[prices.length - i].price - prices[prices.length - i - 1].price;
    const lowDiff = prices[prices.length - i - 1].price - prices[prices.length - i].price;
    
    if (highDiff > lowDiff && highDiff > 0) {
      plusDM += highDiff;
    } else if (lowDiff > highDiff && lowDiff > 0) {
      minusDM += lowDiff;
    }
  }
  
  return {
    plus: (plusDM / period) * 100,
    minus: (minusDM / period) * 100
  };
}

function calculateIchimoku(prices: { timestamp: Date; price: number }[]): {
  tenkan: number;
  kijun: number;
  senkouA: number;
  senkouB: number;
} {
  const tenkanPeriod = 9;
  const kijunPeriod = 26;
  const senkouBPeriod = 52;
  
  const tenkan = (Math.max(...prices.slice(-tenkanPeriod).map(p => p.price)) + 
                  Math.min(...prices.slice(-tenkanPeriod).map(p => p.price))) / 2;
  const kijun = (Math.max(...prices.slice(-kijunPeriod).map(p => p.price)) + 
                 Math.min(...prices.slice(-kijunPeriod).map(p => p.price))) / 2;
  const senkouA = (tenkan + kijun) / 2;
  const senkouB = (Math.max(...prices.slice(-senkouBPeriod).map(p => p.price)) + 
                   Math.min(...prices.slice(-senkouBPeriod).map(p => p.price))) / 2;
  
  return { tenkan, kijun, senkouA, senkouB };
}

function calculateAroon(prices: { timestamp: Date; price: number }[], period: number = 14): { up: number; down: number } {
  if (prices.length < period + 1) return { up: 0, down: 0 };
  
  const up = ((period - prices.slice(-period).findIndex(p => p.price === Math.max(...prices.slice(-period).map(p => p.price)))) / period) * 100;
  const down = ((period - prices.slice(-period).findIndex(p => p.price === Math.min(...prices.slice(-period).map(p => p.price)))) / period) * 100;
  
  return { up, down };
}

function calculateATR(prices: { timestamp: Date; price: number }[], period: number = 14): number {
  if (prices.length < period + 1) return 0;
  
  const trueRanges = prices.slice(-period).map((p, i) => {
    const prev = prices[prices.length - period + i - 1];
    return Math.max(
      p.price - prev.price,
      Math.abs(p.price - prev.price),
      prev.price - p.price
    );
  });
  
  return trueRanges.reduce((acc, curr) => acc + curr, 0) / period;
}

function calculateVolumeMetrics(prices: { timestamp: Date; price: number }[]): {
  volume: number;
  volumeSMA: number;
  volumeEMA: number;
} {
  const volume = prices[prices.length - 1].price;
  const volumeSMA = calculateSMA(prices, 20);
  const volumeEMA = calculateEMA(prices, 20);
  
  return { volume, volumeSMA, volumeEMA };
}

function calculateOBV(prices: { timestamp: Date; price: number }[]): number {
  let obv = 0;
  
  for (let i = 1; i < prices.length; i++) {
    if (prices[i].price > prices[i - 1].price) {
      obv += prices[i].price;
    } else if (prices[i].price < prices[i - 1].price) {
      obv -= prices[i].price;
    }
  }
  
  return obv;
}

function calculatePivotPoints(prices: { timestamp: Date; price: number }[]): {
  pivot: number;
  r1: number;
  r2: number;
  s1: number;
  s2: number;
} {
  const high = Math.max(...prices.map(p => p.price));
  const low = Math.min(...prices.map(p => p.price));
  const close = prices[prices.length - 1].price;
  
  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const r2 = pivot + (high - low);
  const s1 = 2 * pivot - high;
  const s2 = pivot - (high - low);
  
  return { pivot, r1, r2, s1, s2 };
}

function calculateFibonacciRetracement(prices: { timestamp: Date; price: number }[]): {
  level0: number;
  level236: number;
  level382: number;
  level500: number;
  level618: number;
  level100: number;
} {
  const high = Math.max(...prices.map(p => p.price));
  const low = Math.min(...prices.map(p => p.price));
  const diff = high - low;
  
  return {
    level0: low,
    level236: low + diff * 0.236,
    level382: low + diff * 0.382,
    level500: low + diff * 0.500,
    level618: low + diff * 0.618,
    level100: high
  };
}

function calculateBollingerBands(prices: { timestamp: Date; price: number }[], period: number = 20): { upper: number; middle: number; lower: number } {
  if (prices.length < period) return { upper: 0, middle: 0, lower: 0 };
  
  const sma = calculateSMA(prices, period);
  const squaredDiffs = prices.slice(-period).map(price => Math.pow(price.price - sma, 2));
  const standardDeviation = Math.sqrt(squaredDiffs.reduce((acc, curr) => acc + curr, 0) / period);
  
  return {
    upper: sma + (2 * standardDeviation),
    middle: sma,
    lower: sma - (2 * standardDeviation)
  };
}

function calculateSupportResistance(prices: { timestamp: Date; price: number }[]): { support: number[]; resistance: number[] } {
  const pricePoints = prices.map(p => p.price);
  const sortedPrices = [...pricePoints].sort((a, b) => a - b);
  
  // Simple support/resistance calculation using price clusters
  const support = sortedPrices.slice(0, 3);
  const resistance = sortedPrices.slice(-3).reverse();
  
  return { support, resistance };
}

function calculateMarketSentiment(
  prices: { timestamp: Date; price: number }[], 
  rsi: number, 
  bollingerBands: { upper: number; middle: number; lower: number }
): { trend: string; strength: number; confidence: number } {
  const currentPrice = prices[prices.length - 1].price;
  const sma20 = calculateSMA(prices, 20);
  const sma50 = calculateSMA(prices, 50);
  
  // Determine trend
  let trend = 'neutral';
  if (currentPrice > sma20 && sma20 > sma50) trend = 'bullish';
  else if (currentPrice < sma20 && sma20 < sma50) trend = 'bearish';
  
  // Calculate trend strength (-100 to 100)
  const priceChange = ((currentPrice - prices[prices.length - 2].price) / prices[prices.length - 2].price) * 100;
  const strength = Math.min(Math.max(priceChange * 10, -100), 100);
  
  // Calculate confidence (0 to 100)
  let confidence = 50;
  
  // Adjust confidence based on RSI
  if (rsi > 70) confidence += 20;
  else if (rsi < 30) confidence -= 20;
  
  // Adjust confidence based on Bollinger Bands
  if (currentPrice > bollingerBands.upper) confidence += 15;
  else if (currentPrice < bollingerBands.lower) confidence -= 15;
  
  // Ensure confidence stays within bounds
  confidence = Math.min(Math.max(confidence, 0), 100);
  
  return { trend, strength, confidence };
}

function getEndpointFromIntent(intent: string): string {
  const endpointMap: Record<string, string> = {
    get_transactions: 'v2.0/account/transactions',
    get_token_holdings: 'v2.0/account/token-accounts',
    get_account_details: 'v2.0/account/detail',
    get_token_holders: 'v2.0/token/holders',
    get_defi_activities: 'v2.0/account/defi-activities'
  };
  return endpointMap[intent] || 'v2.0/account/detail';
}

function mapQueryToParams(query: any): Record<string, any> {
  const params: Record<string, any> = {
    page: 1,
    page_size: query.limit || 10,
    hide_zero: 'true'
  };

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

  return params;
}
