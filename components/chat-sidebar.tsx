// components/chat-sidebar.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { WalletIcon, LayoutGrid, SendIcon, QrCode, Repeat2, Sparkles, RefreshCcw, LineChart, XIcon } from 'lucide-react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import {useFundWallet} from '@privy-io/react-auth/solana';
import LoadingIndicator from './loading-indicator';
import CopyButton from './copy-button';
import dynamic from 'next/dynamic';
import { useSubscription } from '@/hooks/use-subscription';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useModal } from '@/contexts/modal-context';
import FundingModal from './funding-amount-modal';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { getToolCommand } from '@/app/config/tool-commands';
import {useLogin} from '@privy-io/react-auth';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

// Import the modal components but use a global approach
const TransferModal = dynamic(() => import('./send-button'), {
  ssr: false,
});

const ReceiveModal = dynamic(() => import('./receive-button'), {
  ssr: false,
});

const SwapModal = dynamic(() => import('./swap-button'), {
  ssr: false,
});

interface Tool {
  name: string;
  description: string;
  command: string;
  isPro?: boolean;
  isNew?: boolean;
}

interface SidebarProps {
  agent: any;
  isOpen: boolean;
  onToggle: () => void;
  onToolSelect: (command: string) => void;
  refreshAgent: () => void;
}

// Create a new type for modal types
type ModalType = 'transfer' | 'receive' | 'swap' | null;

interface TransferButtonProps {
  tokens: any[];
  publicKey: string;
  agent: any;
  onSwapComplete: () => void;
  solanaBalance?: {
    amount: number;
    usdValue: number;
    logoURI: string;
  };
  onOpenModal: (modalType: ModalType) => void;
}

// New component that just shows the button without the modal implementation
const SwapButton = ({ tokens, solanaBalance, agent, onSwapComplete, onOpenModal }: TransferButtonProps) => {
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onOpenModal('swap');
      }}
      className="w-[80px] bg-zinc-800 rounded-lg flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 transition-colors p-2"
    >
      <div className=" flex flex-col items-center gap-1 p-2">
      <Repeat2 className="w-[20px] h-[20px]"/>
      <div className="text-sm text-zinc-400">
        Swap
      </div>
      </div>
    </button>
  );
}

const ReceiveButton = ({ agent, tokens, solanaBalance, onOpenModal }: TransferButtonProps & { agent: any }) => {
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onOpenModal('receive');
      }}
      className="w-[80px] bg-zinc-800 rounded-lg flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 transition-colors p-2"
    >
      <div className=" flex flex-col items-center gap-1 p-2">
      <QrCode className="w-[20px] h-[20px]"/>
      <div className="text-sm text-zinc-400">
        Receive
      </div>
      </div>
    </button>
  );
}

const TransferButton = ({ tokens, solanaBalance, agent, onOpenModal }: TransferButtonProps & { agent: any }) => {
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onOpenModal('transfer');
      }}
      className="w-[80px] bg-zinc-800 rounded-lg flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 transition-colors p-2"
    >
      <div className=" flex flex-col items-center gap-1 p-2">
      <SendIcon className="w-[20px] h-[20px]"/>
      <div className="text-sm text-zinc-400">
        Send
      </div>
      </div>
    </button>
  );
};

const LoadingCard = () => {
  return (<div className="animate-pulse bg-zinc-800 p-3 rounded-lg border border-zinc-700 h-[65px]">
  <div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    <div className="bg-zinc-700 w-10 h-10 rounded-full"></div>
    <div className="flex flex-col justify-start gap-1">
      <div className="bg-zinc-700 w-20 h-4 rounded-lg"></div>
      <div className="bg-zinc-700 w-10 h-3 rounded-lg"></div>
    </div>   
  </div>
  <div className="bg-zinc-700 w-10 h-3 rounded-lg"></div>      
  </div>
</div>)
}

