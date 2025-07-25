import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { retrieveContext, retrieveCoins, retrieveCoinsWithFilters, retrieveTrendingCoins, retrieveNfts, retrieveTrendingSolanaTokens, retrieveCryptoNews } from '@/utils/retrieval';
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
  getFredSeries,
  searchFredSeries
 } from '@/utils/agent-tools';
import { getAccountDetails } from '@/utils/solscan';
import { createTask, getTaskStatus, getTaskDetails, waitForTaskCompletion } from '@/utils/browser-use';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateStochRSI, calculateCCI, calculateMFI, calculateADX, calculateDMI, calculateIchimoku, calculateAroon, calculateATR, calculateVolumeMetrics, calculateOBV, calculatePivotPoints, calculateFibonacciRetracement, calculateBollingerBands, calculateSupportResistance, calculateMarketSentiment } from '@/utils/technical-analysis';
import { getPairsByTokenAddresses, getLatestBoostedTokens, getLatestTokenProfiles } from '@/utils/dexscreener';
import { calculateInvestorMetrics } from '@/utils/investorMetrics';

export const runtime = 'nodejs';

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

interface TwitterUser {
  id: string;
  username: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

interface EnhancedTweet extends TwitterTweet {
  engagement_rate: number;
  viral_score: number;
  discussion_ratio: number;
  influence_weight: number;
  author?: TwitterUser;
}

const calculateSentimentMetrics = (tweets: TwitterTweet[], users: TwitterUser[]): EnhancedTweet[] => {
  // Create a map of user data for quick lookup
  const userMap = new Map(users.map(user => [user.id, user]));
  
  return tweets.map(tweet => {
    const author = userMap.get(tweet.author_id);
    const metrics = tweet.public_metrics || { like_count: 0, retweet_count: 0, reply_count: 0 };
    const authorMetrics = author?.public_metrics || { followers_count: 1 };
    
    // Calculate metrics with safe fallbacks
    const engagement_rate = (metrics.like_count + metrics.retweet_count + metrics.reply_count) / 
                          Math.max(authorMetrics.followers_count, 1);
    
    const viral_score = metrics.retweet_count / Math.max(metrics.like_count, 1);
    
    const discussion_ratio = metrics.reply_count / 
                           (metrics.like_count + metrics.retweet_count + 1);
    
    const influence_weight = Math.log(Math.max(authorMetrics.followers_count, 1) + 1);
    
    return {
      ...tweet,
      author,
      engagement_rate: Number(engagement_rate.toFixed(6)),
      viral_score: Number(viral_score.toFixed(3)),
      discussion_ratio: Number(discussion_ratio.toFixed(3)),
      influence_weight: Number(influence_weight.toFixed(2))
    };
  });
};

export async function POST(req: Request) {
  const { messages, user, agent, templateWallet } = await req.json();

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
        const data = await getPortfolioValue(templateWallet);
  
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
        const data = await getTokenHoldings(templateWallet);
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

    fredSearch: {
      description: "Search for economic data series from FRED (Federal Reserve Economic Data)",
      parameters: z.object({
        query: z.string().describe('The search query for finding economic data series')
      }),
      execute: async ({ query }: { query: string }) => {
        const results = await searchFredSeries(query);
        console.log(results);
        return results;
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
      execute: async ({ fromToken, toToken, amount, slippage = 1.0 }) => {
        console.log('Executing swap with params:', { fromToken, toToken, amount, slippage });
        return {
          fromToken,
          toToken,
          amount,
          slippage,
          status: 'pending'
        };
      },
    },

    getRecentDexScreenerTokens: {
      description: "Get recent tokens from DexScreener",
      parameters: z.object({
        chainId: z.string().describe('The chain ID to search for tokens on').default('solana'),
      }),
      execute: async () => {
        const response = await getLatestBoostedTokens();
        const tokenProfiles = await getLatestTokenProfiles();
        // looper ove rthe response and run getPairsByTokenAddresses
        let tokenAddreses = ""
        response.map((token) => {
          tokenAddreses += token.tokenAddress + ",";
        })
        tokenProfiles.map((token) => {
          tokenAddreses += token.tokenAddress + ",";
        })
        let pairs = await getPairsByTokenAddresses('solana', tokenAddreses);
        console.log(pairs);
        return pairs;
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
      execute: async ({ query, maxResults = 10 }) => {
        try {
          // CoinDesk News API endpoint - correct endpoint as per documentation
          const apiUrl = 'https://data-api.coindesk.com/news/v1/search';
          
          // Build the request parameters - according to the API documentation
          const params = new URLSearchParams({
            search_string: query,
            limit: maxResults.toString(),
            source_key: 'coindesk',
            lang: 'EN'
          });
          
          // Make the API request
          const newsResponse = await fetch(`${apiUrl}?${params.toString()}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (!newsResponse.ok) {
            throw new Error(`CoinDesk API error: ${newsResponse.status} ${newsResponse.statusText}`);
          }
          
          const newsData = await newsResponse.json();
          
          // Check if we have results in the expected format
          if (!newsData || !newsData.Data || !Array.isArray(newsData.Data)) {
            return [];
          }
          
          // Format the results for display - mapping according to the API response structure
          return newsData.Data.map((article: any) => {
            // Extract categories safely with multiple fallback options
            let categories: string[] = [];
            
            try {
              if (Array.isArray(article.CATEGORY_DATA)) {
                // First attempt: regular mapping of objects with name property
                categories = article.CATEGORY_DATA
                  .filter((cat: any) => cat && typeof cat === 'object' && cat.name)
                  .map((cat: any) => cat.name);
                
                // If that didn't work, try other potential properties
                if (categories.length === 0 && article.CATEGORY_DATA.length > 0) {
                  // Second attempt: check if categories might be direct strings
                  if (typeof article.CATEGORY_DATA[0] === 'string') {
                    categories = article.CATEGORY_DATA.filter(Boolean);
                  }
                  
                  // Third attempt: check for NAME (uppercase variation)
                  else if (article.CATEGORY_DATA[0] && article.CATEGORY_DATA[0].NAME) {
                    categories = article.CATEGORY_DATA
                      .filter((cat: any) => cat && cat.NAME)
                      .map((cat: any) => cat.NAME);
                  }
                  
                  // Fourth attempt: check for category property
                  else if (article.CATEGORY_DATA[0] && article.CATEGORY_DATA[0].category) {
                    categories = article.CATEGORY_DATA
                      .filter((cat: any) => cat && cat.category)
                      .map((cat: any) => cat.category);
                  }
                }
              }
              
              // Alternative: check KEYWORDS for categories
              if (categories.length === 0 && article.KEYWORDS) {
                if (typeof article.KEYWORDS === 'string') {
                  // Split comma-separated keywords
                  categories = article.KEYWORDS.split(',')
                    .map((k: string) => k.trim())
                    .filter((k: string) => k);
                } else if (Array.isArray(article.KEYWORDS)) {
                  categories = article.KEYWORDS.filter(Boolean);
                }
              }
            } catch (err) {
              console.error('Error processing categories:', err);
            }
            
            return {
              id: article.ID?.toString() || article.GUID || '',
              title: article.TITLE || 'Unknown Title',
              summary: article.BODY ? 
                (article.BODY.length > 150 ? `${article.BODY.substring(0, 150)}...` : article.BODY) 
                : article.SUBTITLE || '',
              full_text: article.BODY || article.SUBTITLE || '',
              url: article.URL || '',
              published_date: article.PUBLISHED_ON ? 
                new Date(article.PUBLISHED_ON * 1000).toISOString() : 
                new Date().toISOString(),
              source: article.SOURCE_DATA?.name || 'CoinDesk',
              sentiment: article.SENTIMENT || "NEUTRAL",
              categories: categories,
              image_url: article.IMAGE_URL || '',
              imageUrl: article.IMAGE_URL || '',
              description: article.BODY ? 
                (article.BODY.length > 150 ? `${article.BODY.substring(0, 150)}...` : article.BODY) 
                : article.SUBTITLE || '',
              content: article.BODY || '',
              publishedAt: article.PUBLISHED_ON ? 
                new Date(article.PUBLISHED_ON * 1000).toISOString() : 
                new Date().toISOString(),
              score: typeof article.SCORE === 'number' ? article.SCORE : 1.0
            };
          });
        } catch (error) {
          console.error('Error fetching crypto news:', error);
          // Return empty array in case of errors
          return [];
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

          // Add detailed logging
          console.log('Raw Market Data:', {
            id: coinId,
            price_change_24h: marketData.market_data?.price_change_percentage_24h,
            price_change_7d: marketData.market_data?.price_change_percentage_7d,
            price_change_30d: marketData.market_data?.price_change_percentage_30d
          });

          // Extract price data
          const prices = data.prices.map(([timestamp, price]: [number, number]) => ({
            timestamp: new Date(timestamp),
            price
          }));

          // Calculate basic price metrics
          const currentPrice = prices[prices.length - 1].price;
          const priceChange24h = marketData.market_data?.price_change_percentage_24h;
          const priceChange7d = marketData.market_data?.price_change_percentage_7d;
          const priceChange30d = marketData.market_data?.price_change_percentage_30d;

          // Log the values we're using for the response
          console.log('Price Change Values for Response:', {
            priceChange24h,
            priceChange7d,
            priceChange30d
          });

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

          // Log the final response object
          const analysisResponse = {
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

          // console.log('Final Technical Analysis Response:', {
          //   symbol: analysisResponse.symbol,
          //   currentPrice: analysisResponse.currentPrice,
          //   priceChange: analysisResponse.priceChange
          // });

          console.log("analysisResponse:::", analysisResponse)

          return analysisResponse;
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

    // searchTweets: {
    //   description: "Search for tweets about a specific cryptocurrency ticker with advanced investor metrics and sentiment analysis",
    //   parameters: z.object({
    //     ticker: z.string().describe('The cryptocurrency ticker to search for (e.g., BONK, SOL)'),
    //     includeReplies: z.boolean().optional().default(false).describe('Whether to include replies in the search results'),
    //     minEngagement: z.string().optional().default('5').describe('Minimum engagement count for tweets')
    //   }),
    //   execute: async ({ ticker, includeReplies = false, minEngagement = '5' }) => {
    //     try {
    //       console.log('Starting Twitter search for ticker:', ticker);
          
    //       // Create the most basic query possible
    //       let query = ticker;
          
    //       // Add basic filters
    //       query += ' -is:retweet lang:en';
    //       if (!includeReplies) {
    //         query += ' -is:reply';
    //       }
          
    //       const encodedQuery = encodeURIComponent(query);
    //       console.log('Using simplified query:', query);
    //       console.log('Encoded search query:', encodedQuery);
          
    //       const tweetFields = [
    //         'created_at',
    //         'author_id', 
    //         'public_metrics',
    //         'context_annotations',
    //         'lang',
    //         'referenced_tweets',
    //         'conversation_id',
    //         'possibly_sensitive'
    //       ].join(',');
          
    //       const userFields = [
    //         'public_metrics',
    //         'verified',
    //         'created_at',
    //         'description',
    //         'name',
    //         'username',
    //         'profile_image_url'
    //       ].join(',');
          
    //       // Build URL with proper encoding
    //       const baseUrl = 'https://api.twitter.com/2/tweets/search/recent';
    //       const params = new URLSearchParams({
    //         'query': query,
    //         'max_results': '100',
    //         'tweet.fields': tweetFields,
    //         'user.fields': userFields,
    //         'expansions': 'author_id',
    //         'sort_order': 'relevancy'
    //       });
          
    //       const url = `${baseUrl}?${params.toString()}`;
    //       console.log('Making Twitter API request to:', url);
          
    //       if (!process.env.TWITTER_BEARER_TOKEN) {
    //         console.error('Twitter Bearer Token is not configured');
    //         throw new Error('Twitter API configuration is missing');
    //       }
          
    //       const response = await fetch(url, {
    //         headers: {
    //           'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
    //         }
    //       });
          
    //       console.log('Twitter API response status:', response.status);
          
    //       if (!response.ok) {
    //         const errorData = await response.json();
    //         console.error('Twitter API error:', { 
    //           status: response.status, 
    //           statusText: response.statusText,
    //           headers: Object.fromEntries(response.headers),
    //           error: errorData 
    //         });
    //         throw new Error(`Twitter API error: ${errorData.detail || errorData.title || response.statusText}`);
    //       }
          
    //       const data = await response.json();
    //       console.log('Twitter API response data structure:', {
    //         hasData: !!data.data,
    //         dataLength: data.data?.length || 0,
    //         hasIncludes: !!data.includes,
    //         includesUsers: data.includes?.users?.length || 0
    //       });
          
    //       // Filter tweets only by engagement threshold
    //       if (data.data && Array.isArray(data.data)) {
    //         console.log('Initial tweets from API:', data.data.length);
            
    //         const minEngagementCount = parseInt(minEngagement, 10);
    //         let engagementFilteredCount = 0;
            
    //         data.data = data.data.filter((tweet: any) => {
    //           const metrics = tweet.public_metrics || {};
    //           const totalEngagement = (metrics.like_count || 0) + 
    //                                 (metrics.retweet_count || 0) + 
    //                                 (metrics.reply_count || 0) + 
    //                                 (metrics.quote_count || 0);
              
    //           if (totalEngagement >= minEngagementCount) {
    //             engagementFilteredCount++;
    //             return true;
    //           }
    //           return false;
    //         });

    //         console.log('Filtering stats:', {
    //           initialCount: data.data.length,
    //           passedEngagementFilter: engagementFilteredCount,
    //           minEngagementRequired: minEngagementCount
    //         });
    //       }
          
    //       // Process and enhance the data with investor metrics
    //       const enhancedData = calculateInvestorMetrics(data);
          
    //       console.log('Enhanced data metrics:', {
    //         totalTweets: enhancedData.aggregate_metrics?.total_tweets,
    //         totalEngagement: enhancedData.aggregate_metrics?.total_engagement,
    //         avgEngagementRate: enhancedData.aggregate_metrics?.avg_engagement_rate
    //       });
          
    //       return {
    //         result: {
    //           success: true,
    //           ...enhancedData
    //         }
    //       };
    //     } catch (error: any) {
    //       console.error('Error in searchTweets:', error);
    //       return {
    //         result: {
    //           success: false,
    //           message: `Error fetching tweets: ${error.message}`,
    //           data: [],
    //           aggregate_metrics: null
    //         }
    //       };
    //     }
    //   }
    // },

    getOfficialTweets: {
      description: "Get tweets from a cryptocurrency's official Twitter account by searching for the coin on CoinGecko first",
      parameters: z.object({
        coinName: z.string().describe('The name of the cryptocurrency (e.g., bitcoin, solana)'),
        maxResults: z.string().optional().default('25').describe('Maximum number of tweets to return')
      }),
      execute: async ({ coinName, maxResults = '25' }) => {
        try {
          // First search for the coin on CoinGecko to get Twitter username
          const searchResponse = await fetch(`https://api.coingecko.com/api/v3/search?query=${coinName}`);
          const searchData = await searchResponse.json();
          if (!searchResponse.ok) {
            throw new Error(`CoinGecko API error: ${searchData.error || 'Failed to search for coin'}`);
          }

          if (!searchData.coins || searchData.coins.length === 0) {
            return {
              result: {
                success: false,
                error: 'Coin not found',
                message: `Could not find any coin matching "${coinName}". Please check the name and try again.`
              }
            };
          }

          // Get the first matching coin
          const coin = searchData.coins[0];
          
          // Get detailed coin data including Twitter username
          const coinResponse = await fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`);
          const coinData = await coinResponse.json();


          
          if (!coinResponse.ok) {
            throw new Error(`CoinGecko API error: ${coinData.error || 'Failed to fetch coin details'}`);
          }

          if (!coinData.links?.twitter_screen_name) {
            return {
              result: {
                success: false,
                error: 'No Twitter account found',
                message: `No official Twitter account found for ${coin.name}.`,
                coinInfo: {
                  name: coin.name,
                  symbol: coin.symbol,
                  market_cap_rank: coin.market_cap_rank
                }
              }
            };
          }

          const twitter_username = coinData.links.twitter_screen_name;

          // Remove @ if provided in the Twitter username
          const cleanUsername = twitter_username.replace('@', '');
          
          // Define API fields
          const tweetFields = [
            'created_at',
            'public_metrics',
            'context_annotations',
            'lang',
            'referenced_tweets',
            'conversation_id',
            'possibly_sensitive'
          ].join(',');
          
          const userFields = [
            'public_metrics',
            'verified',
            'created_at',
            'description',
            'name',
            'profile_image_url'
          ].join(',');

          // First get the user ID
          const userLookupUrl = `https://api.twitter.com/2/users/by/username/${cleanUsername}?user.fields=${userFields}`;
          
          const userResponse = await fetch(userLookupUrl, {
            headers: {
              'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
            }
          });
          
          const userData = await userResponse.json();
          
          if (!userResponse.ok || !userData.data?.id) {
            console.error('Twitter user lookup failed:', userData);
            return {
              result: {
                success: false,
                error: 'Twitter API error',
                message: `Failed to find Twitter user: ${cleanUsername}`
              }
            };
          }
          
          // Now get the tweets using the user ID
          const tweetsUrl = `https://api.twitter.com/2/users/${userData.data.id}/tweets?max_results=${maxResults}&tweet.fields=${tweetFields}&user.fields=${userFields}&expansions=author_id`;
          
          const tweetsResponse = await fetch(tweetsUrl, {
            headers: {
              'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
            }
          });
          
          const twitterData = await tweetsResponse.json();
          
          if (!tweetsResponse.ok) {
            console.error('Twitter tweets lookup failed:', twitterData);
            return {
              result: {
                success: false,
                error: 'Twitter API error',
                message: `Failed to fetch tweets for user: ${cleanUsername}`
              }
            };
          }
          
          // Add user data to each tweet
          const tweets = twitterData.data.map((tweet: any) => ({
            ...tweet,
            author: {
              ...userData.data,
              username: userData.data.username,
              name: userData.data.name,
              verified: userData.data.verified,
              profile_image_url: userData.data.profile_image_url,
              public_metrics: userData.data.public_metrics
            }
          }));
          
          // Process and enhance the data with investor metrics
          const enhancedData = calculateInvestorMetrics({ data: tweets, includes: { users: [userData.data] } });
          
          return {
            result: {
              success: true,
              data: enhancedData.data,
              aggregate_metrics: enhancedData.aggregate_metrics,
              user_info: {
                name: coinData.name,
                symbol: coinData.symbol,
                twitter_username: twitter_username,
                market_cap_rank: coinData.market_cap_rank,
                twitter_metrics: userData.data.public_metrics,
                description: userData.data.description,
                profile_image_url: userData.data.profile_image_url,
                verified: userData.data.verified
              }
            }
          };
        } catch (error: any) {
          console.error('Error in getOfficialTweets:', error);
          return {
            result: {
              success: false,
              error: 'Failed to fetch official tweets',
              message: error.message
            }
          };
        }
      }
    },

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
    getTokenInfo: allTools.getTokenInfo,
    getMarketMovers: allTools.getMarketMovers,
    searchTokens: allTools.searchTokens,
    getTotalCryptoMarketCap: allTools.getTotalCryptoMarketCap,
    getMarketCategories: allTools.getMarketCategories,
    getFearAndGreedIndex: allTools.getFearAndGreedIndex,
    getRecentlyLaunchedCoins: allTools.getRecentlyLaunchedCoins,
    getTopNfts: allTools.getTopNfts,
    swap: allTools.swap,
    // searchTweets: allTools.searchTweets,
    getOfficialTweets: allTools.getOfficialTweets,
    getRecentDexScreenerTokens: allTools.getRecentDexScreenerTokens,
    getCryptoNews: allTools.getCryptoNews,
    webResearch: allTools.webResearch,
    getTradingViewChart: allTools.getTradingViewChart,
    getTechnicalAnalysis: allTools.getTechnicalAnalysis,
    getFredSeries: allTools.getFredSeries,
    fredSearch: allTools.fredSearch
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

## Rhun Capital Agent Specific Instructions
If the agent name is Rhun Capital understand there is also a token called Rhun. So if the user asks about Rhun, you should search for the rhun token and not mention your name or that you're a chat bot.
The contract address for the Rhun token is: Gh8yeA9vH5Fun7J6esFH3mV65cQTBpxk9Z5XpzU7pump

## User Information (the user that's interacting with the agent):
- User's ID: ${user?.id || 'template'}
- User's Email: ${user?.email || 'N/A'}
- User's Primary Wallet: ${user?.wallet?.address || 'N/A'}

## Agent Information (the agent that's answering the user's query):
- Agent's ID: ${agentConfig?.id}
- Agent's Name: ${agentConfig?.name}
- Agent's Description: ${agentConfig?.description}
- Agent's Wallet: ${agentConfig?.wallets?.solana || templateWallet}


## Core Capabilities & Knowledge Domains
${agentConfig?.coreCapabilities}

### Interaction Style
${agentConfig?.interactionStyle}

### Analysis Approach
${agentConfig?.analysisApproach}

### Risk Communication
${agentConfig?.riskCommunication}

## Response Format
${agentConfig?.responseFormat}

## Limitations & Disclaimers
${agentConfig?.limitationsDisclaimers}

## Prohibited Behaviors
${agentConfig?.prohibitedBehaviors}

## Knowledge Updates
${agentConfig?.knowledgeUpdates}

## Response Priority Order
${agentConfig?.responsePriorityOrder}

## Special Instructions
${agentConfig?.specialInstructions}


## Style Guide
${agentConfig?.styleGuide}

# Tool Documentation
${toolsDocumentation}

# Relevant Context for This Query:
${contextText}

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

## Response Format Guidelines
1. After using any tool, ALWAYS analyz the reponse and provide a summary and a recommmend suggested anlysis step. Also Suggest 2-3 relevant follow-up tools from our tool list. 
2. Never use links in your response.
3. Never recommend to view the top holders.
4. Format follow-up suggestions like this:
   \n\n---\n### What would you like to do next?\n
   1. Suggestion 1
   2. Suggestion 2
   3. Suggestion 3\n---\n

## Tool Relationships
When suggesting follow-ups, consider relevant relationships between tools. Use the query to determine which tools to suggest.
Always suggest one FRED tool, one stock analysis tool, and one web research tool.

# Chatbot Tool Special Instructions:
- When a user asks for news, you should AWLAYS use the getCryptoNews tool AND the getOfficialTweets tool.
- When ever the user asks for information about their wallet you should ask what type of info they want. Token info, portfolio value, or detailed information including defi activities.
- If the user uses the swap tool and they have not connected their wallet, ask them to connect their wallet first.
- When using the getTradingViewChart tool do not show images in the response.
- If you need a contract address to run another tool or query, ask the user to first click into the search result to get the contract address.
- When your listing token holdings do not add the token image to the list.
- When generating numbered lists make sure to format it correctly. Make sure the number and the result are on the same line. Also make sure that items do not use numbers. 
- Only when using the getTopNfts tool, show the image of the NFT.
- When using the swap tool, make sure to only say the swap has been submitted and to check the results above. you can mention the details of the swap. If the user doesn't specifiy a slippage, use the default of 1.0. Always ask to confirm the swap before executing it. They only need to confirm the slippage and the execution of the swap, nothign else.
- if the user uses the searchTokens tool, and no results are found tell them they can try searching for the token on CoinGecko or DexScreener which might have different results.
- When a user uses a tool, recommend other tools that they might find useful based on the tool they used.
- Remember to use both the general context and cryptocurrency data when relevant to answer the user's query.`;


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
