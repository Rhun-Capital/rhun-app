import { BaseToolProps, ToolInvocationState } from './tools';

export interface NftData {
  id: string;
  name: string;
  description: string;
  image: string;
  collection: {
    id: string;
    name: string;
    description: string;
    image: string;
    floorPrice: number;
    volume24h: number;
    volumeTotal: number;
    owners: number;
    items: number;
    verified: boolean;
    social: {
      twitter?: string;
      discord?: string;
      website?: string;
    };
  };
  attributes: {
    trait_type: string;
    value: string;
    rarity?: number;
  }[];
  owner: string;
  creator: string;
  tokenId: string;
  tokenAddress: string;
  blockchain: string;
  metadata: {
    animation_url?: string;
    external_url?: string;
    background_color?: string;
    youtube_url?: string;
  };
  sales: {
    price: number;
    timestamp: string;
    buyer: string;
    seller: string;
    marketplace: string;
  }[];
  rarity: {
    rank: number;
    score: number;
    total: number;
  };
  lastSale?: {
    price: number;
    timestamp: string;
    buyer: string;
    seller: string;
    marketplace: string;
  };
  currentListing?: {
    price: number;
    marketplace: string;
    expiration?: string;
  };
  bids: {
    price: number;
    bidder: string;
    expiration: string;
  }[];
  collectionName: string;
  floorPrice: number;
  volume24h: number;
  volumeChange24h: number;
  holders: number;
  sales24h: number;
  marketCap: number;
  imageUrl?: string;
  website?: string;
  twitter?: string;
  discord?: string;
}

export interface NftCollection {
  id: string;
  name: string;
  description: string;
  image: string;
  banner?: string;
  creator: string;
  createdAt: string;
  blockchain: string;
  contractAddress: string;
  stats: {
    floorPrice: number;
    volume24h: number;
    volumeTotal: number;
    owners: number;
    items: number;
    sales24h: number;
    averagePrice24h: number;
    marketCap: number;
  };
  social: {
    twitter?: string;
    discord?: string;
    website?: string;
    medium?: string;
    telegram?: string;
  };
  metadata: {
    categories?: string[];
    tags?: string[];
    isVerified?: boolean;
    isFeatured?: boolean;
  };
}

export interface NftActivity {
  id: string;
  type: 'sale' | 'listing' | 'bid' | 'transfer' | 'mint';
  timestamp: string;
  nft: {
    id: string;
    name: string;
    image: string;
    collection: {
      id: string;
      name: string;
    };
  };
  from: string;
  to: string;
  price?: number;
  marketplace?: string;
  transactionHash: string;
}

export interface NftMarketStats {
  totalVolume: number;
  volume24h: number;
  volumeChange24h: number;
  sales24h: number;
  averagePrice24h: number;
  floorPrice: number;
  floorPriceChange24h: number;
  marketCap: number;
  owners: number;
  totalSupply: number;
}

export interface TableColumn {
  header: string;
  accessorKey: keyof NftData;
  cell: (data: NftData) => React.ReactNode;
  sortable?: boolean;
}

export interface NftCollectionProps extends BaseToolProps {
  toolInvocation: {
    toolName: string;
    args: { message: string };
    result?: NftData;
    state: ToolInvocationState;
  };
}

export interface NftTableColumn {
  header: string;
  accessorKey: keyof NftData;
  cell: (data: NftData) => React.ReactNode;
  sortable?: boolean;
} 