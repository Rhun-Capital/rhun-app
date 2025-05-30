import { Token } from './market';

export interface WebhookEvent {
  id: string;
  timestamp: string;
  type: string;
  data: {
    token: Token;
    amount: string;
    price: number;
    value: number;
    from: string;
    to: string;
    hash: string;
  };
}

export interface TrackingFilters {
  minAmount?: number;
  maxAmount?: number;
  minValue?: number;
  maxValue?: number;
  fromAddresses?: string[];
  toAddresses?: string[];
  tokenAddresses?: string[];
  eventTypes?: string[];
}

export interface ActivityResponse {
  data: Activity[];
  metadata: {
    tokens: { [key: string]: TokenDisplayMetadata };
  };
}

interface Activity {
  id: string;
  timestamp: string;
  type: string;
  data: ActivityData;
}

interface ActivityData {
  token: string;
  amount: string;
  price?: number;
  value?: number;
  from?: string;
  to?: string;
  hash?: string;
}

interface TokenDisplayMetadata {
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
} 