// Rest of the component remains unchanged
const ToolCard: React.FC<{
  tool: Tool;
  isSubscribed: boolean;
  isDisabled: boolean;
  onClick: () => void;
}> = ({ tool, isSubscribed, onClick, isDisabled }) => {
  const canUse = (!tool.isPro || isSubscribed) && !isDisabled;

  return (
    <div 
      className={`relative group ${
      canUse 
        ? 'cursor-pointer hover:bg-zinc-700 active:bg-zinc-600' 
        : 'cursor-not-allowed opacity-75'
      } bg-zinc-800 p-3 rounded-lg border transition-all duration-200 ${
      tool.isPro 
        ? 'border-indigo-500/50 hover:border-indigo-500' 
        : tool.isNew 
        ? 'border-green-500/50 hover:border-green-500' 
        : 'border-zinc-700'
      }`}
      onClick={() => canUse && onClick()}
    >
      <div className="flex justify-between items-start mb-1">
      <div className="font-medium text-white group-hover:text-white/90">
        {tool.name}
      </div>
      {tool.isPro && (
        <div className="flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded text-indigo-400 text-xs">
        <Sparkles className="w-3 h-3" />
        PRO
        </div>
      )}
      {tool.isNew && (
        <div className="flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded text-green-400 text-xs">
        <Sparkles className="w-3 h-3" />
        NEW
        </div>
      )}      
      </div>
      <div className="text-sm text-zinc-400 group-hover:text-zinc-300">
      {tool.description}
      </div>
      
      {/* Upgrade overlay for pro features */}
      {tool.isPro && !isSubscribed && (
      <div className="absolute inset-0 bg-zinc-900/80 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <a 
        href="/account" 
        className="bg-indigo-500 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-600 transition-colors"
        >
        Upgrade to Pro
        </a>
      </div>
      )}
    </div>
  );
};

// FRED tools definition remains the same
const fredTools: Tool[] = [
  {
    name: 'GDP Analysis',
    description: 'View and analyze Gross Domestic Product data',
    command: getToolCommand('fred-gdp') || 'Show me the latest GDP data from FRED',
    isNew: true
  },
  {
    name: 'Unemployment Rate',
    description: 'Track unemployment rate trends',
    command: getToolCommand('fred-unemployment') || 'Show me the latest unemployment rate from FRED',
    isNew: true
  },
  {
    name: 'Inflation Data',
    description: 'Monitor CPI and inflation metrics',
    command: getToolCommand('fred-inflation') || 'Show me recent CPI data from FRED',
    isNew: true
  },
  {
    name: 'Interest Rates',
    description: 'View Federal Funds Rate and other interest rates',
    command: getToolCommand('fred-interest-rates') || 'What\'s the current Fed Funds Rate from FRED?',
    isNew: true
  },
  {
    name: 'Market Data',
    description: 'Access S&P 500 and other market indicators',
    command: getToolCommand('fred-market') || 'Show me the S&P 500 index from FRED',
    isNew: true
  },
  {
    name: 'Exchange Rates',
    description: 'Track currency exchange rates',
    command: getToolCommand('fred-exchange') || 'Show me the Euro exchange rate from FRED',
    isNew: true
  },
  {
    name: 'Housing Data',
    description: 'Monitor housing market indicators',
    command: getToolCommand('fred-housing') || 'Show me housing starts from FRED',
    isNew: true
  },
  {
    name: 'Money Supply',
    description: 'View M2 money supply data',
    command: getToolCommand('fred-money') || 'Show me the M2 money supply from FRED',
    isNew: true
  },
  {
    name: 'Federal Debt',
    description: 'Track total federal debt',
    command: getToolCommand('fred-debt') || 'What\'s the total federal debt from FRED?',
    isNew: true
  },
  {
    name: 'Retail Sales',
    description: 'Monitor retail sales trends',
    command: getToolCommand('fred-retail') || 'What\'s the current retail sales from FRED?',
    isNew: true
  }
];

// Modal portal component
const ModalPortal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted ? createPortal(children, document.body) : null;
};

