export const toolCommands: { [key: string]: string } = {
  'technical-analysis': 'Show me a technical analysis for',
  'swap': 'Show me the swap interface',
  'search-tokens': 'Search for tokens',
  'stock-analysis': 'Analyze stock data',
  'news-analysis': 'Show me the latest news',
  'web-research': 'Start research',
  'tradingview-chart': 'Show me a TradingView chart',
  'portfolio-value': 'Show me my portfolio value',
  'agent-portfolio-value': "Show me your portfolio value",
  'token-holdings': 'Show me my token holdings',
  'agent-token-holdings': "Show me your token holdings",
  'solana-transaction-volume': 'Show me the transaction volume on Solana',
  'recent-dexscreener-tokens': 'Search for recently listed tokens on DexScreener',
  'trending-tokens': 'Search for trending tokens',
  'trending-solana-tokens': 'Search for trending tokens on Solana',
  'top-nfts': 'Show me the top NFTs',
  'token-info': 'Show me information about the token',
  'wallet-info': 'Show me information about a solana account',
  'wallet-activity': 'Show me information about a solana account and track activity',
  'recent-tokens': 'Search for recently listed tokens',
  'top-holders': 'Show me the top token holders',
  'market-movers': 'Show me the top market movers today',
  'total-market-cap': 'Show me the total crypto market cap',
  'market-categories': 'Show me the market categories',
  'derivatives-exchanges': 'Show me derivatives exchanges',
  'fear-greed-index': 'What is the current fear and greed index?'
};

export const getToolCommand = (tool: string): string | undefined => {
  return toolCommands[tool];
}; 