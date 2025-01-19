interface TokenMetadata {
  symbol: string;
  name: string;
  logoURI: string;
}

interface TokenList {
  [key: string]: TokenMetadata;
}

export const COMMON_TOKENS: TokenList = {
    "So11111111111111111111111111111111111111112": {
      symbol: "SOL",
      name: "Wrapped SOL",
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
    },
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {
      symbol: "USDC",
      name: "USD Coin",
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
    },
    // Add more common tokens as needed
  };
  