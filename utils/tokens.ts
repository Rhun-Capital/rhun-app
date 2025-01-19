import { COMMON_TOKENS } from '@/utils/token-list';

interface TokenMetadata {
  symbol: string;
  name: string;
  logoURI?: string;
}

export async function getTokenMetadata(mintAddresses: string[]) {
  try {
    // Return metadata from our curated list or generate placeholder
    return mintAddresses.reduce((acc: Record<string, TokenMetadata>, mint: string) => {
      acc[mint] = COMMON_TOKENS[mint] || {
        symbol: mint.slice(0, 4) + '...',
        name: `Token ${mint.slice(0, 6)}...`,
      };
      return acc;
    }, {});
  } catch (error) {
    console.error('Error with token metadata:', error);
    return mintAddresses.reduce((acc: Record<string, TokenMetadata>, mint: string) => {
      acc[mint] = {
        symbol: mint.slice(0, 4) + '...',
        name: `Token ${mint.slice(0, 6)}...`,
      };
      return acc;
    }, {});
  }
}