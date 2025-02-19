import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText, tool } from "ai";
import { retrieveContext, retrieveCoins, retrieveCoinsWithFilters, retrieveTrendingCoins, retrieveNfts, retrieveTrendingSolanaTokens, retrieveDexScreenerTokens } from '@/utils/retrieval';
import { z } from 'zod';
import { getSolanaBalance } from '@/utils/solana';
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
  getTokenHoldings
 } from '@/utils/agent-tools';
import { getAccountDetails } from '@/utils/solscan';
import { checkSubscriptionStatus } from '@/utils/subscriptions';

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
  console.log(metricsArray)
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
      description: "Search and retrieve information about recent cryptocurrencies. Filter by time ranges, market cap, and more.",
      parameters: z.object({ 
        query: z.string().describe('Search query for finding recent cryptocurrencies'),
        filters: z.object({
          minPrice: z.number().optional(),
          maxPrice: z.number().optional(),
          categories: z.array(z.string()).optional(),
          // nameContains: z.string().optional(),
          marketCap: z.object({
            min: z.number().optional(),
            max: z.number().optional()
          }).optional(),
          timeRange: z.object({
            hours: z.number().optional(),
            days: z.number().optional()
          }).optional()
        }).optional()
      }),
      execute: async ({ query, filters }: { query: string; filters?: { minPrice?: number; maxPrice?: number; categories?: string[]; nameContains?: string; marketCap?: { min?: number; max?: number }; timeRange?: { hours?: number; days?: number } } }) => {
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
  
    swap: {
      description: "execute the swap. the fromToken, toToken, amount, slippage are passed in but the user does supply those. they just supply the names and the amount",
      parameters: z.object({
        fromToken: z.string().describe('Input token object or contract address'),
        toToken: z.string().describe('Output token object or contract address'),
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
    }
      
  }

  // Define tool sets for different user tiers
  const freeTools = {
    // Basic tools available to free users
    getUserPortfolioValue: allTools.getUserPortfolioValue,
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
  };

  const proTools = {
    // All tools available to paid users
    ...freeTools,
    getAgentPortfolioValue: allTools.getAgentPortfolioValue,
    getAgentTokenHoldings: allTools.getAgentTokenHoldings,
  };


    // Check user's subscription status
    const subscriptionStatus = await checkSubscriptionStatus(user.id);
    const { isSubscribed, subscriptionType } = subscriptionStatus;
  
    // Select appropriate tool set based on subscription type
    let availableTools;
    switch (subscriptionType) {
      case 'stripe':
        availableTools = proTools;
        break;
      case 'token':
        availableTools = proTools;
        break;
      default:
        availableTools = freeTools;
    }

// Format context for the prompt
const contextText = context
.map(item => `Relevant context from ${item.source}:\n${item.text}`)
.join('\n\n');   


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

## Agent's Solana Wallet Address:
${agentConfig.wallets?.solana || 'N/A'}

${!isSubscribed ? `
## Free User Limitations
You are interacting with a free tier user. Some advanced features are not available. 
If the user requests functionality that requires a paid subscription, inform them that 
this feature is only available to paid users and direct them to upgrade their subscription.
Free tools available to the user include:
${Object.values(freeTools).map(tool => `- ${tool.description}`).join('\n')}
` : `
## Subscription Status
Pro tools available to the user include:
${Object.values(proTools).map(tool => `- ${tool.description}`).join('\n')}
`}

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

# Relevant Context for This Query:
${contextText}

${agentConfig.userId === 'template' ? `
 If the users runs the Get Agent Portfolio tool (getAgentPortfolioValue), tell them this is a template agent and does not have a wallet. 
 Template agents do no have access to wallets and therefore cannot execute swaps. If they run the swap tool, tell them template agents cannot execute swaps and to create a new agent, fund the agent wallet to use this functionality.
`: ''}

# Chatbot Tool Special Instructions:
When ever the user asks for information about their wallet you should ask what type of info they want. Token info, portfolio value, or detailed information including defi activities.
Dont add links to markdown. 
If you need a contract address to run another tool or query, ask the user to first click into the search result to get the contract address.
When your listing token holdings do not add the token image to the list.
You only have token data on for the Solana blockchain. If the user asks for token data on another blockchain, let them know that you only have data for Solana tokens.
When you're replying to the user and the reponses in not a tool, do not add images to the response.
When generating numbered lists make sure to format it correctly. Make sure the number and the result are on the same line. Also make sure that items do not use numbers. 
Only when using the getTopNfts tool, show the image of the NFT.
When using the swap tool, make sure to only say the swap has been submitted and to check the results above. you can mention the details of the swap. If the user doesn't specifiy a slippage, use the default of 1.0. Always ask to confirm the swap before executing it.
When the users asks to get recent tokens ask them if thy'd like to get recent tokens on DexScreener, or recent coins listed on CoinGecko.
If the user asks to see trending tokens, ask them if they'd like to see trending tokens on Solscan or trending tokens on CoinGecko.
If the user wants to search for a token ask them if they'd like to search for a token listed on CoinGecko or recent tokens on DexScreener. If they say CoinGecko use the searchTokens tool. If they DexScreener use the getRecentDexScreenerTokens tool.
Remember to use both the general context and cryptocurrency data when relevant to answer the user's query.`;

  const result = await streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages: convertToCoreMessages(messages),
    // async onFinish({ response }) {
    // },    
    tools: availableTools 
  });


  return result.toDataStreamResponse();
}
