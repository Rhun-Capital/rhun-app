// Configuration file for tool display names and descriptions
// Used to provide user-friendly representations of tools in the UI

// Map of tool names to their user-friendly display names
export const toolDisplayNames: { [key: string]: string } = {
  // Portfolio and Balance Tools
  'getUserSolanaBalance': 'Solana Balance',
  'getAgentSolanaBalance': 'Agent Solana Balance',
  'getUserPortfolioValue': 'Portfolio Value',
  'getAgentPortfolioValue': 'Agent Portfolio Value',
  'getUserTokenHoldings': 'Token Holdings',
  
  // Market Data Tools
  'getMarketMovers': 'Market Movers',
  'getTotalCryptoMarketCap': 'Total Crypto Market Cap',
  'getMarketCategories': 'Market Categories',
  'getDerivativesExchanges': 'Derivatives Exchanges',
  'getFearAndGreedIndex': 'Fear & Greed Index',
  'getSolanaTransactionVolume': 'Solana Transaction Volume',
  'getRecentTweets': 'Recent Tweets',
  'searchTweets': 'Recent Tweets',
  'getOfficialTweets': 'Official Tweets',
  
  // Token Tools
  'getTokenInfo': 'Token Information',
  'searchTokens': 'Token Search',
  'getContractAddress': 'Contract Address',
  'getTopHolders': 'Top Token Holders',
  'getRecentlyLaunchedCoins': 'Recently Launched Coins',
  'getTrendingTokens': 'Trending Tokens',
  'getTopNfts': 'Top NFTs',
  'getRecentDexScreenerTokens': 'Recent DEX Tokens',
  
  // Account Tools
  'getAccountDetails': 'Account Details',
  
  // Trading Tools
  'swap': 'Token Swap',
  'getTradingViewChart': 'TradingView Chart',
  'getTechnicalAnalysis': 'Technical Analysis',
  
  // Research Tools
  'getCryptoNews': 'Crypto News',
  'stockAnalysis': 'Stock Analysis',
  'optionsAnalysis': 'Options Analysis',
  'newsAnalysis': 'News Analysis',
  'webResearch': 'Web Research',
  
  // FRED Data Tools
  'getFredSeries': 'Economic Data',
  'fredSearch': 'Economic Data Search'
};

// Tool category mappings for icons
const toolCategories: { [key: string]: string } = {
  // Portfolio and Balance
  'getUserSolanaBalance': 'wallet',
  'getAgentSolanaBalance': 'wallet',
  'getUserPortfolioValue': 'piggyBank',
  'getAgentPortfolioValue': 'piggyBank',
  'getUserTokenHoldings': 'coins',
  'getAgentTokenHoldings': 'coins',
  
  // Market Data
  'getMarketMovers': 'trendingUp',
  'getTotalCryptoMarketCap': 'pieChart',
  'getMarketCategories': 'layers',
  'getDerivativesExchanges': 'building',
  'getFearAndGreedIndex': 'gauge',
  'getSolanaTransactionVolume': 'activity',
  'getRecentTweets': 'messageCircle',
  
  // Token Tools
  'getTokenInfo': 'info',
  'searchTokens': 'search',
  'getContractAddress': 'file',
  'getTopHolders': 'users',
  'getRecentlyLaunchedCoins': 'rocket',
  'getTrendingTokens': 'flame',
  'getTopNfts': 'image',
  'getRecentDexScreenerTokens': 'list',
  
  // Account Tools
  'getAccountDetails': 'user',
  
  // Trading Tools
  'swap': 'arrowLeftRight',
  'getTradingViewChart': 'lineChart',
  'getTechnicalAnalysis': 'barChart',
  
  // Research Tools
  'getCryptoNews': 'newspaper',
  'stockAnalysis': 'barChart2',
  'optionsAnalysis': 'percent',
  'newsAnalysis': 'fileText',
  'webResearch': 'globe',
  
  // FRED Data Tools
  'getFredSeries': 'database',
  'fredSearch': 'databaseSearch'
};

// Get the icon name for a tool
export function getToolIcon(toolName: string): string {
  return toolCategories[toolName] || 'tool';
}

