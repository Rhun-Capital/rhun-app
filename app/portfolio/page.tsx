'use client';

import { PortfolioAnalysis } from '@/components/portfolio-analysis';
import { usePrivy } from '@privy-io/react-auth';

export default function TestPortfolioPage() {
    const { user } = usePrivy();  
  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Portfolio Analysis</h1>
        <p>Loading...</p>
      </div>
    );
  }
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Portfolio Analysis</h1>
      <PortfolioAnalysis walletAddress={user?.wallet?.address || ''} />
    </div>
  );
}