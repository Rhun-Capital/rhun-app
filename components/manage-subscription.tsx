import React, { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { CheckoutButton } from "@/components/checkout-button";
import { createCustomerPortalSession } from "@/utils/subscriptions";
import LoadingIndicator from "@/components/loading-indicator";
import RhunCheckout from "@/components/rhun-checkout";
import { CreditCard, Coins, Clock, ArrowLeftRight, DollarSign } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';

interface SubscriptionManagementProps {
  userId: string;
  wallet: string;
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ userId, wallet }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    isLoading, 
    error: subscriptionError, 
    subscriptionType,
    subscriptionDetails
  } = useSubscription();

  const handleManageSubscription = async () => {
    const stripeCustomerId = subscriptionDetails?.stripe?.stripeCustomerId;
    if (!stripeCustomerId) {
      setError('No valid subscription found');
      return;
    }

    try {
      setIsProcessing(true);
      const { url } = await createCustomerPortalSession(stripeCustomerId);
      
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsProcessing(false);
    }

  };

  const CheckoutOptions = () => (
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
        {wallet && (
          <div className="p-6 bg-zinc-700 rounded-lg transition-colors duration-200">
            <div className="flex items-center mb-4">
              <Coins className="w-6 h-6 text-purple-400 mr-3" />
              <h3 className="text-xl font-semibold text-white">Pay with Rhun</h3>
            </div>
            <p className="text-zinc-300 mb-6">Use your Rhun tokens for instant checkout using your connected wallet</p>
            <RhunCheckout />
          </div>
        )}
      </div>

      <p className="text-zinc-400 text-sm mt-6 text-center">
        Need help? Contact our support team support@rhun.io
      </p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="w-full p-4 bg-zinc-800 rounded-lg">
        <h2 className="text-xl text-white"><LoadingIndicator/></h2>
      </div>
    );
  }

  if (subscriptionError || error) {
    return (
      <div className="w-full p-4 bg-zinc-800 rounded-lg border-2 border-red-500">
        <h2 className="text-xl text-red-600 mb-4">Subscription Error</h2>
        <p className="text-red-500">{subscriptionError || error}</p>
      </div>
    );
  }
  if (subscriptionType === 'none') {
    return <CheckoutOptions />;
  }

  // Show Credit Card Subscription if it exists and is active
  if (subscriptionDetails?.stripe?.active) {
    return (
      <div className="w-full p-4 bg-zinc-800 rounded-lg space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl">Your Subscription</h2>
          <span className="px-4 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            {subscriptionDetails.stripe.status === 'trialing' ? 'TRIALING' : 'ACTIVE'}
          </span>
        </div>

        <div className="border-t border-zinc-200 pt-4">
          <div className="flex justify-between mb-2">
            <span className="text-zinc-400">Plan</span>
            <span className="font-medium">
              {subscriptionDetails.stripe.plan || 'Pro Plan'}
            </span>
          </div>
        </div>

        <div className="border-t border-zinc-200 pt-4">
          <div className="flex justify-between mb-2">
            <span className="text-zinc-400">Amount</span>
            <span className="font-medium">
              ${subscriptionDetails.stripe.amount ? (subscriptionDetails.stripe.amount / 100).toFixed(2) : 'Unavailable'}
            </span>
          </div>
        </div>

        <div className="border-t border-zinc-200 pt-4">
          <div className="flex justify-between mb-2">
            <span className="text-zinc-400">Current Period Ends</span>
            <span className="font-medium">
              {subscriptionDetails.stripe.currentPeriodEnd ? 
                new Date(subscriptionDetails.stripe.currentPeriodEnd).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
        
        {/* if cancelAtPeriodEnd show wanring  */}
        {subscriptionDetails.stripe.cancelAtPeriodEnd && (
          <div>
            <span className="text-red-400 text-sm">Your subscription will not renew</span>
          </div>
        )}

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
  }

  // Show Token Subscription if it exists and is active
  if (subscriptionDetails?.token?.active) {
    return (
      <div className="w-full p-4 bg-zinc-800 rounded-lg space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl">Rhun Token Subscription</h2>
          <span className="px-4 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            ACTIVE
          </span>
        </div>

        <div className="border-t border-zinc-200 pt-4">
          <div className="flex justify-between mb-2">
            <span className="text-zinc-400 flex items-center">
              <ArrowLeftRight className="w-4 h-4 mr-2 text-zinc-400" />
              Transaction Hash
            </span>
            <span className="font-medium text-sm truncate max-w-[200px]">
              <a 
                className="text-indigo-400" 
                href={`https://explorer.solana.com/tx/${subscriptionDetails.token.subscription?.txHash}`} 
                target="_blank"
              >
                {subscriptionDetails.token.subscription?.txHash}
              </a>
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-zinc-400 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-zinc-400" />
              Subscription Ends
            </span>
            <span className="font-medium">
              {subscriptionDetails.token.expiresAt ? 
                new Date(subscriptionDetails.token.expiresAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          {subscriptionDetails.token.subscription && (
            <>
              <div className="flex justify-between mb-2">
                <span className="text-zinc-400 flex items-center">
                  <Coins className="w-4 h-4 mr-2 text-zinc-400" />
                  Amount Paid
                </span>
                <span className="font-medium">
                  {(subscriptionDetails.token.subscription.calculatedTokenAmount / Math.pow(10, 6)).toFixed(2)} RHUN
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 flex items-center">
                  <DollarSign className="w-4 h-4 mr-2 text-zinc-400" />
                  Fee Paid
                </span>
                <span className="font-medium">
                  {(subscriptionDetails.token.subscription.fee / 1000000).toFixed(2)} USDC
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Fallback to checkout options if no active subscription
  return <CheckoutOptions />;
};

export default SubscriptionManagement;