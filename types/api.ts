// Generic API response type
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMetadata;
}

// API error type
export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: any;
}

// API metadata for pagination etc
export interface ApiMetadata {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

// Common query parameters
export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filter?: Record<string, any>;
  search?: string;
  include?: string[];
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
  permissions?: string[];
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  lastTriggered?: string;
  secret?: string;
}

export interface WebhookManagerWebhook {
  webhookID: string;
  webhookURL: string;
  transactionTypes: string[];
  accountAddresses: string[];
  webhookType: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
} 