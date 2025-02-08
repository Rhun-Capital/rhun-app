import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText, tool } from "ai";
import { retrieveContext, retrieveCoins, retrieveCoinsWithFilters } from '@/utils/retrieval';
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

export async function POST(req: Request) {
  const { messages, user, agent } = await req.json();
  // Get the latest user message
  const latestMessage = messages[messages.length - 1];

  // Fetch context, agent configuration, and coin data in parallel
  const [context, agentConfig, coins] = await Promise.all([
    retrieveContext(latestMessage.content, agent.id),
    getAgentConfig(agent.userId, agent.id),
    retrieveCoins(latestMessage.content) // Add semantic search based on user's message
  ]);

  // Format context for the prompt
  const contextText = context
    .map(item => `Relevant context from ${item.source}:\n${item.text}`)
    .join('\n\n');   

  // Format coin data for the prompt
  const coinContext = coins.length > 0 ? `
    ## Recent Cryptocurrency Data:
    ${coins.slice(0, 5).map(coin => `
    - Name: ${coin.name} (${coin.symbol})
      Price: $${coin.current_price_usd?.toFixed(2) || 'N/A'}
      Market Cap: $${coin.market_cap_usd?.toLocaleString() || 'N/A'}
      Categories: ${coin.categories?.join(', ') || 'N/A'}
    `).join('\n')}
    ` : '';    

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

## Agent's Solana Wallet Address Exception Handling:
If you're asked to do anything with the agents wallet but it is not available, please let the user know that the agent's wallet is not created and they should created it to proceed. They can create one for the agent in the wallet tab of the agent settings.

## Chatbot Tool Special Instructions:
When ever the user asks for information about their wallet you should ask what type of info they want. Token info, portfolio value, or detailed information including defi activities.
Dont add links to markdown. 
If you need a contract address to run another tool or query, ask the user to first click into the search result to get the contract address.
When your listing token holdings do not add the token image to the list.
You only have token data on for the Solana blockchain. If the user asks for token data on another blockchain, let them know that you only have data for Solana tokens.
When you're replying to the user and the reponses in not a tool, do not add images to the response.
When generating numbered lists make sure to format it correctly. Make sure the number and the result are on the same line. Also make sure that items do not use numbers. 

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

${coinContext}


Remember to use both the general context and cryptocurrency data when relevant to answer the user's query.`;


  const result = await streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages: convertToCoreMessages(messages),
    // async onFinish({ response }) {
    // },    
    tools: { 



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
        // const totalChange24h = data.holdings.reduce(
        //   (sum: number, token: TokenHolding) =>
        //     sum + (token.usdValue * token.priceChange24h) / 100,
        //   0
        // );
        return {
          totalValue,
          // totalChange24h, // confirm these work
          // changePercentage24h: (totalChange24h / totalValue) * 100,
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
        // const totalChange24h = data.holdings.reduce(
        //   (sum: number, token: TokenHolding) =>
        //     sum + (token.usdValue * token.priceChange24h) / 100,
        //   0
        // );
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
        execute: async ({ contractAddress }) => {
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
      

      getRecentlyLaunchedCoins: {
        description: "Search and retrieve information about recent cryptocurrencies. Filter by time ranges, market cap, and more.",
        parameters: z.object({ 
          query: z.string().describe('Search query for finding recent cryptocurrencies'),
          filters: z.object({
            minPrice: z.number().optional(),
            maxPrice: z.number().optional(),
            categories: z.array(z.string()).optional(),
            nameContains: z.string().optional(),
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
        execute: async ({ query, filters }) => {
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
        execute: async ({ query }) => {
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
        execute: async ({ tokenNameOrSymbol }) => {
          const response = await searchTokens(tokenNameOrSymbol);
          return response;
        },
      },

      getAccountDetails: {
        description: "Get detailed information and activity about a Solana account (wallet) using its address",
        parameters: z.object({ 
          address: z.string().describe('The Solana account address to look up')
        }),
        execute: async ({ address }) => {
          const response = await getAccountDetails(address);
          return response;
        },
      },           

      // analyzeSolanaTokenHolders: {
      //   description: "Analyze new Solana tokens (created in last 36 hours) that share holders with specified tokens",
      //   parameters: z.object({ tokenAddresses: z.array(z.string()) }),
      //   execute: async ({ tokenAddresses }) => {
      //     const response = await getSolanaTokenHolders(tokenAddresses);
      //     return response;
      //   }
      // }      

      getTopHolders: {
        description: "Get the top holders of a Solana token by contract address.",
        parameters: z.object({ address: z.string().describe('The address of the token to get top holders for') }),
        execute: async ({ address }) => {
          const holders = await getTopHolders(address);
          return holders;
        }
      },

      // swap: {
      //   description: "Get a Solana token swap quote using Jupiter and execute the swap",
      //   parameters: z.object({
      //     inputMint: z.string().describe('Input token mint address'),
      //     outputMint: z.string().describe('Output token mint address'),
      //     amount: z.string().describe('Amount to swap in lamports/smallest decimal unit')
      //   }),
      //   execute: async ({ inputMint, outputMint, amount }) => {
      //     // const tokenInfo = await getTokenInfo(outputMint);
      //     // const decimals = tokenInfo.onchain.attributes.decimals
      //     // const response = await swapTokens(inputMint, outputMint, amount);
      //     // add decimal conversion to response
      //     // response.displayAmount = Number(response.outAmount) / Math.pow(10, decimals);
      //     // return response;
      //     return []
            
      //   },
      // },


      
    },    
  });


  return result.toDataStreamResponse();
}
