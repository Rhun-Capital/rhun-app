export interface TokenSubscription {
  id: string;
  userId: string;
  status: 'active' | 'cancelled' | 'expired';
  createdAt: string;
  expiresAt: string;
  features: string[];
  tier: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionStatus {
  isSubscribed: boolean;
  subscription?: TokenSubscription;
  error?: string;
}

export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
  };
}

export interface ProtectedContentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export interface SubscriptionDetails {
  id: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  canceledAt?: number;
  endedAt?: number;
  trialStart?: number;
  trialEnd?: number;
  metadata?: Record<string, any>;
} 