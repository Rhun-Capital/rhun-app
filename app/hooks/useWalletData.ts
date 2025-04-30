import { useState, useCallback, useRef, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export const useWalletData = (activeWallet: string | null, authenticated: boolean) => {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [totalValue, setTotalValue] = useState<number | null>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const { getAccessToken } = usePrivy();
  const fetchInProgressRef = useRef(false);
  const prevWalletRef = useRef<string | null>(null);
  const prevAuthRef = useRef<boolean>(false);
  const lastFetchTimeRef = useRef<number>(0);
  const FETCH_COOLDOWN = 5000; // 5 seconds cooldown between fetches

  const fetchWalletData = useCallback(async () => {
    // If we're already fetching or don't have the required data, return early
    if (fetchInProgressRef.current || !activeWallet || !authenticated) {
      return;
    }

    // Check if we're within the cooldown period
    const now = Date.now();
    if (now - lastFetchTimeRef.current < FETCH_COOLDOWN) {
      return;
    }

    try {
      fetchInProgressRef.current = true;
      setInitialLoading(true);
      const token = await getAccessToken();
      
      // Get portfolio data
      const portfolioUrl = `/api/portfolio/${activeWallet}`;
      const portfolioRes = await fetch(portfolioUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (portfolioRes.ok) {
        const portfolioData = await portfolioRes.json();
        setPortfolio(portfolioData);
        
        // Calculate total value
        const tv = portfolioData.holdings.reduce(
          (acc: number, token: { usdValue: number }) => acc + token.usdValue, 
          0
        );
        setTotalValue(tv);
      }
      
      // Get tokens data
      const tokensUrl = `/api/wallets/${activeWallet}/tokens`;
      const tokensRes = await fetch(tokensUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (tokensRes.ok) {
        const tokensData = await tokensRes.json();
        setTokens(tokensData.data || []);
      }

      lastFetchTimeRef.current = now;
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setInitialLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [activeWallet, authenticated, getAccessToken]);

  // Only fetch when wallet or authentication state actually changes
  useEffect(() => {
    const walletChanged = prevWalletRef.current !== activeWallet;
    const authChanged = prevAuthRef.current !== authenticated;
    
    if (walletChanged || authChanged) {
      prevWalletRef.current = activeWallet;
      prevAuthRef.current = authenticated;
      
      if (activeWallet && authenticated) {
        fetchWalletData();
      }
    }
  }, [activeWallet, authenticated, fetchWalletData]);

  return {
    portfolio,
    totalValue,
    tokens,
    initialLoading,
    refreshWalletData: fetchWalletData
  };
}; 