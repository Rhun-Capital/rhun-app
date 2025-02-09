import React, { useState, useEffect } from 'react';
import {usePrivy} from '@privy-io/react-auth';
import { CheckoutButton } from "@/components/checkout-button";
import {createCustomerPortalSession} from "@/utils/subscriptions";
import LoadingIndicator from "@/components/loading-indicator";
import RhunCheckout from "@/components/rhun-checkout";
import { CreditCard, Coins } from 'lucide-react';


// Subscription type based on previous DynamoDB schema
interface Subscription {
  userId: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  status: string;
  planId?: string;
  productId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  amount?: number;
  currency?: string;
  interval?: string;
  intervalCount?: number;
}

interface SubscriptionManagementProps {
  userId: string;
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ userId }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessToken } = usePrivy();

  // Fetch subscription details
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setIsLoading(true);
        const accessToken = await getAccessToken();
        const response = await fetch(`/api/subscriptions/${userId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        console.log(response)
        
        if (!response.ok) {
            setSubscription(null);
            return
        }
        
        const data = await response.json();
        setSubscription(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, [userId]);

  const handleManageSubscription = async () => {
    if (!subscription?.stripeCustomerId) return;

    try {
      setIsProcessing(true);
      const { url } = await createCustomerPortalSession(subscription.stripeCustomerId);
      
      // Redirect to Stripe Customer Portal
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsProcessing(false);
    }
  };  

  // Format currency
  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount || !currency) return 'N/A';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency.toUpperCase() 
    }).format(amount / 100); // Stripe amounts are in cents
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPlan = (planId: string) => {
    const planMap: { [key: string]: string } = {
        'price_1QqKMIQTAUL7LajjDKwBmkBY': 'Monthly Pro Plan',
        'price_1QqKMIQTAUL7LajjZVcqnLVA': 'Yearly Pro Plan',
    }
    return planMap[planId] || planId;
  }


  
  const CheckoutOptions = () => {
    return (
      <div className="w-full p-6 bg-zinc-800 rounded-lg">
        <h3 className="text-xl font-bold text-white mb-6">Choose Your Payment Method</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stripe Checkout Option */}
          <div className="p-6 bg-zinc-700 rounded-lg transition-colors duration-200">
            <div className="flex items-center mb-4">
              <CreditCard className="w-6 h-6 text-indigo-400 mr-3" />
              <h3 className="text-xl font-semibold text-white">Pay with Card</h3>
            </div>
            <p className="text-zinc-300 mb-6">Quick and secure payment using your credit or debit card</p>
            <CheckoutButton className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200" />
          </div>
  
          {/* Rhun Token Checkout Option */}
          <div className="p-6 bg-zinc-700 rounded-lg transition-colors duration-200">
            <div className="flex items-center mb-4">
              <Coins className="w-6 h-6 text-purple-400 mr-3" />
              <h3 className="text-xl font-semibold text-white">Pay with Rhun</h3>
            </div>
            <p className="text-zinc-300 mb-6">Use your Rhun tokens for instant checkout using your connected wallet</p>
            <RhunCheckout />
          </div>
        </div>
  
        <p className="text-zinc-400 text-sm mt-6 text-center">
          Need help? Contact our support team support@rhun.io
        </p>
      </div>
    );
  };
  
  

  // Render loading state
  if (isLoading) {
    return (
      <div className="w-full p-4 bg-zinc-800 rounded-lg">
        <h2 className="text-xl text-white mb-4"><LoadingIndicator/></h2>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="w-full p-4 bg-zinc-800 rounded-lg border-2 border-red-500">
        <h2 className="text-xl text-red-600 mb-4">Subscription Error</h2>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  // Render no subscription state
  if (!subscription) {
    return (
        CheckoutOptions()
    );
  }

  return (
    <div className="w-full p-4 bg-zinc-800 rounded-lg space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl">Your Subscription</h2>
        <span 
          className={`px-4 py-1 rounded-full text-sm font-medium ${
            subscription.status === 'active' ? 'bg-green-100 text-green-800' :
            'bg-zinc-100 text-zinc-800'
          }`}
        >
          {subscription.status.toUpperCase()}
        </span>
      </div>

      <div className="border-t border-zinc-200 pt-4">
        <div className="flex justify-between mb-2">
          <span className="text-zinc-400">Plan</span>
          <span className="font-medium">{subscription.planId ? formatPlan(subscription.planId) : 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Amount</span>
          <span className="font-medium">
            {formatCurrency(subscription.amount, subscription.currency)}{' '}
            {subscription.interval && `/ ${subscription.interval}`}
          </span>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between mb-2">
          <span className="text-zinc-400">Current Period Starts</span>
          <span className="font-medium">{formatDate(subscription.currentPeriodStart)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Current Period Ends</span>
          <span className="font-medium">{formatDate(subscription.currentPeriodEnd)}</span>
        </div>

        {subscription.cancelAtPeriodEnd && (
            <div className="mt-2 text-red-400 text-sm">
                Your subscription will be canceled at the end of the current period.
            </div>
        )}
      </div>

      <div className="border-t text-zinc-400 pt-4 flex justify-between items-center">
        <span className="text-zinc-400">Manage Subscription</span>
        <button 
          onClick={handleManageSubscription}
          disabled={isProcessing}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
        >
          {isProcessing ? 'Loading...' : 'Manage Subscription'}
        </button>
      </div>

    </div>
  );
};

export default SubscriptionManagement;