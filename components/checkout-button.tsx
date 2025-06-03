'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { createCheckoutSession } from "@/utils/subscriptions";
import { CheckoutButtonProps } from '@/types/components';

export function CheckoutButton({ 
  userId,
  onCheckoutComplete,
  className = "px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
}: CheckoutButtonProps) {
  const { authenticated, login } = usePrivy();
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setIsLoading(true);
      const { url } = await createCheckoutSession(userId);
      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
        onCheckoutComplete?.();
      } else {
        console.error('Checkout URL is null');
      }
    } catch (error) {
      // Handle error
      console.error('Checkout failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={authenticated ? handleCheckout : login}
      className={className}
      disabled={isLoading}
    >
      {isLoading ? 'Loading...' : authenticated ? 'Subscribe Now' : 'Login to Subscribe'}
    </button>
  );
}