// Function to generate a user-friendly description based on tool arguments
export function generateToolDescription(toolName: string, args: any): string {
  if (!args) return '';
  
  switch(toolName) {
    case 'getUserSolanaBalance':
    case 'getAgentSolanaBalance':
      return 'Checking SOL balance';
      
    case 'getUserPortfolioValue':
    case 'getAgentPortfolioValue':
      return 'Analyzing portfolio value';
      
    case 'getUserTokenHoldings':
    case 'getAgentTokenHoldings':
      return 'Listing token holdings';
      
    case 'getMarketMovers':
      const timeframe = args.timeframe || '24h';
      return `Top market ${args.type || 'gainers'} in the last ${timeframe}`;
      
    case 'getTotalCryptoMarketCap':
      return 'Tracking global crypto market capitalization';
      
    case 'getMarketCategories':
      return 'Analyzing crypto market categories';
      
    case 'getDerivativesExchanges':
      return 'Comparing derivatives exchanges';
      
    case 'getFearAndGreedIndex':
      return 'Measuring market sentiment';
      
    case 'getSolanaTransactionVolume':
      return `Analyzing Solana network activity`;
      
    case 'getTokenInfo':
      if (args.address) return `Analyzing token: ${args.address.substring(0, 8)}...`;
      if (args.symbol) return `Analyzing token: ${args.symbol.toUpperCase()}`;
      return 'Retrieving token information';
      
    case 'searchTokens':
      return `Searching for: ${args.query || 'tokens'}`;
      
    case 'getContractAddress':
      return `Finding contract for: ${args.symbol || args.name || 'token'}`;
      
    case 'getTopHolders':
      if (args.address) return `Finding top holders of: ${args.address.substring(0, 8)}...`;
      return 'Analyzing token distribution';
      
    case 'getRecentlyLaunchedCoins':
      return 'Discovering recent token launches';
      
    case 'getTrendingTokens':
      if (args.chain) return `Trending tokens on ${args.chain}`;
      return 'Finding trending tokens';
      
    case 'getTopNfts':
      return 'Analyzing top NFT collections';
      
    case 'getRecentDexScreenerTokens':
      if (args.chain) return `New tokens on ${args.chain}`;
      return 'Finding recently listed tokens';
      
    case 'getAccountDetails':
      if (args.address) return `Analyzing account: ${args.address.substring(0, 8)}...`;
      return 'Retrieving account information';
      
    case 'swap':
      if (args.inputMint && args.outputMint) {
        return `Swapping tokens`;
      }
      return 'Preparing token swap';
      
    case 'getTradingViewChart':
      if (args.symbol) return `${args.symbol.toUpperCase()} price chart`;
      return 'Loading price chart';
      
    case 'getTechnicalAnalysis':
      if (args.symbol) return `${args.symbol.toUpperCase()} technical analysis`;
      return 'Technical analysis';
      
    case 'getCryptoNews':
      if (args.query) return `News about: ${args.query}`;
      return 'Latest crypto news';
      
    case 'stockAnalysis':
      if (args.ticker) return `Analysis of ${args.ticker.toUpperCase()}`;
      return 'Stock market analysis';
      
    case 'optionsAnalysis':
      if (args.ticker) return `${args.ticker.toUpperCase()} options analysis`;
      return 'Options market analysis';
      
    case 'newsAnalysis':
      if (args.query) return `News analysis: ${args.query}`;
      return 'Financial news analysis';
      
    case 'webResearch':
      if (args.query) return `Research: ${args.query}`;
      return 'Web research';
      
    case 'getFredSeries':
      if (args.seriesId) return `Economic data: ${args.seriesId}`;
      return 'Economic data analysis';
      
    case 'fredSearch':
      if (args.query) return `Economic data search: ${args.query}`;
      return 'Searching economic data';
      
    case 'getRecentTweets':
      if (args.ticker) return `Recent tweets about ${args.ticker}`;
      return 'Analyzing social media sentiment';
      
    default:
      // For unknown tools, return a simplified version of the arguments
      if (args) {
        const argKeys = Object.keys(args);
        if (argKeys.length > 0) {
          const firstArg = args[argKeys[0]];
          if (typeof firstArg === 'string') {
            return firstArg.length > 30 ? firstArg.substring(0, 27) + '...' : firstArg;
          }
        }
      }
      return 'Processing data';
  }
}

// Get a user-friendly display name for a tool
export function getToolDisplayName(toolName: string): string {
  return toolDisplayNames[toolName] || toolName;
} 