// components/chat-sidebar.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WalletIcon, LayoutGrid, SendIcon, QrCode, Repeat2, Sparkles, RefreshCcw, LineChart, XIcon, TrendingUp, Search, ImageIcon, BookOpen, Globe, ChevronDown, CheckIcon } from 'lucide-react';
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
import { Token } from '@/components/tools/token-holdings';

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
    name: 'S&P 500',
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
    isNew: false,
    requiresAuth: true
  },
  {
    name: 'Portfolio Value',
    description: 'View your current portfolio value and holdings',
    command: getToolCommand('portfolio-value') || 'Show me my portfolio value',
    isNew: false,
    requiresAuth: true
  },
  {
    name: 'Agent Portfolio Value',
    description: 'View the agent\'s portfolio value and holdings',
    command: getToolCommand('agent-portfolio-value') || 'Show me your portfolio value',
    isNew: false,
    requiresAuth: true
  },
  {
    name: 'Token Holdings',
    description: 'View your current token holdings and balances',
    command: getToolCommand('token-holdings') || 'Show me my token holdings',
    isNew: false,
    requiresAuth: true
  },
  {
    name: 'Agent Token Holdings',
    description: 'View the agent\'s token holdings and balances',
    command: getToolCommand('agent-token-holdings') || 'Show me your token holdings',
    isNew: false,
    requiresAuth: true
  }
];

// Technical Analysis Tools Section
const technicalAnalysisTools: Tool[] = [
  {
    name: 'Technical Analysis',
    description: 'Get detailed technical analysis for any cryptocurrency',
    command: getToolCommand('technical-analysis') || 'Show me technical analysis for',
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
    isNew: false,
    requiresAuth: false
  },
  {
    name: 'Fear & Greed Index',
    description: 'Check the current market sentiment',
    command: getToolCommand('fear-greed-index') || 'What is the current fear and greed index?',
    isNew: false,
    requiresAuth: false
  },
  {
    name: 'Get Market Categories',
    description: 'Explore different categories of tokens and their performance',
    command: getToolCommand('market-categories') || 'Show me the market categories',
    isNew: false,
    requiresAuth: false
  },
  {
    name: 'Get Total Crypto Market Cap',
    description: 'View the total market capitalization of all cryptocurrencies',
    command: getToolCommand('total-market-cap') || 'Show me the total crypto market cap',
    isNew: false,
    requiresAuth: false
  },
  {
    name: 'Get Derivatives Exchanges',
    description: 'View comprehensive data about cryptocurrency derivatives exchanges',
    command: getToolCommand('derivatives-exchanges') || 'Show me derivatives exchanges',
    isNew: false,
    requiresAuth: false
  }
];

// Research Tools Section
const researchTools: Tool[] = [
  {
    name: 'Deep Research',
    description: 'Perform deep research on cryptocurrency and finance using browser automation',
    command: getToolCommand('web-research') || 'Start research',
    isNew: false,
    requiresAuth: false
  },
  {
    name: 'Stock Analysis',
    description: 'Get comprehensive financial data, news sentiment, and options analysis for any stock',
    command: getToolCommand('stock-analysis') || 'Analyze stock data',
    isNew: false,
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
    isNew: false,
    requiresAuth: false
  },
  {
    name: 'Get Trending Tokens',
    description: 'Discover trending tokens on CoinGecko across all chains',
    command: getToolCommand('trending-tokens') || 'Search for trending tokens',
    isNew: false,
    requiresAuth: false
  },
  {
    name: 'Get Solana Trending Tokens',
    description: 'Discover trending tokens on Solana',
    command: getToolCommand('trending-solana-tokens') || 'Search for trending tokens on Solana',
    isNew: false,
    requiresAuth: false
  },
  {
    name: 'Get Latest Tokens',
    description: 'Discover newly listed tokens on CoinGecko',
    command: getToolCommand('recent-tokens') || 'Search for recently listed tokens',
    isNew: false,
    requiresAuth: false
  },
  {
    name: 'Search Tokens',
    description: 'Search through the complete database of tokens',
    command: getToolCommand('search-tokens') || 'Search for tokens',
    isNew: false,
    requiresAuth: false
  },
  {
    name: 'Get Whale Activity',
    description: 'View the most active whales in the last 24 hours',
    command: getToolCommand('whale-activity') || 'Show me whale activity',
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
    isNew: false,
    requiresAuth: false
  },
  {
    name: 'Track Wallet Activity',
    description: 'Track wallet activity for any Solana wallet address',
    command: getToolCommand('wallet-activity') || 'Show me information about a solana account and track activity',
    isNew: false,
    requiresAuth: false
  },
  {
    name: 'Get Top Token Holders',
    description: 'Identify the largest holders of any specific token',
    command: getToolCommand('top-holders') || 'Show me the top token holders',
    isNew: false,
    requiresAuth: false
  }
];

// NFT Tools Section
const nftTools: Tool[] = [
  {
    name: 'Get Top NFTs',
    description: 'Discover the top NFTs. Filter by volume, floor price, and more',
    command: getToolCommand('top-nfts') || 'Show me the top NFTs',
    isNew: false,
    requiresAuth: false
  }
];

// Network Tools Section
const networkTools: Tool[] = [
  {
    name: 'Get Solana Transaction Volume',
    description: 'Check the current transaction volume across the Solana network',
    command: getToolCommand('solana-transaction-volume') || 'Show me the transaction volume on Solana',
    isNew: false,
    requiresAuth: false
  }
];

const ChatSidebar: React.FC<SidebarProps> = ({ onToolSelect }) => {
  const [isToolClickDisabled, setIsToolClickDisabled] = useState(false);
  const [portfolio, setPortfolio] = useState<any>(null);
  const isSubscribed = true; // Set all users as subscribed to avoid 404 errors
  const [tokens, setTokens] = useState<{ data: Token[]; metadata: { tokens: Record<string, any> } }>({ data: [], metadata: { tokens: {} } });
  const [showFundingModal, setShowFundingModal] = useState(false);
  const { fundWallet } = useFundWallet();
  const { createWallet, wallets, ready } = useSolanaWallets();
  const { user } = usePrivy();
  
  const handleToolClick = (tool: Tool) => {
    if (isToolClickDisabled) return;

    setIsToolClickDisabled(true);

    onToolSelect(tool.command);

    setTimeout(() => {
      setIsToolClickDisabled(false);
    }, 5000);    
  };

  return (
    <div className="h-full flex flex-col">
      {/* Content */}
      <div className="h-full flex flex-col">
        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto pb-24">
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
        </div>
      </div>

    </div>
  );
};

export default ChatSidebar;