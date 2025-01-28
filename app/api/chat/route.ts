import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText, tool } from "ai";
import { retrieveContext } from '@/utils/retrieval';
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
  getTopHolders
 } from '@/utils/agent-tools';


export async function POST(req: Request) {
  const { messages, user, agentId } = await req.json();
  // Get the latest user message
  const latestMessage = messages[messages.length - 1];

  // Fetch both context and agent configuration in parallel
  const [context, agentConfig] = await Promise.all([
    retrieveContext(latestMessage.content, agentId),
    getAgentConfig(user.id, agentId)
  ]);

  // Format context for the prompt
  const contextText = context
    .map(item => `Relevant context from ${item.source}:\n${item.text}`)
    .join('\n\n');   


  const systemPrompt = `

## User Information (the user that's interacting with the agent):
- User's ID: ${user.id}
- User's Email: ${user.email || 'N/A'}
- User's Wallet: ${user.wallet.address || 'N/A'}

## Agent Information (the agent that's answering the user's query):
- Agent's ID: ${agentConfig.id}
- Agent's Name: ${agentConfig.name}
- Agent's Description: ${agentConfig.description}
- Agent's Wallet: ${agentConfig.wallets?.solana || 'N/A'}

## Agent's Solana Wallet Address:
${agentConfig.wallets?.solana || 'N/A'}

## Agent's Solana Wallet Address Exception Handling:
If you're asked to do anything with the agents wallet but it is not undefined, please let the user know that the agent's wallet is not created and they should created it to proceed. They can create one for the agent in the wallet tab of the agent settings.

## Chatbot Tool Special Instructions:
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

Remember to use this context when relevant to answer the user's query.`


  const result = await streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages: convertToCoreMessages(messages),
    tools: {

      getContractAddress: { 
        description: "Get the contract address of a token by name or symbol. Always tell the user they will beed to click the result to get more information about the token.",
        parameters: z.object({ token: z.string() }),
        execute: async ({ token }) => {
          const response = await searchTokens(token);
          return response;
        },
      },

      getUserSolanaBalance: {
        description: "show the user's solana balance for their connected wallet to the user",
        parameters: z.object({ user: z.string() }),
        execute: async ({}: { user: string }) => {
          // fetch the balance from the Solana blockchain
          if (user.wallet.address && process.env.HELIUS_API_KEY) {
            const balance = await getSolanaBalance(user.wallet.address, process.env.HELIUS_API_KEY);
            return {balance, address: user.wallet.address};
          } else {
            throw new Error('User wallet address or Helius API key is missing');
          }
        },
      },

      getAgentSolanaBalance: {
        description: "show the agents's solana balance for their embedded wallet to the user",
        parameters: z.object({ agent: z.string() }),
        execute: async ({}: { agent: string }) => {
          // fetch the balance from the Solana blockchain
          if (agentConfig.wallets.solana && process.env.HELIUS_API_KEY) {
            const balance = await getSolanaBalance(agentConfig.wallets.solana, process.env.HELIUS_API_KEY);
            return {balance, address: agentConfig.wallets.solana};
          } else {
            throw new Error('Agent wallet address or Helius API key is missing');
          }
          
        },
      },

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
        description: "show the user's token holdings for their connected wallet to the user",
        parameters: z.object({ userDetails: z.string() }),
        execute: async ({}: { userDetails: string }) => {
          const data = await getPortfolioValue(user.wallet.address);
          if (typeof data === 'object' && 'holdings' in data) {
            return data.holdings;
          } else {
            throw new Error("No holdings data available");
          }
        }
      },

      getAgentTokenHoldings: {
        description: "show the agents token holdings for their embedded wallet to the user",
        parameters: z.object({ agentDetails: z.string() }),
        execute: async ({}: { agentDetails: string }) => {
          const data = await getPortfolioValue(agentConfig.wallets.solana);
          if (typeof data === 'object' && 'holdings' in data) {
            return data.holdings;
          } else {
            throw new Error("No holdings data available");
          }
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
        description: "Get detailed information about a specific Solana token using its contract address. Always ask for the contract address before using this tool. Ask for confirmation to search for the token.",
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
      
      searchTokens: {
        description: "Search for cryptocurrencies by name or symbol. The user caan click the result to get more information about the token.",
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

      // analyzeSolanaTokenHolders: {
      //   description: "Analyze new Solana tokens (created in last 36 hours) that share holders with specified tokens",
      //   parameters: z.object({ tokenAddresses: z.array(z.string()) }),
      //   execute: async ({ tokenAddresses }) => {
      //     const response = await getSolanaTokenHolders(tokenAddresses);
      //     return response;
      //   }
      // }      

      getTopHolders: {
        description: "Get the top holders of a Solana token by contract address. The user caan click the result to get more information about the holder.",
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
