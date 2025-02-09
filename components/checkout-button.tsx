'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {createCheckoutSession} from "@/utils/subscriptions";

interface CheckoutButtonProps {
  className?: string;
}

export function CheckoutButton({ 
  className = "px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
}: CheckoutButtonProps) {
  const { authenticated, login, user } = usePrivy();
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      const { url } = await createCheckoutSession(user?.id!);
      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      } else {
        console.error('Checkout URL is null');
      }
    } catch (error) {
      // Handle error
      console.error('Checkout failed', error);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      className={className}
      disabled={isLoading}
    >
      {isLoading ? 'Loading...' : authenticated ? 'Subscribe Now' : 'Login to Subscribe'}
    </button>
  );
}