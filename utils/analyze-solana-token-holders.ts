// // todo rename to analyze trneding tkes 

// import { ConfigurationServicePlaceholders } from "aws-sdk/lib/config_service_placeholders";

// // utils/analyzeSolanaTokenHolders.ts
// interface SolscanToken {
//   address: string;
//   decimals: number;
//   name: string;
//   symbol: string;
//   market_cap: number;
//   price: number;
//   price_24h_change: number;
//   created_time: number;
// }

// interface TokenHolderAnalysis {
//   address: string;
//   symbol: string;
//   name: string;
//   holders: number;
//   overlappingHolders: {
//     token: string;
//     count: number;
//     percentage: number;
//   }[];
//   price: number;
//   marketCap: number;
//   priceChange24h: number;
//   createdAt: Date;
// }

// async function getRecentTokens(limit: number = 10): Promise<SolscanToken[]> {
//   const response = await fetch('https://pro-api.solscan.io/v2.0/token/trending?' + new URLSearchParams({
//     limit: limit.toString()
//   }), {
//     method: 'GET',
//     headers: {
//       'token': process.env.SOLSCAN_API_KEY || ''
//     }
//   });

//   if (!response.ok) {
//     throw new Error('Failed to fetch trending tokens');
//   }

//   const result = await response.json();
//   if (!result.success) {
//     throw new Error('Failed to get trending tokens from Solscan');
//   }

//   return result.data.map((token: any) => ({
//     address: token.address,
//     decimals: token.decimals,
//     name: token.name,
//     symbol: token.symbol,
//   }));
// }

// async function getTokenHolders(address: string): Promise<number> {
//   const response = await fetch('https://pro-api.solscan.io/v2.0/token/holders?' + new URLSearchParams({
//     address: address,
//     page: '1',
//     page_size: '40',
//     from_amount: '4000000000'
//   }), {
//     headers: {
//       'token': process.env.SOLSCAN_API_KEY || ''
//     }
//   });

//   if (!response.ok) {
//     throw new Error('Failed to fetch token holders');
//   }

//   const data = await response.json();
//   if (!data.success) {
//     throw new Error('Failed to get holder data from Solscan');
//   }

//   return data.data.total || 0;
// }

// async function getHolderList(address: string): Promise<string[]> {
//   const holders: string[] = [];
//   let page = 1;
//   const page_size = 40;
//   let hasMore = true;
//   const fromAmount = 400000000;

//   while (hasMore) {
//     const response = await fetch('https://pro-api.solscan.io/v2.0/token/holders?' + new URLSearchParams({
//       address: address,
//       page: page.toString(),
//       page_size: page_size.toString(),
//       from_amount: fromAmount.toString()
//     }), {
//       headers: {
//         'token': process.env.SOLSCAN_API_KEY || ''
//       }
//     });

//     console.log(response, 'response')

//     if (!response.ok) {
//       throw new Error('Failed to fetch holder list');
//     }

//     const result = await response.json();
//     if (!result.success) {
//       throw new Error('Failed to get holder list from Solscan');
//     }

//     const holderData = result.data.items || [];
//     holders.push(...holderData.map((holder: any) => holder.owner));

//     // Check if we have more pages
//     hasMore = holderData.length === page_size && page * page_size < result.data.total;
//     page += 1;

//     // Add delay to respect rate limits
//     await new Promise(resolve => setTimeout(resolve, 2000));
//   }

//   return holders;
// }

// // this likely would beed to be behind a queue and update a database with it's findings
// async function analyzeHolderOverlap(
//   newToken: string,
//   comparisonTokens: string[]
// ): Promise<Array<{ token: string; count: number; percentage: number }>> {
//   const bigTokenHolders = new Set(await getHolderList(newToken));
//   const totalHolders = bigTokenHolders.size;
//   console.log(totalHolders, 'totalHolders')

//   // const overlaps = await Promise.all(
//   //   comparisonTokens.map(async (compareToken) => {
//   //     const compareHolders = new Set(await getHolderList(compareToken));
//   //     const overlapping = new Set(
//   //       [...bigTokenHolders].filter(x => compareHolders.has(x))
//   //     );

//   //     return {
//   //       token: compareToken,
//   //       count: overlapping.size,
//   //       percentage: (overlapping.size / totalHolders) * 100
//   //     };
//   //   })
//   // );

//   // return overlaps;
// }

// export async function analyzeSolanaTokenHolders(
//   tokenAddresses: string[]
// ): Promise<TokenHolderAnalysis[]> {
//   try {
//     // Validate input addresses
//     if (!tokenAddresses.every(addr => addr.length === 44 || addr.length === 43)) {
//       throw new Error('Invalid Solana address format');
//     }

//     // Get trending tokens
//     const trendingTokens = await getRecentTokens(10);
//     console.log(trendingTokens, 'trendingTokens')
    
//     // Get holder counts
//     const tokensWithHolders = await Promise.all(
//       trendingTokens.map(async (token) => ({
//         ...token,
//         holders: await getTokenHolders(token.address)
//       }))
//     );

//     console.log(tokensWithHolders, 'tokensWithHolders')

//     // Filter for significant tokens based on holders over 1000
//     const significantTokens = tokensWithHolders.filter(token => 
//       token.holders > 1000
//     );

//     console.log(significantTokens, 'significantTokens')

//     console.log(significantTokens.length, 'significantTokens.length')

//     // Analyze each significant token
//     // const analyses = await Promise.all(
//     //   significantTokens.map(async (token) => {
//     //     const overlap = await analyzeHolderOverlap(token.address, tokenAddresses);
//     //     console.log(overlap)

//     //     return {
//     //       address: token.address,
//     //       symbol: token.symbol,
//     //       name: token.name,
//     //       holders: token.holders,
//     //       overlappingHolders: overlap,
//     //       price: token.price,
//     //       marketCap: token.market_cap,
//     //       priceChange24h: token.price_24h_change,
//     //       createdAt: new Date(token.created_time * 1000)
//     //     };
//     //   })
//     // );

//     // return analyses;
//     return [];

//   } catch (error) {
//     console.error('Error analyzing Solana token holders:', error);
//     throw error;
//   }
// }

// // Export the tool configuration
// export const analyzeSolanaTokenHoldersTool = {
//   name: 'analyzeSolanaTokenHolders',
//   description: 'Analyze trending Solana tokens that share holders with specified tokens',
//   parameters: {
//     type: 'object',
//     properties: {
//       tokenAddresses: {
//         type: 'array',
//         description: 'Array of Solana token mint addresses to compare against',
//         items: {
//           type: 'string',
//           pattern: '^[1-9A-HJ-NP-Za-km-z]{43,44}$' // Solana address format
//         }
//       }
//     },
//     required: ['tokenAddresses']
//   }
// };