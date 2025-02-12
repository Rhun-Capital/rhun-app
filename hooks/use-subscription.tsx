import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface TokenSubscription {
  userId: string;
  txHash: string;
  slot: number;
  fee: number;
  status: string;
  blockTime: number;
  signer: string[];
  parsedInstructions: any[];
  programIds: string[];
  time: string;
  calculatedTokenAmount: number;
}

interface SubscriptionStatus {
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscriptionType: 'none' | 'stripe' | 'token' | 'both';
  subscriptionDetails: {
    stripe?: {
      active: boolean;
      currentPeriodEnd: string | null;
      plan?: string;
      subscriptionId?: string;
      stripeCustomerId?: string;
      amount?: number;
      cancelAtPeriodEnd?: boolean;
    };
    token?: {
      active: boolean;
      expiresAt: string | null;
      subscription?: {
        txHash: string;
        slot: number;
        fee: number;
        blockTime: number;
        calculatedTokenAmount: number;
      };
    };
  };
}

export function useSubscription(): SubscriptionStatus {
  const { user, getAccessToken } = usePrivy();
  const [status, setStatus] = useState<SubscriptionStatus>({
    isSubscribed: false,
    isLoading: true,
    error: null,
    subscriptionType: 'none',
    subscriptionDetails: {
      stripe: {
        active: false,
        currentPeriodEnd: null,
      },
      token: {
        active: false,
        expiresAt: null,
      }
    }
  });

  useEffect(() => {
    const checkSubscriptions = async () => {
      if (!user?.id) {
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: 'User not authenticated'
        }));
        return;
      }

      try {
        const accessToken = await getAccessToken();
        
        // Check all subscription types in parallel
        const [stripeResponse, tokenResponse] = await Promise.all([
          fetch(`/api/subscriptions/${user.id}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          }),
          fetch(`/api/subscriptions/${user.id}/token-subscription`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          })
        ]);

        // Parse Stripe subscription
        let stripeActive = false;
        let stripeExpiresAt: string | null = null;
        let stripePlan: string | undefined;
        let stripeCustomerId: string | undefined;
        let stripeAmount: number | undefined;
        let stripeCancelAtPeriodEnd: boolean | undefined;

        
        if (stripeResponse.ok) {
          const stripeData = await stripeResponse.json();
          if (stripeData.stripe?.status === 'active' || stripeData.stripe?.status === 'trialing') {
            stripeActive = true;
            stripeExpiresAt = stripeData.stripe.currentPeriodEnd;
            stripePlan = stripeData.stripe.plan?.name;
            stripeCustomerId = stripeData.stripe.customerId;
            stripeAmount = stripeData.stripe.amount;
            stripeCancelAtPeriodEnd = stripeData.stripe.cancelAtPeriodEnd;
          }
        }

        // Parse Token subscription
        let tokenActive = false;
        let tokenExpiresAt: string | null = null;
        let tokenSubscription: TokenSubscription | undefined;

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          if (tokenData) {
            const purchaseDate = new Date(tokenData.blockTime * 1000);
            tokenExpiresAt = new Date(
              purchaseDate.setFullYear(purchaseDate.getFullYear() + 1)
            ).toISOString();
            tokenActive = new Date(tokenExpiresAt) > new Date();
            tokenSubscription = tokenData;
          }
        }

        // Determine overall subscription type
        let subscriptionType: 'none' | 'stripe' | 'token' | 'both' = 'none';
        if (stripeActive && tokenActive) subscriptionType = 'both';
        else if (stripeActive) subscriptionType = 'stripe';
        else if (tokenActive) subscriptionType = 'token';

        setStatus({
          isSubscribed: stripeActive || tokenActive,
          isLoading: false,
          error: null,
          subscriptionType,
          subscriptionDetails: {
            stripe: {
              active: stripeActive,
              currentPeriodEnd: stripeExpiresAt,
              plan: stripePlan,
              stripeCustomerId,
              amount: stripeAmount,
              cancelAtPeriodEnd: stripeCancelAtPeriodEnd
              
            },
            token: {
              active: tokenActive,
              expiresAt: tokenExpiresAt,
              subscription: tokenSubscription
            }
          }
        });
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }));
      }
    };

    checkSubscriptions();
  }, [user?.id, getAccessToken]);

  return status;
}

// Enhanced ProtectedContent component with subscription type awareness
interface ProtectedContentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requiredSubscription?: 'any' | 'stripe' | 'token'; // Allow specifying required subscription type
}

export function ProtectedContent({ 
  children, 
  fallback,
  requiredSubscription = 'any' 
}: ProtectedContentProps) {
  const { isSubscribed, isLoading, subscriptionType } = useSubscription();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const hasRequiredSubscription = 
    requiredSubscription === 'any' ? isSubscribed :
    requiredSubscription === 'stripe' ? ['stripe', 'both'].includes(subscriptionType) :
    requiredSubscription === 'token' ? ['token', 'both'].includes(subscriptionType) :
    false;

  if (!hasRequiredSubscription) {
    return fallback || (
      <div className="p-4 text-center">
        <p>This content requires an active {requiredSubscription === 'any' ? '' : requiredSubscription} subscription</p>
        <a href="/pricing" className="text-blue-500 hover:text-blue-600">
          View Pricing
        </a>
      </div>
    );
  }

  return <>{children}</>;
}