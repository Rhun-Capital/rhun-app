export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: string;
  signature: string;
  receivedAt: string;
  description: string;
  tokenInfo: {
    action?: string;
    fromToken?: {
      amount: number;
      symbol: string;
    };
    toToken?: {
      amount: number;
      symbol: string;
    };
  };
  fromTokenMetadata?: {
    symbol: string;
  };
  toTokenMetadata?: {
    symbol: string;
  };
  data: {
    token: {
      address: string;
      symbol: string;
      name: string;
      decimals: number;
    };
    amount: string;
    price: number;
    value: number;
    from: string;
    to: string;
    hash: string;
  };
}

export interface WebhookResponse {
  events: WebhookEvent[];
  status: string;
  message?: string;
}

export interface WebhookSubscription {
  id: string;
  userId: string;
  type: 'transaction' | 'token_transfer' | 'price_alert' | 'whale_alert' | 'custom';
  filters: {
    addresses?: string[];
    tokens?: string[];
    thresholds?: {
      min?: number;
      max?: number;
    };
    conditions?: {
      field: string;
      operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin';
      value: any;
    }[];
  };
  callback: {
    url: string;
    method: 'GET' | 'POST' | 'PUT';
    headers?: Record<string, string>;
    retry?: {
      count: number;
      interval: number;
    };
  };
  status: 'active' | 'paused' | 'deleted';
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending' | 'retrying';
  response?: {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  retries: number;
  nextRetry?: string;
}

export interface WebhookStats {
  total: number;
  success: number;
  failed: number;
  pending: number;
  retrying: number;
  averageResponseTime: number;
  lastDelivery?: WebhookDelivery;
  errorRate: number;
  topErrors: {
    code: string;
    count: number;
    percentage: number;
  }[];
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

export interface TrackWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrack: (address: string, filters: TrackingFilters) => void;
  className?: string;
} 