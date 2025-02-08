'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {createCheckoutLink} from "@/utils/subscriptions";

interface CheckoutButtonProps {
  className?: string;
}

export function CheckoutButton({ 
  className = "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
}: CheckoutButtonProps) {
  const { authenticated, login, user } = usePrivy();
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    if (!authenticated) {
      login();
      return;
    }

    try {
      setIsLoading(true);
      const { url } = await createCheckoutLink(user!.id);
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      // You might want to add error handling UI here
    } finally {
      setIsLoading(false);
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