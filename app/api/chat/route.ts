import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";
import { retrieveContext } from '@/utils/retrieval';
import { z } from 'zod';
import { getSolanaBalance } from '@/utils/solana';
import { TokenHolding } from "@/types";
// import { getTransactionCount, getTransactionVolume } from '@/utils/network-activity';

async function getAgentConfig(userId: string, agentId: string) {
  // Use absolute URL with the base URL from environment variable
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(`/api/agents/${userId}/${agentId}`, baseUrl).toString();
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch agent configuration');
  }
  return response.json();
}

async function getPortfolioValue(walletAddress: string) {
  if (!walletAddress) {
    return "I don't have a wallet configured yet, you can create by visiting the wallet tab in the agent settings.";
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(`/api/portfolio/${walletAddress}`, baseUrl).toString();
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch portfolio data');
  }
  return response.json();  
}

async function getTokenHoldings(walletAddress: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(`/api/portfolio/${walletAddress}`, baseUrl).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch portfolio data");
  return response.json();
}

async function getFearGreedIndex() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(`/api/tools/market-sentiment/fear-and-greed`, baseUrl).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch market sentiment data");
  return response.json();
}

async function getTransactionVolumeAndCount(timeframe: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(`/api/tools/network-activity/transaction-volume`, baseUrl).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch transaction volume data");
  return response.json();
}

async function getTokenInfo(contractAddress: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(`/api/tools/token-info/${contractAddress}`, baseUrl).toString();
  const response = await fetch(url);
  if (!response.ok) return { error: 'Failed to fetch token information' };
  return response.json();
}

async function getMarketMovers() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(`/api/tools/market-movers`, baseUrl).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch market movers");
  return response.json();
}

async function searchTokens(query: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(`/api/tools/token-search?query=${query}`, baseUrl).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch token search results");
  return response.json();
}

async function getOnchainTokenInfo(address: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(`/api/tools/onchain-token-info?address=${encodeURIComponent(address)}`, baseUrl).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch onchain token info");
  return response.json();
}

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
If you can find a token using getTokenInfo try the onchain token info tool to see if you can get more information about the token and do not show the failed to fetch token information error message to the user.

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

      getUserSolanaBalance: {
        description: "show the user's solana balance for their connected wallet to the user",
        parameters: z.object({ user: z.string() }),
        execute: async ({}: { user: string }) => {
          // fetch the balance from the Solana blockchain
          if (user.wallet.address && process.env.HELIUS_API_KEY) {
            const balance = await getSolanaBalance(user.wallet.address, process.env.HELIUS_API_KEY);
            console.log("User Balance", balance)
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
            console.log("Agent Balance", balance)
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
        const totalValue = data.holdings.reduce(
          (sum: number, token: TokenHolding) => sum + token.usdValue,
          0
        );
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
          console.log("Agent Portfolio Value", data)

         // Calculate portfolio metrics
        const totalValue = data.holdings.reduce(
          (sum: number, token: TokenHolding) => sum + token.usdValue,
          0
        );
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
          const data = await getTokenHoldings(user.wallet.address);
          return data.holdings;
        }
      },

      getAgentTokenHoldings: {
        description: "show the agents token holdings for their embedded wallet to the user",
        parameters: z.object({ agentDetails: z.string() }),
        execute: async ({}: { agentDetails: string }) => {
          const data = await getTokenHoldings(agentConfig.wallets.solana);
          return data.holdings;
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
          console.log("Transaction Volume", response)
          return response;
        },
      },      

      getTokenInfo: {
        description: "Get detailed information about a specific Solana token using its contract address",
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
        description: "Search for cryptocurrencies by name or symbol",
        parameters: z.object({
          query: z.string().describe('The search query for finding tokens')
        }),
        execute: async ({ query }) => {
          const response = await searchTokens(query);
          return response;
        },
      },

      getOnchainTokenInfo: {
        description: "Get detailed information about a onchain Solana token",
        parameters: z.object({
          address: z.string().describe('The Solana token address to fetch information for')
        }),
        execute: async ({ address }) => {
          const response = await getOnchainTokenInfo(address);
          return response;
        },
      },      
      
    },    
  });

  return result.toDataStreamResponse();
}
