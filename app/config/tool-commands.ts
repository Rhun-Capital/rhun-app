export const toolCommands: { [key: string]: string } = {
  'technical-analysis': 'Show me a technical analysis for',
  'swap': "Let's swap tokens",
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
  'fear-greed': 'What is the current fear and greed index?',
  // FRED Tools
  'fred-gdp': 'Show me the latest GDP data from FRED',
  'fred-unemployment': 'Show me the latest unemployment rate from FRED',
  'fred-inflation': 'Show me recent CPI data from FRED',
  'fred-interest-rates': 'What\'s the current Fed Funds Rate from FRED?',
  'fred-market': 'Show me the S&P 500 index from FRED',
  'fred-exchange': 'Show me the Euro exchange rate from FRED',
  'fred-housing': 'Show me housing starts from FRED',
  'fred-money': 'Show me the M2 money supply from FRED',
  'fred-debt': 'What\'s the total federal debt from FRED?',
  'fred-retail': 'What\'s the current retail sales from FRED?'
};

export const getToolCommand = (tool: string): string | undefined => {
  return toolCommands[tool];
}; 