import { usePrivy } from '@privy-io/react-auth';

let fetchInProgress = false;

export const fetchWalletData = async (
  activeWallet: string | null,
  authenticated: boolean,
  getAccessToken: () => Promise<string>,
  setPortfolio: (data: any) => void,
  setTotalValue: (value: number) => void,
  setTokens: (tokens: any[]) => void,
  setInitialLoading: (loading: boolean) => void
) => {
  // If we're already fetching or don't have the required data, return early
  if (fetchInProgress || !activeWallet || !authenticated) {
    return;
  }
  
  try {
    fetchInProgress = true;
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
  } catch (error) {
    console.error('Error fetching wallet data:', error);
  } finally {
    setInitialLoading(false);
    fetchInProgress = false;
  }
}; 