const ChatSidebar: React.FC<SidebarProps> = ({ agent, isOpen, onToggle, onToolSelect, refreshAgent }) => {
  const [activeTab, setActiveTab] = useState<'wallet' | 'tools'>('tools');
  const [isToolClickDisabled, setIsToolClickDisabled] = useState(false);
  const { user, getAccessToken, authenticated } = usePrivy();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [totalValue, setTotalValue] = useState<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const params = useParams();
  const { isSubscribed } = useSubscription();
  const [tokens, setTokens] = useState<{ data: Token[]; metadata: { tokens: Object } }>({ data: [], metadata: { tokens: Object } });
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [createWalletLoading, setCreateWalletLoading] = useState(false);
  const { fundWallet } = useFundWallet();
  const { createWallet, wallets } = useSolanaWallets();
  const pathname = usePathname();
  const {login} = useLogin();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isWalletLoading, setIsWalletLoading] = useState(true);

  // Add state to track which modal is open
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Get the active wallet based on whether it's a template agent or not
  const activeWallet = params.userId === 'template' || pathname === '/' 
    ? wallets[0]?.address 
    : agent.wallets?.solana;

  // Update loading state when wallet is ready
  useEffect(() => {
    if (activeWallet) {
      setIsWalletLoading(false);
    }
  }, [activeWallet]);

  // Handle modal opening
  const handleOpenModal = (modalType: ModalType) => {
    setActiveModal(modalType);
  };

  // Handle modal closing
  const handleCloseModal = () => {
    setActiveModal(null);
  };

  interface Token {
    token_address: string;
    token_icon: string;
    token_name: string;
    usd_value: number;
    formatted_amount: number;
    token_symbol: string;
  }
  
  // Define tools with pro status
  const tools: Tool[] = [ 
    { 
      name: 'Swap Tokens', 
      description: 'Swap tokens directly through the chat interface.',
      command: getToolCommand('swap-tokens') || 'Swap tokens',
      isPro: false,
      isNew: true
    },
    { 
      name: 'Get Solana Transaction Volume', 
      description: 'Check the current transaction volume across the Solana network.',
      command: getToolCommand('solana-transaction-volume') || 'Show me the transaction volume on Solana',
      isPro: false,
      isNew: false
    },
    {
      name: 'TradingView Chart',
      description: 'Display an interactive TradingView chart for any cryptocurrency or stock symbol.',
      command: getToolCommand('tradingview-chart') || 'Show me a TradingView chart',
      isPro: false,
      isNew: true
    },   
    {
      name: "Technical Analysis",
      description: "Get detailed technical analysis and market insights for any cryptocurrency using real-time data.",
      command: getToolCommand('technical-analysis') || "Show me a technical analysis for",
      isPro: false,
      isNew: true
    },     
    { 
      name: 'Deep Research',
      description: 'Perform deep research on cryptocurrency and finance using browser automation.',
      command: getToolCommand('web-research') || 'Start research',
      isPro: false,
      isNew: true
    },    
    { 
      name: 'Stock Analysis', 
      description: 'Get comprehensive financial data, news sentiment, and options analysis for any stock.',
      command: getToolCommand('stock-analysis') || 'Analyze stock data',
      isPro: false,
      isNew: true
    },    
    { 
      name: 'Get Latest News', 
      description: 'Stay up-to-date with the latest news in the cryptocurrency space.',
      command: getToolCommand('news-analysis') || 'Show me the latest news',
      isPro: false,
      isNew: true
    },       
    {
      name: 'Get Recent Tokens on DexScreener',
      description: 'Discover the latest tokens listed on DexScreener. Filter by market cap, volume, age and more.',
      command: getToolCommand('recent-dexscreener-tokens') || 'Search for recently listed tokens on DexScreener.',
      isPro: false,
      isNew: false
    },    
    { 
      name: 'Get Trending Tokens', 
      description: 'Discover trending tokens on CoinGecko across all chains. Filter by market cap, volume, and more.',
      command: getToolCommand('trending-tokens') || 'Search for trending tokens',
      isPro: false,
      isNew: false
    },    
    { 
      name: 'Get Solana Trending Tokens', 
      description: 'Discover trending tokens on Solana. Filter by market cap, volume, and more.',
      command: getToolCommand('trending-solana-tokens') || 'Search for trending tokens on Solana',
      isPro: false,
      isNew: false
    },      
    {
      name: 'Get Top NFTs',
      description: 'Discover the top NFTs. Filter by volume, floor price, and more.',
      command: getToolCommand('top-nfts') || 'Show me the top NFTs',
      isPro: false,
      isNew: false
    },        
    { 
      name: 'Get Token Info', 
      description: 'Access comprehensive information about any specific token.',
      command: getToolCommand('token-info') || 'Show me information about the token',
      isPro: false,
      isNew: false
    },
    { 
      name: 'Get Wallet Info', 
      description: 'Examine detailed information about any Solana wallet address.',
      command: getToolCommand('wallet-info') || 'Show me information about a solana account',
      isPro: false,
      isNew: false
    },    
    { 
      name: 'Track Wallet Activity', 
      description: 'Track wallet activity for any Solana wallet address',
      command: getToolCommand('wallet-activity') || 'Show me information about a solana account and track activity',
      isPro: false, 
      isNew: false
    },     
    { 
      name: 'Get Latest Tokens', 
      description: 'Discover newly listed tokens on CoinGecko.',
      command: getToolCommand('recent-tokens') || 'Search for recently listed tokens',
      isPro: false,
      isNew: false
    },      
    { 
      name: 'Search Tokens', 
      description: 'Search through the complete database of tokens.',
      command: getToolCommand('search-tokens') || 'Search for tokens',
      isPro: false,
      isNew: false
    },
    { 
      name: 'Get Top Token Holders', 
      description: 'Identify the largest holders of any specific token.',
      command: getToolCommand('top-holders') || 'Show me the top token holders',
      isPro: false,
      isNew: false
    },
    { 
      name: 'Get Market Movers', 
      description: 'Track the biggest price movers in the market.',
      command: getToolCommand('market-movers') || 'Show me the top market movers today',
      isPro: false,
      isNew: false
    },    
    { 
      name: 'Get Total Crypto Market Cap', 
      description: 'View the total market capitalization of all cryptocurrencies.',
      command: getToolCommand('total-market-cap') || 'Show me the total crypto market cap',
      isPro: false,
      isNew: false
    },
    { 
      name: 'Get Market Categories', 
      description: 'Explore different categories of tokens and their performance.',
      command: getToolCommand('market-categories') || 'Show me the market categories',
      isPro: false,
      isNew: false
    },
    { 
      name: 'Get Derivatives Exchanges', 
      description: 'View comprehensive data about cryptocurrency derivatives exchanges.',
      command: getToolCommand('derivatives-exchanges') || 'Show me derivatives exchanges',
      isPro: false,
      isNew: false
    },
    { 
      name: 'Fear & Greed Index', 
      description: 'Check the current market sentiment using the Fear and Greed Index.',
      command: getToolCommand('fear-greed-index') || 'What is the current fear and greed index?',
      isPro: false,
      isNew: false
    },
  ];

  // Filter out wallet-related tools if user isn't authenticated
  const filteredTools = tools.filter(tool => {
    // If user is authenticated, show all tools
    if (authenticated) return true;
    
    // If not authenticated, filter out wallet-related tools
    const walletRelatedNames = [
      'Swap Tokens'
    ];
    
    return !walletRelatedNames.includes(tool.name);
  });

  // get portfolio value and tokens every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'wallet' && activeWallet) {
        Promise.all([
          getTokens(activeWallet),
          getPortfolioValue(activeWallet)
        ])
        .then(([tokensResponse, portfolioResponse]) => {
          setTokens(tokensResponse);
          const tv = portfolioResponse.holdings.reduce((acc: number, token: { usdValue: number }) => acc + token.usdValue, 0);
          setTotalValue(tv);
          setPortfolio(portfolioResponse);
        })
        .catch((error) => console.error('Error fetching data:', error))
        .finally(() => setInitialLoading(false));
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [activeTab, activeWallet, setInitialLoading]);


  const handleToolClick = (tool: Tool) => {
    if (isToolClickDisabled) return;

    setIsToolClickDisabled(true);

    onToolSelect(tool.command);

    setTimeout(() => {
      setIsToolClickDisabled(false);
    }, 5000);    
  };

  async function handleShowFundingModal() {
    setShowFundingModal(true);
  }

  async function handleFundingConfirm(amount: number) {
    if (activeWallet) {
      try {
        await fundWallet(activeWallet, {
          amount: amount.toString(),
        });
        refreshWalletData();
      } catch (error) {
        console.error('Error funding wallet:', error);
      }
    }
  }

  const handleCreateWallet = async () => {
    try {
      setCreateWalletLoading(true);
      const wallet = await createWallet({ createAdditional: true });
      
      const accessToken = await getAccessToken();
      
      await fetch(`/api/agents/${decodeURIComponent(params.userId as string)}/${params.agentId}/wallet`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ wallets: { solana: wallet.address } }),
      });
      refreshAgent();
    } catch (error) {
      console.error('Error creating wallet:', error);
    } finally {
      setCreateWalletLoading(false);
    }
  };  

  const handleCreateTemplateWallet = async () => {
    try {
      setCreateWalletLoading(true);
      const wallet = await createWallet({ walletIndex: 0 });
      // For template agents, we just update the local state
      agent.wallets = { ...agent.wallets, solana: wallet.address };
      refreshAgent();
    } catch (error) {
      console.error('Error creating template wallet:', error);
    } finally {
      setCreateWalletLoading(false);
    }
  };

  async function getPortfolioValue(walletAddress: string) {
    const url = `/api/portfolio/${walletAddress}`;
    const token = await getAccessToken();
    const headers = { 'Authorization': `Bearer ${token}` };
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch portfolio data');
    }
    return response.json();  
  }

  async function getTokens(walletAddress: string) {
    const url = `/api/wallets/${walletAddress}/tokens`;
    const token = await getAccessToken();
    const headers = { 'Authorization': `Bearer ${token}` };
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch portfolio data');
    }
    return response.json();  
  }  

  //  get solana balance 

  async function getSolanaBalance(walletAddress: string) {
    const url = `/api/wallets/${walletAddress}/balance`;
    const token = await getAccessToken();
    const headers = { 'Authorization': `Bearer ${token}` };
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch portfolio data');
    }
    return response.json();
  }

  const refreshWalletData = async () => {
    setRefreshLoading(true);
    if (activeWallet) {
      try {
        // Refresh tokens
        const tokenResponse = await getTokens(activeWallet);
        setTokens(tokenResponse);

        // Refresh portfolio
        const portfolioResponse = await getPortfolioValue(activeWallet);
        const tv = portfolioResponse.holdings.reduce(
          (acc: number, token: { usdValue: number }) => acc + token.usdValue, 
          0
        );
        setTotalValue(tv);
        setPortfolio(portfolioResponse);
        setRefreshLoading(false);
      } catch (error) {
        console.error('Error refreshing wallet data:', error);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Content */}
      <div className="h-full flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-zinc-700 h-[61px]">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 p-4 text-sm font-medium transition-colors ${
              activeTab === 'wallet' 
                ? 'text-white border-b-2 border-indigo-500 bg-zinc-800' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <WalletIcon />
              <span>Wallet</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`flex-1 p-4 text-sm font-medium transition-colors ${
              activeTab === 'tools' 
                ? 'text-white border-b-2 border-indigo-500 bg-zinc-800' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <LayoutGrid />
              <span>Tools</span>
            </div>
          </button>
        </div>

        {/* Sidebar Content - add extra padding at bottom */}
        <div className="flex-1 overflow-y-auto pb-24">
          {activeTab === 'wallet' ? (
            <div className="p-4 space-y-2">
              {/* Wallet Address */}
              <div className="bg-zinc-800 bg-opacity-40 p-4 rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-400">Wallet Address</div>
                  {params.userId !== 'template' && <button
                    className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors rounded-md hover:bg-zinc-700"
                    title="Refresh wallet data"
                    onClick={() => {
                      setRefreshLoading(true);
                      setTimeout(() => {
                        setRefreshLoading(false);
                      }, 2000)
                      refreshWalletData();
                    }}
                  >
                    {refreshLoading ? <LoadingIndicator/> : <RefreshCcw className="w-4 h-4"/>}
                  </button>}                
                </div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-sm text-white w-full">
                    {isWalletLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <LoadingIndicator />
                      </div>
                    ) : (activeWallet) ? (
                      <div className="text-sm text-zinc-500 mt-2">
                        {activeWallet ? <div className="truncate max-w-[185px]">{activeWallet}</div> : 'No agent wallet found'}
                      </div>
                    ) : !authenticated && pathname === '/' ? (
                      <div className="w-full">
                        <div className="text-sm text-zinc-500 mt-2 mb-4">Connect your wallet to access wallet features.</div>
                        <button 
                          onClick={() => login()}
                          className="mt-4 w-full px-6 py-2.5 rounded-lg border border-indigo-400 text-white hover:bg-indigo-400/20 transition-colors text-sm sm:text-base"
                        >
                          Connect Wallet
                        </button>
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="text-sm text-zinc-500 mt-2 mb-4">No agent wallet found. </div>
                        <button 
                          disabled={createWalletLoading} 
                          onClick={params.userId === 'template' || pathname === '/' ? handleCreateTemplateWallet : handleCreateWallet} 
                          className="mt-4 w-full px-6 py-2.5 rounded-lg border border-indigo-400 text-white hover:bg-indigo-400/20 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {createWalletLoading ? 'Creating...' : 'Create Agent Wallet'}
                        </button>                          
                      </div>
                    )}
                  </div>
                  {activeWallet && (
                    <CopyButton text={activeWallet} />
                  )}
                </div>
                
                {/* Portfolio Value */}
                {(activeWallet && totalValue) ? <div className="pt-2 border-t border-zinc-700">
                  <div className="text-sm text-zinc-400">Total Value</div>
                  <div className="text-xl font-semibold text-white">
                    {totalValue ? '$' + totalValue.toFixed(2) : <div className="ml-5"><LoadingIndicator /></div>}
                  </div>
                </div> : null}
                
                {activeWallet && (
                  <div className="flex gap-2 mt-2">
                    <ReceiveButton 
                      tokens={tokens.data}
                      publicKey={activeWallet}
                      agent={agent}
                      onSwapComplete={refreshWalletData}
                      solanaBalance={portfolio?.holdings[0] ? {
                        amount: portfolio.holdings[0].amount,
                        usdValue: portfolio.holdings[0].usdValue,
                        logoURI: portfolio.holdings[0].logoURI
                      } : undefined}
                      onOpenModal={handleOpenModal}
                    />

                    <TransferButton 
                      tokens={tokens.data}
                      publicKey={activeWallet}
                      agent={agent}
                      onSwapComplete={refreshWalletData}
                      solanaBalance={portfolio?.holdings[0] ? {
                        amount: portfolio.holdings[0].amount,
                        usdValue: portfolio.holdings[0].usdValue,
                        logoURI: portfolio.holdings[0].logoURI
                      } : undefined}
                      onOpenModal={handleOpenModal}
                    />

                    <SwapButton 
                      tokens={tokens.data}
                      publicKey={activeWallet}
                      onSwapComplete={refreshWalletData}
                      solanaBalance={portfolio?.holdings[0] ? {
                        amount: portfolio.holdings[0].amount,
                        usdValue: portfolio.holdings[0].usdValue,
                        logoURI: portfolio.holdings[0].logoURI
                      } : undefined}
                      agent={agent}
                      onOpenModal={handleOpenModal}
                    /> 
                  </div>
                )}
                  
                {activeWallet && <button onClick={handleShowFundingModal} className="mt-4 w-full px-6 py-2.5 rounded-lg border border-indigo-600 text-white hover:bg-indigo-600/20 transition-colors text-sm sm:text-base">
                  Add Funds
                </button>}
              </div>

              {/* Token List */}
              <div className="space-y-2">
                {initialLoading && activeWallet && params.userId !== 'template' ? <div className="space-y-2">
                  <LoadingCard/>
                  <LoadingCard/>
                  <LoadingCard/>
                </div> : null}

                {activeWallet && portfolio && <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image src={portfolio.holdings[0].logoURI} alt='SOL' width={40} height={40} className="rounded-full object-contain"/>
                      <div className="flex flex-col justify-start gap-1">
                        <div className="text-white">Solana</div>
                        <div className="flex items-center gap-1 text-sm text-zinc-400">
                          <div className="text-sm">{portfolio.holdings[0].amount}</div>
                          <div className="text-sm">SOL</div>
                        </div> 
                      </div>
                    </div>
                    <div className="text-sm text-zinc-400">${portfolio.holdings[0].usdValue.toFixed(2)}</div>
                  </div>
                </div>}

                {activeWallet ? (
                  tokens.data.map((token: Token) => (
                    <div key={token.token_address} className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Image src={token.token_icon} alt={token.token_name} width={40} height={40} className="rounded-full"/>
                          <div className="flex flex-col justify-start gap-1">
                            <div className="text-white">{token.token_name}</div>
                            <div className="flex items-center gap-1 text-sm text-zinc-400">
                              <div className="text-sm">{token.formatted_amount}</div>
                              <div className="text-sm">{token.token_symbol}</div>
                            </div> 
                          </div>
                        </div>
                        <div className="text-sm text-zinc-400">{token.usd_value && token.usd_value > 0.009 ? '$'+token.usd_value.toFixed(2) : '-'}</div>
                      </div>
                    </div>
                  ))
                ) : null}
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredTools.map((tool) => (
                <ToolCard
                  key={tool.name}
                  tool={tool}
                  isSubscribed={isSubscribed}
                  isDisabled={isToolClickDisabled}
                  onClick={() => handleToolClick(tool)}
                />
              ))}

              {/* FRED Tools Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 my-4">
                  <LineChart className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-lg font-semibold text-white">FRED Economic Data</h3>
                </div>
                <div className="space-y-2">
                  {fredTools.map((tool) => (
                    <ToolCard
                      key={tool.command}
                      tool={tool}
                      isSubscribed={isSubscribed}
                      isDisabled={false}
                      onClick={() => handleToolClick(tool)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <FundingModal
        isOpen={showFundingModal}
        onClose={() => setShowFundingModal(false)}
        onConfirm={handleFundingConfirm}
        defaultAmount={0.1}
      />

      {/* Render modals using portals to attach them to the document body */}
      {activeModal === 'transfer' && (
        <ModalPortal>
          <TransferModal 
            agent={agent}
            isOpen={true}
            onClose={handleCloseModal}
            tokens={tokens.data as any[]}
            solanaBalance={portfolio?.holdings[0] ? {
              amount: portfolio.holdings[0].amount,
              usdValue: portfolio.holdings[0].usdValue,
              logoURI: portfolio.holdings[0].logoURI
            } : undefined}
            onSwapComplete={refreshWalletData}
          />
        </ModalPortal>
      )}

      {activeModal === 'receive' && (
        <ModalPortal>
          <ReceiveModal 
            agent={agent}
            isOpen={true}
            onClose={handleCloseModal}
          />
        </ModalPortal>
      )}

      {activeModal === 'swap' && (
        <ModalPortal>
          <SwapModal 
            isOpen={true}
            onClose={handleCloseModal}
            tokens={tokens.data as any[]}
            solanaBalance={portfolio?.holdings[0] ? {
              amount: portfolio.holdings[0].amount,
              usdValue: portfolio.holdings[0].usdValue,
              logoURI: portfolio.holdings[0].logoURI
            } : undefined}
            agent={agent}
            onSwapComplete={refreshWalletData}
          />
        </ModalPortal>
      )}
    </div>
  );
};

export default ChatSidebar;