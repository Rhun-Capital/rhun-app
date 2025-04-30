import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { ChevronDownIcon, ChevronUpIcon } from '@/components/icons';
import { SendIcon, QrCode, Repeat2, RefreshCcw } from 'lucide-react';
import CopyButton from '@/components/copy-button';
import FundingModal from '@/components/funding-amount-modal';
import LoadingIndicator from '@/components/loading-indicator';
import dynamic from 'next/dynamic';
import {useFundWallet} from '@privy-io/react-auth/solana';
import { useModal } from '@/contexts/modal-context'; // Adjust path as needed


const TransferModal = dynamic(() => import('@/components/send-button'), {
  ssr: false,
});

const ReceiveModal = dynamic(() => import('@/components/receive-button'), {
  ssr: false,
});

const SwapModal = dynamic(() => import('@/components/swap-button'), {
  ssr: false,
});

export default function WalletTab({ agentId }: { agentId: string }) {
  const { createWallet, exportWallet, wallets } = useSolanaWallets();
  const { getAccessToken } = usePrivy();
  const [dataLoading, setDataLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [totalValue, setTotalValue] = useState<number | null>(null);
  const [tokens, setTokens] = useState<any>({ data: [], metadata: { tokens: {} } });
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [showFundingModal, setShowFundingModal] = useState(false);
  const { openModal, closeModal } = useModal();

  const params = useParams();
  const { fundWallet } = useFundWallet();

// Fetch all data in a single useEffect
useEffect(() => {
  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      // Get access token once for all requests
      const accessToken = await getAccessToken();
      
      // Fetch agent data first
      const agentResponse = await fetch(
        `/api/agents/${decodeURIComponent(params.userId as string)}/${agentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      
      if (!agentResponse.ok) throw new Error('Failed to fetch agent');
      const agent = await agentResponse.json();
      const walletAddr = agent.wallets?.solana;
      setWalletAddress(walletAddr);

      // If we have a wallet address, fetch portfolio and tokens in parallel
      if (walletAddr) {
        const [portfolioData, tokensData] = await Promise.all([
          fetch(`/api/portfolio/${walletAddr}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          }).then(res => {
            if (!res.ok) throw new Error('Failed to fetch portfolio');
            return res.json();
          }),
          fetch(`/api/wallets/${walletAddr}/tokens`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          }).then(res => {
            if (!res.ok) throw new Error('Failed to fetch tokens');
            return res.json();
          })
        ]);

        // Calculate total value and update state
        const tv = portfolioData.holdings.reduce(
          (acc: number, token: { usdValue: number }) => acc + token.usdValue, 
          0
        );
        setTotalValue(tv);
        setPortfolio(portfolioData);
        setTokens(tokensData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  fetchAllData();
}, [agentId, params.userId]);  

  // get portfolio value and tokens every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (walletAddress) {
        getTokens(walletAddress)
          .then((response) => {
            setTokens(response);
          })
          .catch((error) => console.error('Error fetching tokens:', error));

          getPortfolioValue(walletAddress)
          .then((portfolio) => {
            // sum the total value of all tokens usdValue
            const tv = portfolio.holdings.reduce((acc: number, token: { usdValue: number }) => acc + token.usdValue, 0);
            setTotalValue(tv)
            setPortfolio(portfolio);
          })
          .catch((error) => console.error('Error fetching portfolio:', error));          
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  // API calls
  async function getPortfolioValue(address: string) {
    const token = await getAccessToken();
    const response = await fetch(`/api/portfolio/${address}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch portfolio data');
    return response.json();
  }

  async function getTokens(address: string) {
    const token = await getAccessToken();
    const response = await fetch(`/api/wallets/${address}/tokens`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch tokens data');
    return response.json();
  }

  const handleCreateWallet = async () => {
    try {
      setLoading(true);
      const wallet = await createWallet({ createAdditional: true });
      setWalletAddress(wallet.address);
      const accessToken = await getAccessToken();
      
      await fetch(`/api/agents/${decodeURIComponent(params.userId as string)}/${agentId}/wallet`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ wallets: { solana: wallet.address } }),
      });
    } catch (error) {
      console.error('Error creating wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportWallet = async () => {
    setExportLoading(true);
    try {
      const wallet = wallets.find((w) => w.address === walletAddress);
      if (wallet) {
        await exportWallet(wallet);
      }
    } catch (error) {
      console.error('Error exporting wallet:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const refreshWalletData = async () => {
    setRefreshLoading(true);
    try {
      if (walletAddress) {
        const [portfolioData, tokensData] = await Promise.all([
          getPortfolioValue(walletAddress),
          getTokens(walletAddress)
        ]);
        
        const tv = portfolioData.holdings.reduce(
          (acc: number, token: { usdValue: number }) => acc + token.usdValue, 
          0
        );
        setTotalValue(tv);
        setPortfolio(portfolioData);
        setTokens(tokensData);
      }
    } catch (error) {
      console.error('Error refreshing wallet data:', error);
    } finally {
      setRefreshLoading(false);
    }
  };

  async function handleShowFundingModal() {
    setShowFundingModal(true);
  }

  async function handleFundingConfirm(amount: number) {
    if (walletAddress) {
      try {
        await fundWallet(walletAddress, {
          amount: amount.toString(),
        });
        refreshWalletData();
      } catch (error) {
        console.error('Error funding wallet:', error);
      }
    }

  }


  if (!agentId) {
    return (
      <div className="p-6 bg-zinc-800 rounded-lg text-zinc-400">
        Configure your agent before creating a wallet.
      </div>
    );
  }

  if (params.userId === 'template') {
    return (
      <div className="p-6 bg-zinc-800 rounded-lg text-zinc-400">
        Use this agent template before creating a wallet.
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="p-6 bg-zinc-800 rounded-lg text-zinc-400">
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-700 pb-4">
        <div className="flex items-center gap-3">
          <Image src="https://d1olseq3j3ep4p.cloudfront.net/images/chains/solana.svg" alt="Solana Logo" width={14} height={14} />
          <h2 className="text-lg font-semibold">Agent Wallet</h2>
        </div>
        <p className="text-sm text-zinc-400">Manage your agent&apos;s Solana wallet</p>
      </div>

      {!walletAddress ? (
        <div className="p-6 bg-zinc-800 bg-opacity-40 border border-zinc-700 rounded-lg">
          <button
            onClick={handleCreateWallet}
            disabled={loading}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Creating Wallet...' : 'Create Wallet'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-6 bg-zinc-800 bg-opacity-40 border border-zinc-700 rounded-lg space-y-4">
            {/* Wallet Info */}
            <div>
              <div className="flex items-center justify-between">

                <h3 className="text-sm font-medium text-zinc-400 mb-1">Wallet Address</h3>
                <button
                className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors rounded-md hover:bg-zinc-700"
                title="Refresh wallet data"
                onClick={refreshWalletData}
              >
                {refreshLoading ? <LoadingIndicator /> : <RefreshCcw className="w-4 h-4" />}
              </button>       
              
            </div>
         
                <div className="flex items-center gap-2">
                  <code className="text-sm text-zinc-300 break-all">{walletAddress}</code>
                  <CopyButton text={walletAddress || ''} />
                </div>
              </div>

            {/* Portfolio Value */}
            {totalValue !== null && (
              <div className="pt-4 border-t border-zinc-700">
                <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-1">Total Value</h3>
                  <div className="text-xl font-semibold text-white">
                    ${totalValue.toFixed(2)}
                  </div>
                </div>
                <button onClick={handleShowFundingModal} className="mt-4 w-180 px-6 py-2.5 rounded-lg border border-indigo-600 text-white hover:bg-indigo-600/20 transition-colors text-sm sm:text-base">
                    Add Funds
                    </button>
                </div>
              </div>
            )}

            {/* Token List */}
            <div className="space-y-2">
              {portfolio?.holdings?.[0] && (
                <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image 
                        src={portfolio.holdings[0].logoURI} 
                        alt="SOL" 
                        width={40} 
                        height={40} 
                        className="rounded-full object-contain"
                      />
                      <div className="flex flex-col justify-start gap-1">
                        <div className="text-white">Solana</div>
                        <div className="flex items-center gap-1 text-sm text-zinc-400">
                          <div>{portfolio.holdings[0].amount}</div>
                          <div>SOL</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-zinc-400">
                      ${portfolio.holdings[0].usdValue.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {tokens.data.map((token: any) => (
                <div key={token.token_address} className="bg-zinc-800 p-3 rounded-lg border border-zinc-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image 
                        src={token.token_icon} 
                        alt={token.token_name} 
                        width={40} 
                        height={40} 
                        className="rounded-full"
                      />
                      <div className="flex flex-col justify-start gap-1">
                        <div className="text-white">{token.token_name}</div>
                        <div className="flex items-center gap-1 text-sm text-zinc-400">
                          <div>{token.formatted_amount}</div>
                          <div>{token.token_symbol}</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-zinc-400">
                      {token.usd_value && token.usd_value > 0.009 
                        ? `$${token.usd_value.toFixed(2)}` 
                        : '-'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Wallet Actions - Moved below token list with square button style */}
            <div className="flex justify-center gap-4 mt-4">
              <button 
                onClick={() => setIsReceiveModalOpen(true)}
                className="w-24 h-24 bg-zinc-800 rounded-lg flex flex-col items-center justify-center hover:bg-zinc-700 transition-colors p-3 border border-zinc-700"
              >
                <QrCode className="w-8 h-8 mb-2" />
                <span className="text-sm text-zinc-400">Receive</span>
              </button>
              
              <button 
                disabled={!totalValue || tokens.data.length === 0}
                onClick={() => {
                  setIsTransferModalOpen(true)
                  openModal();
                }}
                className="w-24 h-24 bg-zinc-800 rounded-lg flex flex-col items-center justify-center hover:bg-zinc-700 transition-colors p-3 border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SendIcon className="w-8 h-8 mb-2" />
                <span className="text-sm text-zinc-400">Send</span>
              </button>
              
              <button 
                disabled={!totalValue || tokens.data.length === 0}
                onClick={() => setIsSwapModalOpen(true)}
                className="w-24 h-24 bg-zinc-800 rounded-lg flex flex-col items-center justify-center hover:bg-zinc-700 transition-colors p-3 border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Repeat2 className="w-8 h-8 mb-2" />
                <span className="text-sm text-zinc-400">Swap</span>
              </button>
            </div>

            {/* Advanced Options */}
            <div className="pt-4 border-t border-zinc-700">
              <button 
                onClick={() => setIsAdvancedOptionsOpen(!isAdvancedOptionsOpen)}
                className="w-full flex justify-between items-center text-sm font-medium text-zinc-300 hover:text-zinc-100 transition"
              >
                <span>Advanced Options</span>
                {isAdvancedOptionsOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </button>

              {isAdvancedOptionsOpen && (
                <div className="mt-4 space-y-4 bg-zinc-900 rounded-lg p-4">
                  <div>
                    <button
                      onClick={handleExportWallet}
                      disabled={exportLoading}
                      className="px-10 py-1 text-white outline outline-orange-600 hover:opacity-70 rounded-md transition disabled:opacity-50"
                    >
                      {exportLoading ? 'Exporting...' : 'Export Wallet'}
                    </button>
                    <p className="text-xs text-zinc-400 mt-2">
                      Export your wallet private key. Use with caution.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Components */}
          {walletAddress && (
            <ReceiveModal
              isOpen={isReceiveModalOpen}
              onClose={() => setIsReceiveModalOpen(false)}
              agent={{
                wallets: { solana: walletAddress || '' }
              }}
            />
          )}

          <TransferModal
            isOpen={isTransferModalOpen}
            onClose={() => setIsTransferModalOpen(false)}
            tokens={tokens.data}
            solanaBalance= {{
              amount: portfolio && portfolio.holdings[0].amount,
              usdValue: portfolio &&  portfolio.holdings[0].usdValue,
              logoURI: portfolio && portfolio.holdings[0].logoURI
            }}           
            agent={{
              wallets: { solana: walletAddress || '' }
            }}
          />

          {walletAddress && (<SwapModal
            isOpen={isSwapModalOpen}
            onClose={() => setIsSwapModalOpen(false)}
            tokens={tokens.data}
            solanaBalance= {{
              amount: portfolio && portfolio.holdings[0].amount,
              usdValue:portfolio &&  portfolio.holdings[0].usdValue,
              logoURI: portfolio && portfolio.holdings[0].logoURI
            }}           
            agent={{
              wallets: { solana: walletAddress }
            }}
            onSwapComplete={refreshWalletData}
          />)}
        </div>
      )}

      <FundingModal
          isOpen={showFundingModal}
          onClose={() => {
            setShowFundingModal(false)
            closeModal();
          }}
          onConfirm={handleFundingConfirm}
          defaultAmount={0.1}
        />

    </div>
  );
}