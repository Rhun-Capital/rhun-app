'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuth() {
  const { login, logout, authenticated, user, ready } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/'); // Redirect to home if not authenticated
    }
  }, [ready, authenticated, router]);

  return {
    login,
    logout,
    authenticated,
    user,
    ready,
    userId: user?.id,
  };
}