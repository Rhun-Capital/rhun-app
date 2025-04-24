// components/chat-sidebar.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { WalletIcon, LayoutGrid, SendIcon, QrCode, Repeat2, Sparkles, RefreshCcw, LineChart, XIcon, TrendingUp, Search, ImageIcon, BookOpen, Globe } from 'lucide-react';
import Image from 'next/image';
import { usePrivy, useLogin, PrivyErrorCode } from '@privy-io/react-auth';
import {useFundWallet} from '@privy-io/react-auth/solana';
import LoadingIndicator from './loading-indicator';
import CopyButton from './copy-button';
import dynamic from 'next/dynamic';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useModal } from '@/contexts/modal-context';
import FundingModal from './funding-amount-modal';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { getToolCommand } from '@/app/config/tool-commands';
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
  requiresAuth: boolean;
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
const SwapButton = ({ tokens, solanaBalance, agent, onSwapComplete, onOpenModal }: TransferButtonProps & { agent: any }) => {
  const { user } = usePrivy();
  const { login } = useLogin();

  return (
    <div className="relative">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          if (!user) {
            login();
            return;
          }
          onOpenModal('swap');
        }}
        className="w-[80px] bg-zinc-800 rounded-lg flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 transition-colors p-2"
      >
        <div className="flex flex-col items-center gap-1 p-2">
          <Repeat2 className="w-[20px] h-[20px]"/>
          <div className="text-sm text-zinc-400">
            Swap
          </div>
        </div>
      </button>
      {!user && (
        <div className="absolute inset-0 bg-zinc-900/80 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <div className="text-sm text-white">Connect Wallet</div>
        </div>
      )}
    </div>
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
  const { authenticated } = usePrivy();
  const { login } = useLogin();
  const canUse = (!tool.isPro || isSubscribed) && !isDisabled;

  const handleClick = () => {
    if (tool.requiresAuth && !authenticated) {
      login();
      return;
    }
    if (canUse) {
      onClick();
    }
  };

  return (
    <div 
      className={`relative group ${
      (canUse || (tool.requiresAuth && !authenticated))
        ? 'cursor-pointer hover:bg-zinc-700 active:bg-zinc-600' 
        : 'cursor-not-allowed opacity-75'
      } bg-zinc-800 p-3 rounded-lg border transition-all duration-200 ${
      tool.isPro 
        ? 'border-indigo-500/50 hover:border-indigo-500' 
        : tool.isNew 
        ? 'border-green-500/50 hover:border-green-500' 
        : 'border-zinc-700'
      }`}
      onClick={handleClick}
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

      {/* Connect wallet overlay for auth-required tools */}
      {tool.requiresAuth && !authenticated && (
        <div className="absolute inset-0 bg-zinc-900/80 rounded-lg flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <div className="text-sm text-white">Connect Wallet</div>
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
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Unemployment Rate',
    description: 'Track unemployment rate trends',
    command: getToolCommand('fred-unemployment') || 'Show me the latest unemployment rate from FRED',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Inflation Data',
    description: 'Monitor CPI and inflation metrics',
    command: getToolCommand('fred-inflation') || 'Show me recent CPI data from FRED',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Interest Rates',
    description: 'View Federal Funds Rate and other interest rates',
    command: getToolCommand('fred-interest-rates') || 'What\'s the current Fed Funds Rate from FRED?',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Market Data',
    description: 'Access S&P 500 and other market indicators',
    command: getToolCommand('fred-market') || 'Show me the S&P 500 index from FRED',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Exchange Rates',
    description: 'Track currency exchange rates',
    command: getToolCommand('fred-exchange') || 'Show me the Euro exchange rate from FRED',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Housing Data',
    description: 'Monitor housing market indicators',
    command: getToolCommand('fred-housing') || 'Show me housing starts from FRED',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Money Supply',
    description: 'View M2 money supply data',
    command: getToolCommand('fred-money') || 'Show me the M2 money supply from FRED',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Federal Debt',
    description: 'Track total federal debt',
    command: getToolCommand('fred-debt') || 'What\'s the total federal debt from FRED?',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Retail Sales',
    description: 'Monitor retail sales trends',
    command: getToolCommand('fred-retail') || 'What\'s the current retail sales from FRED?',
    isNew: true,
    requiresAuth: false
  }
];

// Portfolio Tools Section
const portfolioTools: Tool[] = [
  {
    name: 'Swap Tokens',
    description: 'Swap tokens directly through the chat interface',
    command: getToolCommand('swap-tokens') || 'Swap tokens',
    isNew: true,
    requiresAuth: true
  },
  {
    name: 'Portfolio Value',
    description: 'View your current portfolio value and holdings',
    command: getToolCommand('portfolio-value') || 'Show me my portfolio value',
    isNew: true,
    requiresAuth: true
  },
  {
    name: 'Agent Portfolio Value',
    description: 'View the agent\'s portfolio value and holdings',
    command: getToolCommand('agent-portfolio-value') || 'Show me your portfolio value',
    isNew: true,
    requiresAuth: true
  },
  {
    name: 'Token Holdings',
    description: 'View your current token holdings and balances',
    command: getToolCommand('token-holdings') || 'Show me my token holdings',
    isNew: true,
    requiresAuth: true
  },
  {
    name: 'Agent Token Holdings',
    description: 'View the agent\'s token holdings and balances',
    command: getToolCommand('agent-token-holdings') || 'Show me your token holdings',
    isNew: true,
    requiresAuth: true
  }
];

// Technical Analysis Tools Section
const technicalAnalysisTools: Tool[] = [
  {
    name: 'Technical Analysis',
    description: 'Get detailed technical analysis for any cryptocurrency',
    command: getToolCommand('technical-analysis') || 'Show me a technical analysis for',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'TradingView Chart',
    description: 'View interactive TradingView charts for any asset',
    command: getToolCommand('tradingview-chart') || 'Show me a TradingView chart',
    isNew: true,
    requiresAuth: false
  }
];

// Market Analysis Tools Section
const marketAnalysisTools: Tool[] = [
  {
    name: 'Market Movers',
    description: 'Track the biggest price movers in the market',
    command: getToolCommand('market-movers') || 'Show me the top market movers today',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Fear & Greed Index',
    description: 'Check the current market sentiment',
    command: getToolCommand('fear-greed-index') || 'What is the current fear and greed index?',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Get Market Categories',
    description: 'Explore different categories of tokens and their performance',
    command: getToolCommand('market-categories') || 'Show me the market categories',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Get Total Crypto Market Cap',
    description: 'View the total market capitalization of all cryptocurrencies',
    command: getToolCommand('total-market-cap') || 'Show me the total crypto market cap',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Get Derivatives Exchanges',
    description: 'View comprehensive data about cryptocurrency derivatives exchanges',
    command: getToolCommand('derivatives-exchanges') || 'Show me derivatives exchanges',
    isNew: true,
    requiresAuth: false
  }
];

// Research Tools Section
const researchTools: Tool[] = [
  {
    name: 'Deep Research',
    description: 'Perform deep research on cryptocurrency and finance using browser automation',
    command: getToolCommand('web-research') || 'Start research',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Stock Analysis',
    description: 'Get comprehensive financial data, news sentiment, and options analysis for any stock',
    command: getToolCommand('stock-analysis') || 'Analyze stock data',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Get Latest News',
    description: 'Stay up-to-date with the latest news in the cryptocurrency space',
    command: getToolCommand('news-analysis') || 'Show me the latest news',
    isNew: true,
    requiresAuth: false
  }
];

// Token Discovery Tools Section
const tokenDiscoveryTools: Tool[] = [
  {
    name: 'Get Recent Tokens on DexScreener',
    description: 'Discover the latest tokens listed on DexScreener',
    command: getToolCommand('recent-dexscreener-tokens') || 'Search for recently listed tokens on DexScreener',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Get Trending Tokens',
    description: 'Discover trending tokens on CoinGecko across all chains',
    command: getToolCommand('trending-tokens') || 'Search for trending tokens',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Get Solana Trending Tokens',
    description: 'Discover trending tokens on Solana',
    command: getToolCommand('trending-solana-tokens') || 'Search for trending tokens on Solana',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Get Latest Tokens',
    description: 'Discover newly listed tokens on CoinGecko',
    command: getToolCommand('recent-tokens') || 'Search for recently listed tokens',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Search Tokens',
    description: 'Search through the complete database of tokens',
    command: getToolCommand('search-tokens') || 'Search for tokens',
    isNew: true,
    requiresAuth: false
  }
];

// Wallet Tools Section
const walletTools: Tool[] = [
  {
    name: 'Get Wallet Info',
    description: 'Examine detailed information about any Solana wallet address',
    command: getToolCommand('wallet-info') || 'Show me information about a solana account',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Track Wallet Activity',
    description: 'Track wallet activity for any Solana wallet address',
    command: getToolCommand('wallet-activity') || 'Show me information about a solana account and track activity',
    isNew: true,
    requiresAuth: false
  },
  {
    name: 'Get Top Token Holders',
    description: 'Identify the largest holders of any specific token',
    command: getToolCommand('top-holders') || 'Show me the top token holders',
    isNew: true,
    requiresAuth: false
  }
];

// NFT Tools Section
const nftTools: Tool[] = [
  {
    name: 'Get Top NFTs',
    description: 'Discover the top NFTs. Filter by volume, floor price, and more',
    command: getToolCommand('top-nfts') || 'Show me the top NFTs',
    isNew: true,
    requiresAuth: false
  }
];

// Network Tools Section
const networkTools: Tool[] = [
  {
    name: 'Get Solana Transaction Volume',
    description: 'Check the current transaction volume across the Solana network',
    command: getToolCommand('solana-transaction-volume') || 'Show me the transaction volume on Solana',
    isNew: true,
    requiresAuth: false
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

// Helper function to format numbers with commas
const formatNumberWithCommas = (value: number | undefined | null) => {
  if (value === undefined || value === null) return '0';
  return value.toLocaleString('en-US', { maximumFractionDigits: 8 });
};

// Helper function to format currency with commas
const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null) return '$0.00';
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ChatSidebar: React.FC<SidebarProps> = ({ agent, isOpen, onToggle, onToolSelect, refreshAgent }) => {
  const [activeTab, setActiveTab] = useState<'wallet' | 'tools'>('tools');
  const [isToolClickDisabled, setIsToolClickDisabled] = useState(false);
  const { user, getAccessToken, authenticated } = usePrivy();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [totalValue, setTotalValue] = useState<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const params = useParams();
  const isSubscribed = true; // Set all users as subscribed to avoid 404 errors
  const [tokens, setTokens] = useState<{ data: Token[]; metadata: { tokens: Object } }>({ data: [], metadata: { tokens: Object } });
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [createWalletLoading, setCreateWalletLoading] = useState(false);
  const { fundWallet } = useFundWallet();
  const { createWallet, wallets, ready } = useSolanaWallets();
  const pathname = usePathname();
  const {login} = useLogin();
  // const [isWalletLoading, setIsWalletLoading] = useState(true);

  // Add state to track which modal is open
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Get the active wallet based on whether it's a template agent or not
  const activeWallet = (params.userId === 'template' || pathname === '/') && authenticated
    ? wallets[0]?.address 
    : agent.wallets?.solana;

  // Fetch initial wallet data
  useEffect(() => {
    const fetchInitialData = async () => {
      if (activeWallet && ready && authenticated) {
        try {
          setInitialLoading(true);
          await refreshWalletData();
          setInitialLoading(false);
        } catch (error) {
          console.error('Error fetching initial wallet data:', error);
          setInitialLoading(false);
        }
      }
    };

    fetchInitialData();
  }, [activeWallet, ready, authenticated]);

  // Update loading state when wallet is ready
  // useEffect(() => {
  //   if (!ready) {
  //     setIsWalletLoading(true);
  //     return;
  //   }

  //   // If we're ready but have no wallets, we're not loading - we're disconnected
  //   if (wallets.length === 0) {
  //     setIsWalletLoading(false);
  //     return;
  //   }

  //   if (activeWallet) {
  //     setIsWalletLoading(false);
  //   } else {
  //     // If we're ready but don't have a wallet, we're still loading
  //     setIsWalletLoading(true);
  //   }
  // }, [activeWallet, ready, wallets.length]);

  // Clear wallet data when user is not authenticated
  useEffect(() => {
    if (!user) {
      setPortfolio(null);
      setTotalValue(null);
      setTokens({ data: [], metadata: { tokens: Object } });
      setInitialLoading(false);
      setRefreshLoading(false);
    }
  }, [user]);

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

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto pb-24">
          {activeTab === 'wallet' ? (
            <div className="p-4 space-y-2">
              {/* Wallet Address */}
              <div className="bg-zinc-800 bg-opacity-40 p-4 rounded-lg border border-zinc-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-400">Wallet Address</div>
                  {activeWallet && <button
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
                    {activeWallet ? (
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
                    {totalValue ? formatCurrency(totalValue) : <div className="ml-5"><LoadingIndicator /></div>}
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
                      {portfolio.holdings[0]?.logoURI && (
                        <Image 
                          src={portfolio.holdings[0].logoURI} 
                          alt='SOL' 
                          width={40} 
                          height={40} 
                          className="rounded-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex flex-col justify-start gap-1">
                        <div className="text-white">Solana</div>
                        <div className="flex items-center gap-1 text-sm text-zinc-400">
                          <div className="text-sm">{portfolio.holdings[0]?.amount ? formatNumberWithCommas(portfolio.holdings[0].amount) : '0'}</div>
                          <div className="text-sm">SOL</div>
                        </div> 
                      </div>
                    </div>
                    <div className="text-sm text-zinc-400">{portfolio.holdings[0]?.usdValue ? formatCurrency(portfolio.holdings[0].usdValue) : '$0.00'}</div>
                  </div>
                </div>}

                {activeWallet ? (
                  tokens.data.map((token: Token) => (
                    <div key={token.token_address} className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {token.token_icon && (
                            <Image 
                              src={token.token_icon} 
                              alt={token.token_name} 
                              width={40} 
                              height={40} 
                              className="rounded-full"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          )}
                          <div className="flex flex-col justify-start gap-1">
                            <div className="text-white">{token.token_name}</div>
                            <div className="flex items-center gap-1 text-sm text-zinc-400">
                              <div className="text-sm">{formatNumberWithCommas(token.formatted_amount)}</div>
                              <div className="text-sm">{token.token_symbol}</div>
                            </div> 
                          </div>
                        </div>
                        <div className="text-sm text-zinc-400">{token.usd_value && token.usd_value > 0.009 ? formatCurrency(token.usd_value) : '-'}</div>
                      </div>
                    </div>
                  ))
                ) : null}
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {/* Portfolio Tools Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 my-4">
                  <WalletIcon className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-lg font-semibold text-white">Portfolio Tools</h3>
                </div>
                <div className="space-y-2">
                  {portfolioTools.map((tool) => (
                    <ToolCard
                      key={tool.command}
                      tool={tool}
                      isSubscribed={isSubscribed}
                      isDisabled={!user && tool.requiresAuth}
                      onClick={() => handleToolClick(tool)}
                    />
                  ))}
                </div>
              </div>

              {/* Technical Analysis Tools Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 my-4">
                  <LineChart className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-lg font-semibold text-white">Technical Analysis</h3>
                </div>
                <div className="space-y-2">
                  {technicalAnalysisTools.map((tool) => (
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

              {/* Market Analysis Tools Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 my-4">
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-lg font-semibold text-white">Market Analysis</h3>
                </div>
                <div className="space-y-2">
                  {marketAnalysisTools.map((tool) => (
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

              {/* Token Discovery Tools Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 my-4">
                  <Search className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-lg font-semibold text-white">Token Discovery</h3>
                </div>
                <div className="space-y-2">
                  {tokenDiscoveryTools.map((tool) => (
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

              {/* Wallet Tools Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 my-4">
                  <WalletIcon className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-lg font-semibold text-white">Wallet Tools</h3>
                </div>
                <div className="space-y-2">
                  {walletTools.map((tool) => (
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

              {/* Research Tools Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 my-4">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-lg font-semibold text-white">Research Tools</h3>
                </div>
                <div className="space-y-2">
                  {researchTools.map((tool) => (
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

      {/* Render FundingModal using ModalPortal */}
      {showFundingModal && (
        <ModalPortal>
          <FundingModal
            isOpen={showFundingModal}
            onClose={() => setShowFundingModal(false)}
            onConfirm={handleFundingConfirm}
            defaultAmount={0.1}
          />
        </ModalPortal>
      )}

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