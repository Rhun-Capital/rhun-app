"use client";

import { useCallback, useEffect, useRef, useState, useMemo, memo } from "react";
import { useChat } from "ai/react";
import type { DragEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { Message } from '@ai-sdk/ui-utils';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';


// Define custom types for tool invocations
interface ToolResult {
  _storedInS3?: boolean;
  _s3Reference?: {
    key: string;
  };
  preview?: string;
  [key: string]: any;
}

interface HolderData {
  address: string;
  balance: string;
  percentage: number;
  rank?: number;
}

interface BaseToolInvocation {
  toolName: string;
  toolCallId: string;
  args: Record<string, any>;
  status?: string;
  result?: any;
}

interface ToolResultInvocation extends BaseToolInvocation {
  state: 'result';
  result: any;
}

interface ToolPartialInvocation extends BaseToolInvocation {
  state: 'partial-call';
  result?: any;
}

interface ToolCallInvocation extends BaseToolInvocation {
  state: 'call';
  result?: any;
}

type CustomToolInvocation = ToolResultInvocation | ToolPartialInvocation | ToolCallInvocation;

// Define our own Message type to match the AI SDK's Message type
interface CustomMessage extends Omit<Message, 'toolInvocations'> {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'data';
  content: string;
  toolInvocations?: CustomToolInvocation[];
  messageId?: string;
  createdAt?: Date;
  experimental_attachments?: Array<{
    name: string;
    url: string;
    contentType: string;
  }>;
}

// Create a type guard to check if a message has tool invocations
function hasToolInvocations(message: any): message is CustomMessage {
  return message && Array.isArray(message.toolInvocations);
}

// Create a type guard for result invocations
function isToolResultInvocation(tool: CustomToolInvocation): tool is ToolResultInvocation {
  return 'state' in tool && tool.state === 'result';
}

// Create a type guard for tool invocations with S3 results
function hasS3Result(tool: CustomToolInvocation): tool is ToolResultInvocation & { result: { _storedInS3: true } } {
  return isToolResultInvocation(tool) && tool.result && '_storedInS3' in tool.result && tool.result._storedInS3 === true;
}

// UI Components
import LoadingIndicator from "@/components/loading-indicator";
import ChatSidebar from '@/components/chat-sidebar';
import CopyButton from '@/components/copy-button';

// Auth & Web3
import { usePrivy, useLogin } from "@privy-io/react-auth";
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { useFundWallet } from "@privy-io/react-auth/solana";

// Contexts
import { useRecentChats } from '@/contexts/chat-context';
import { useModal } from "@/contexts/modal-context";

// Modals
import TransferModal from "@/components/send-button";
import ReceiveModal from "@/components/receive-button";
import SwapModal from "@/components/swap-button";
import FundingModal from "@/components/funding-amount-modal";

// Tools
import MarketMovers from "@/components/tools/market-movers";
import TokenInfo from "@/components/tools/token-info";
import SearchTokens from "@/components/tools/search-tokens";
import TotalCryptoMarketCap from "@/components/tools/total-crypto-marketcap";
import MarketCategories from "@/components/tools/market-categories";
import DerivativesExchanges from "@/components/tools/derivatives-exchanges";
import RecentCoinsResults from "@/components/tools/recent-coins";
import TopHoldersDisplay from "@/components/tools/get-top-holders";
import SolanaBalance from "@/components/tools/solana-balance";
import PortfolioValue from "@/components/tools/portfolio-value";
import TokenHoldings from "@/components/tools/token-holdings";
import FearAndGreedIndex from "@/components/tools/fear-and-greed-index";
import SolanaTransactionVolume from "@/components/tools/solana-transaction-volume";
import AccountInfo from "@/components/tools/account-info";
import TopNFTsResults from "@/components/tools/top-nfts";
import ExecuteSwap from "@/components/tools/execute-swap";
import RecentDexScreenerTokens from "@/components/tools/recent-dexscreener-tokens";
import RecentNews from "@/components/tools/recent-news";
import NewsAnalysis from "@/components/tools/news-analysis";
import WebResearch from "@/components/tools/web-research";
import TradingViewChart from "@/components/tools/tradingview-chart";
import TechnicalAnalysis from '@/components/tools/technical-analysis';
import FredAnalysis from '@/components/tools/fred-analysis';
import { FredSearch } from '@/components/tools/fred-search';

// Utility functions
import { getToolCommand } from '@/app/config/tool-commands';
import { getToolDisplayName, generateToolDescription, getToolIcon } from '@/app/config/tool-display';

// Icons
import { 
  XIcon, 
  RefreshCcw, 
  SendIcon, 
  QrCode, 
  WalletIcon,
  PiggyBank,
  Coins,
  TrendingUp,
  LayoutGrid,
  Layers,
  Building,
  Gauge,
  Activity,
  Info,
  Search,
  File,
  Users,
  Rocket,
  Flame,
  Image as ImageIcon,
  List,
  User as UserIcon,
  ArrowLeftRight,
  LineChart,
  BarChart,
  Newspaper,
  BarChart2,
  Percent,
  FileText,
  Globe,
  Database,
  PieChart,
  ChevronDown,
  CheckIcon,
  Repeat2,
  FileImage as AttachmentIcon
} from "lucide-react";

import { useWalletData } from '@/app/hooks/useWalletData';
import DelegateWalletButton from '@/components/delegate-wallet-button';

interface Agent {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  userId: string;
}

const DEFAULT_AGENT: Agent = {
  id: 'cc425065-b039-48b0-be14-f8afa0704357',
  name: 'Rhun Capital',
  description: 
    'Meet Rhun Capital, your all-in-one crypto research partner equipped with a comprehensive ' +
    'suite of tools to navigate the dynamic digital asset landscape. Rhun Capital enables you to explore ' +
    'detailed token information, track the latest launches, and scrutinize token distributions—including ' +
    'data on top token holders—to uncover valuable insights. Leverage market sentiment indicators to ' +
    'understand prevailing market emotions and refine your investment strategies, while comparing market ' +
    'categories and evaluating data from exchanges to reveal emerging opportunities and risks. Whether ' +
    "you're managing your own portfolio or seeking an in-depth market analysis, our data-driven approach " +
    'and specialized tools provide you with the insights needed for smarter crypto investing.',
  imageUrl: 'https://d1olseq3j3ep4p.cloudfront.net/agents/cc425065-b039-48b0-be14-f8afa0704357/profile-1738538619696.jpg',
  userId: 'template'
};

const TextFilePreview = ({ file }: { file: File | string }) => {
  const [content, setContent] = useState<string>('');
  
  useEffect(() => {
    if (typeof file === 'string') {
      setContent(file);
    } else if (file instanceof Blob) {
      const reader = new FileReader();
      reader.onload = (e) => setContent(e.target?.result as string);
      reader.readAsText(file);
    }
  }, [file]);

  return <pre className="whitespace-pre-wrap text-xs">{content}</pre>;
};

// Helper function to safely get URLs for attachments
const getAttachmentUrl = (attachment: any): string => {
  if (attachment.url) {
    // If it's already a URL, return it
    return attachment.url;
  } else if (attachment.type?.startsWith('image/')) {
    // If it's a fresh file upload, create object URL
    return URL.createObjectURL(attachment);
  }
  return '';
};

const AttachmentDisplay = ({ attachment }: { attachment: any }) => {
  // Handle fresh file uploads (experimental_attachments)
  if (attachment.type?.startsWith('image/')) {
    return (
      <img 
        src={URL.createObjectURL(attachment)} 
        alt={attachment.name} 
        className="h-40 w-40 object-cover rounded-md"
      />
    );
  }
  
  if (attachment.type?.startsWith('text/')) {
    return (
      <div className="h-40 w-40 p-2 text-[8px] bg-zinc-800 rounded-md border border-zinc-700 overflow-hidden">
        <TextFilePreview file={attachment} />
      </div>
    );
  }
  
  // Handle stored attachments from API (contentType and url structure)
  if (attachment.contentType?.startsWith('image/') && attachment.url) {
    return (
      <img 
        src={attachment.url} 
        alt={attachment.name || 'Image attachment'} 
        className="h-40 w-40 object-cover rounded-md"
      />
    );
  }
  
  if (attachment.contentType?.startsWith('text/') && attachment.url) {
    return (
      <div className="h-40 w-40 p-2 text-[8px] bg-zinc-800 rounded-md border border-zinc-700 overflow-hidden">
        <span className="text-xs truncate">{attachment.name || 'Text file'}</span>
      </div>
    );
  }
  
  // Default fallback
  return (
    <div className="h-40 w-40 p-2 text-[8px] bg-zinc-800 rounded-md border border-zinc-700 overflow-hidden flex items-center justify-center">
      <span className="text-[8px] truncate">{attachment.name || 'Attachment'}</span>
    </div>
  );
};

const CollapsibleDescription = ({ text }: { text: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 100; // Adjust this value to change initial visible length
  const needsShowMore = text.length > maxLength;

  return (
    <div className="relative">
      <p className="text-base sm:text-lg">
        {isExpanded ? text : `${text.slice(0, maxLength)}${needsShowMore ? '...' : ''}`}
      </p>
      {needsShowMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm mt-2"
        >
          {isExpanded ? 'Show Less' : 'Read More'}
        </button>
      )}
    </div>
  );
};

interface EmptyStateProps {
  agent: any;
  userId: string;
  agentId: string;
  onDescribeTools: () => void;
}

const EmptyState = ({ agent, onDescribeTools }: EmptyStateProps) => {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="border rounded-xl p-4 sm:p-8 flex flex-col items-center gap-4 sm:gap-6 text-zinc-400 border-zinc-700 bg-zinc-800/30">
        {/* Agent Image/Icon with responsive sizing */}
        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-zinc-700 flex items-center justify-center">
          
            <img 
              src={agent.imageUrl}
              alt={agent.name}
              className="w-full h-full object-cover"
            />
          
        </div>

        {/* Agent Name - responsive font size */}
        <h2 className="text-xl sm:text-2xl font-semibold text-white text-center">
          Hello, I&apos;m {agent.name}
        </h2>

        {/* Welcome Message - responsive text and spacing */}
        <div className="text-center space-y-3 sm:space-y-4 px-2 sm:px-4">
          <CollapsibleDescription text={agent.description} />
          <p className="text-xs text-zinc-400">
          You can also drag and drop files here to send them as attachments. You can
          send images and text files. Learn more about my capabilities in the{' '}
            <Link
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
              href="https://rhun-capital.gitbook.io/"
              target="_blank"
            >
              documentation
            </Link>
            .
          </p>
        </div>

        {/* Action Buttons - Stack on mobile, side by side on desktop */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto mt-2">
          <button
            onClick={onDescribeTools}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-indigo-400 text-white hover:bg-indigo-400/20 transition-colors text-sm sm:text-base"
          >
            View Available Tools
          </button>
        </div>
      </div>
    </div>
  );
};

// Create a non-SSR version of the component 
const NoSSRHomeContent = dynamic(() => Promise.resolve(HomeContent), {
  ssr: false,
});

// Move WalletContent outside and memoize it
const WalletContent = memo(({ 
  templateWallet,
  user,
  authenticated,
  login,
  wallets
}: { 
  templateWallet: string | null;
  user: any;
  authenticated: boolean;
  login: () => void;
  wallets: any[];
}) => {
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [selectedWalletAddress, setSelectedWalletAddress] = useState<string | null>(null);
  const [fundingAmount, setFundingAmount] = useState(0.1);
  const { fundWallet } = useFundWallet();
  const { openModal, closeModal } = useModal();
  
  // Function to toggle wallet dropdown
  const toggleWalletDropdown = () => {
    setIsWalletDropdownOpen(!isWalletDropdownOpen);
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.wallet-selector-wrapper')) {
        setIsWalletDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Get the active wallet based on selectedWalletAddress, user's wallet or the templateWallet
  const activeWallet = selectedWalletAddress || templateWallet || (user?.wallet?.address);

  // Save selectedWalletAddress to localStorage
  useEffect(() => {
    if (selectedWalletAddress) {
      try {
        localStorage.setItem('rhun_selected_wallet_address', selectedWalletAddress);
      } catch (e) {
        console.error("Error saving to localStorage:", e);
      }
    }
  }, [selectedWalletAddress]);
  
  // Initialize wallet selector from localStorage
  useEffect(() => {
    try {
      const savedWallet = localStorage.getItem('rhun_selected_wallet_address');
      if (savedWallet) {
        setSelectedWalletAddress(savedWallet);
      }
    } catch (e) {
      console.error("Error accessing localStorage:", e);
    }
  }, []);

  // Use the hook
  const { portfolio, totalValue, tokens, initialLoading, refreshWalletData } = useWalletData(
    activeWallet || null,
    authenticated
  );

  const formatNumberWithCommas = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '0';
    
    // Convert to string and split on decimal point
    const parts = value.toString().split('.');
    const wholePart = parts[0];
    const decimalPart = parts[1];
    
    // Only add commas if the whole number part is greater than 1000
    const formattedWholePart = Math.abs(parseInt(wholePart)) >= 1000 
      ? wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      : wholePart;
    
    // Return with decimal part if it exists
    return decimalPart 
      ? `${formattedWholePart}.${decimalPart}`
      : formattedWholePart;
  };
  
  const formatWalletAddress = (address: string | undefined | null) => {
    if (!address) return '';
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };
  
  // Update the refresh function to use the hook's refreshWalletData
  const handleRefreshWalletData = async () => {
    if (!activeWallet || !authenticated) {
      return;
    }
    
    try {
      setRefreshLoading(true);
      await refreshWalletData();
    } catch (error) {
      console.error('Error refreshing wallet data:', error);
    } finally {
      setTimeout(() => setRefreshLoading(false), 1000);
    }
  };
  
  // Handler for funding the wallet
  const handleFundingConfirm = async (amount: number) => {
    if (activeWallet) {
      try {
        await fundWallet(activeWallet, {
          amount: amount.toString(),
        });
        setIsFundingModalOpen(false);
        closeModal();
        handleRefreshWalletData();
      } catch (error) {
        console.error('Error funding wallet:', error);
      }
    }
  };
  
  if (!authenticated) {
    return (
      <div className="p-8 text-center">
        <WalletIcon className="mx-auto w-12 h-12 text-indigo-500 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Connect your wallet</h2>
        <p className="text-zinc-400 mb-6">
          Connect your wallet to view your balance and tokens.
        </p>
        <button 
          onClick={() => login()}
          className="px-6 py-2.5 rounded-lg border border-indigo-400 text-white hover:bg-indigo-400/20 transition-colors w-full"
        >
          Connect Wallet
        </button>
      </div>
    );
  }
  
  if (!activeWallet) {
    return (
      <div className="p-8 text-center">
        <WalletIcon className="mx-auto w-12 h-12 text-indigo-500 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">No wallet connected</h2>
        <p className="text-zinc-400 mb-6">
          No wallet address found. Please select a wallet to continue.
        </p>
      </div>
    );
  }
  
  return (
    <div className="p-4 space-y-4">
      {/* Wallet Address */}
      <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <WalletIcon className="w-5 h-5 text-indigo-400" />
            <div className="flex flex-col gap-1 wallet-selector-wrapper relative">
              <div 
                className="text-sm text-zinc-300 truncate max-w-[250px] cursor-pointer flex items-center gap-1 hover:text-white"
                onClick={toggleWalletDropdown}
              >
                <span>{formatWalletAddress(activeWallet)}</span>
                {wallets && wallets.length > 0 && (
                  <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${isWalletDropdownOpen ? 'rotate-180' : ''}`} />
                )}
              </div>
              
              {/* Wallet dropdown when opened */}
              {isWalletDropdownOpen && wallets && wallets.length > 0 && (
                <div className="absolute z-50 mt-1 top-6 left-0 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg p-1 min-w-[250px]">
                  {wallets.map((wallet) => (
                    <div 
                      key={wallet.address}
                      onClick={() => {
                        setSelectedWalletAddress(wallet.address);
                        setIsWalletDropdownOpen(false);
                      }}
                      className={`flex items-center gap-2 p-2 hover:bg-zinc-700 rounded-md cursor-pointer ${
                        activeWallet === wallet.address ? 'bg-zinc-700' : ''
                      }`}
                    >
                      <WalletIcon className="w-4 h-4 text-indigo-400" />
                      <div className="text-sm text-zinc-300 truncate max-w-[200px]">
                        {formatWalletAddress(wallet.address)}
                      </div>
                      {activeWallet === wallet.address && (
                        <CheckIcon className="w-4 h-4 text-green-500 ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors rounded-md hover:bg-zinc-700"
              title="Refresh wallet data"
              onClick={async () => {
                setRefreshLoading(true);
                await handleRefreshWalletData();
                setTimeout(() => setRefreshLoading(false), 1000);
              }}
            >
              {refreshLoading ? <LoadingIndicator/> : <RefreshCcw className="w-4 h-4"/>}
            </button>
            <CopyButton text={activeWallet} />
          </div>
        </div>
        
        {/* Portfolio Value */}
        {totalValue !== null ? (
          <div className="pt-2 border-t border-zinc-700">
            <div className="text-sm text-zinc-400">Total Value</div>
            <div className="text-xl font-semibold text-white">
              {formatCurrency(totalValue)}
            </div>
          </div>
        ) : 
        <div className="pt-2 border-t border-zinc-700">
          <div className=" bg-zinc-700 w-20 h-4 rounded-lg animate-pulse h-[10px] mb-2"></div>
          <div className="bg-zinc-700 w-32 h-4 rounded-lg animate-pulse h-[15px] mb-4"></div>
        </div>
        }
      </div>
      
      <div className="flex flex-col gap-3 justify-center">
        {/* Actions Section - Moved above the asset list */}
        <div className="flex gap-3 justify-center">
          <button 
            className={`px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-colors flex items-center gap-2 ${(initialLoading || !totalValue || tokens.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => setIsTransferModalOpen(true)}
            disabled={initialLoading || !totalValue || tokens.length === 0}
          >
            <SendIcon className="w-4 h-4" />
            Send
          </button>
          
          <button 
            className={`px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-colors flex items-center gap-2 ${initialLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => setIsReceiveModalOpen(true)}
            disabled={initialLoading}
          >
            <QrCode className="w-4 h-4" />
            Receive
          </button>
          
          <button 
            className={`px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-colors flex items-center gap-2 ${(initialLoading || !totalValue || tokens.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => setIsSwapModalOpen(true)}
            disabled={initialLoading || !totalValue || tokens.length === 0}
          >
            <Repeat2 className="w-4 h-4" />
            Swap
          </button>
        </div>

        <button 
            className={`mt-4 w-full px-6 py-2.5 rounded-lg border border-indigo-400 text-white hover:bg-indigo-600/20 transition-colors text-sm sm:text-base ${initialLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => {
              setIsFundingModalOpen(true);
              openModal();
            }}
            disabled={initialLoading}
          >
            Add Funds
          </button>
        </div>
      
      {/* Token List */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white px-1">Your Assets</h3>
        
        {initialLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-zinc-800 p-3 rounded-lg border border-zinc-700 h-[65px]">
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
              </div>
            ))}
          </div>
        ) : (
          <>
            {portfolio && portfolio.holdings && portfolio.holdings[0] && (
              <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {portfolio.holdings[0].logoURI && (
                      <img 
                        src={portfolio.holdings[0].logoURI} 
                        alt="SOL" 
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
                        <div className="text-sm">{formatNumberWithCommas(portfolio.holdings[0].amount)}</div>
                        <div className="text-sm">SOL</div>
                      </div> 
                    </div>
                  </div>
                  <div className="text-sm text-zinc-400">
                    {formatCurrency(portfolio.holdings[0].usdValue)}
                  </div>
                </div>
              </div>
            )}

            {tokens.length > 0 ? (
              tokens.map((token) => (
                <div key={token.token_address} className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {token.token_icon && (
                        <img 
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
                    <div className="text-sm text-zinc-400">
                      {token.usd_value && token.usd_value > 0.009 ? formatCurrency(token.usd_value) : '-'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-zinc-400">
                {!initialLoading && 'No tokens found in this wallet.'}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Automated Trading Card - Only show for non-primary wallets - Temporarily Disabled
      {activeWallet && user?.wallet?.address && activeWallet !== user.wallet.address && (
        <div className="p-6 bg-zinc-800 bg-opacity-40 border border-zinc-700 rounded-lg mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Automated Trading</h3>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            Enable automated trading based on technical analysis signals. This allows the system to execute trades on your behalf when specific conditions are met.
          </p>
          <DelegateWalletButton 
            walletAddress={activeWallet} 
            chainType="solana"
            onSuccess={handleRefreshWalletData}
          />
        </div>
      )}
      */}
      
      {/* Modal Components */}
      {activeWallet && (
        <>
          <TransferModal
            isOpen={isTransferModalOpen}
            onClose={() => setIsTransferModalOpen(false)}
            tokens={tokens}
            solanaBalance={portfolio?.holdings[0] ? {
              amount: portfolio.holdings[0].amount,
              usdValue: portfolio.holdings[0].usdValue,
              logoURI: portfolio.holdings[0].logoURI
            } : undefined}
            agent={{
              wallets: { solana: activeWallet }
            }}
            onSwapComplete={handleRefreshWalletData}
          />
          
          <ReceiveModal
            isOpen={isReceiveModalOpen}
            onClose={() => setIsReceiveModalOpen(false)}
            agent={{
              wallets: { solana: activeWallet }
            }}
          />
          
          <SwapModal
            isOpen={isSwapModalOpen}
            onClose={() => setIsSwapModalOpen(false)}
            tokens={tokens}
            solanaBalance={portfolio?.holdings[0] ? {
              amount: portfolio.holdings[0].amount,
              usdValue: portfolio.holdings[0].usdValue,
              logoURI: portfolio.holdings[0].logoURI
            } : undefined}
            agent={{
              wallets: { solana: activeWallet }
            }}
            onSwapComplete={handleRefreshWalletData}
          />
        </>
      )}

      {/* Standalone FundingModal */}
      <FundingModal
        isOpen={isFundingModalOpen}
        onClose={() => {
          setIsFundingModalOpen(false);
          closeModal();
        }}
        onConfirm={handleFundingConfirm}
        defaultAmount={fundingAmount}
      />
    </div>
  );
});

WalletContent.displayName = 'WalletContent';

export default function Home() {
  return (
    <Suspense fallback={
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B' }}>
        <div className="text-center">
          <LoadingIndicator/>
          <p className="mt-4 text-zinc-400">Loading...</p>
        </div>
      </div>
    }>
      <NoSSRHomeContent />
      <style jsx global>{`
        /* Force mobile containment - aggressive approach */
        @media (max-width: 768px) {
          .chat-scrollable {
            overflow-x: hidden !important;
          }
          
          .tool-wrapper {
            max-width: 100%;
            overflow-x: auto;
            margin: 0;
            padding: 0;
            display: block;
            -webkit-overflow-scrolling: touch;
          }
          
          .tool-wrapper table {
            width: 100%;
            max-width: 100%;
            table-layout: fixed;
            font-size: 0.75rem;
          }
          
          .tool-wrapper td, 
          .tool-wrapper th {
            padding: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 40px;
          }
          
          .tool-wrapper pre, 
          .tool-wrapper code {
            max-width: 100%;
            overflow-x: auto;
            white-space: pre-wrap;
            font-size: 0.75rem;
          }
          
          .message-content {
            max-width: 100%;
            overflow-wrap: break-word;
            padding-right: 0;
          }
          
          .tool-wrapper div[class*="market"], 
          .tool-wrapper div[class*="token"], 
          .tool-wrapper div[class*="chart"],
          .tool-wrapper div[class*="holder"],
          .tool-wrapper div[class*="transaction"] {
            max-width: 100%;
            overflow-x: auto;
          }
          
          /* Fix text colors without breaking Tailwind */
          .tool-wrapper *:not([class*="text-"]) {
            color: #fff;
          }

          /* Ensure text wrapping */
          .tool-wrapper {
            word-break: break-word;
            overflow-wrap: break-word;
          }
        }
        
        /* Desktop remains untouched */
        @media (min-width: 769px) {
          .tool-wrapper {
            width: auto;
            overflow: visible;
          }
          
          .tool-wrapper table {
            width: auto;
            table-layout: auto;
          }
        }
      `}</style>
    </Suspense>
  );
}

function HomeContent() {
  // Move refreshKey to a ref to prevent re-renders
  const refreshKeyRef = useRef(0);
  const isFirstRender = useRef(true);

  // Update the refresh function to use the ref
  const refreshTradingView = useCallback(() => {
    refreshKeyRef.current += 1;
    // Force a re-render of just the TradingView component
    const event = new CustomEvent('tradingview-refresh', { detail: refreshKeyRef.current });
    window.dispatchEvent(event);
  }, []);

  // Memoize the renderToolInvocation function
  const renderToolInvocation = useCallback((tool: any, wrapper?: (component: React.ReactNode) => React.ReactNode) => {
    const wrappedTool = (component: React.ReactNode) => {
      return wrapper ? wrapper(component) : component;
    };
    
    // If the result is stored in S3, show a loading state
    if (tool.result?._storedInS3) {
      return wrappedTool(
        <div className="p-4 bg-zinc-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin">
              <RefreshCcw size={16} className="text-indigo-400" />
            </div>
            <div className="text-sm text-zinc-400">
              {tool.result.preview || 'Loading result...'}
            </div>
          </div>
        </div>
      );
    }
    
    switch(tool.toolName) {
      case 'getUserSolanaBalance':
        return wrappedTool(<SolanaBalance key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      case 'getAgentSolanaBalance':
        return wrappedTool(<SolanaBalance key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      case 'getUserPortfolioValue':
        return wrappedTool(<PortfolioValue key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      case 'getAgentPortfolioValue':
        return wrappedTool(<PortfolioValue key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      case 'getUserTokenHoldings':
        return wrappedTool(<TokenHoldings key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      case 'getFearAndGreedIndex':
        return wrappedTool(<FearAndGreedIndex key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      case 'getSolanaTransactionVolume':
        return wrappedTool(<SolanaTransactionVolume key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      case 'getAgentTokenHoldings':
        return wrappedTool(<TokenHoldings key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      case 'getMarketMovers':
        return wrappedTool(<MarketMovers key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      case 'getRecentlyLaunchedCoins':
        return wrappedTool(<RecentCoinsResults key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      case 'getTokenInfo':
        return wrappedTool(<TokenInfo key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      case 'searchTokens':
        return wrappedTool(<SearchTokens key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      case 'getContractAddress':
        return wrappedTool(<SearchTokens key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      case 'getTotalCryptoMarketCap':
        return wrappedTool(<TotalCryptoMarketCap key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      case 'getMarketCategories':
        return wrappedTool(<MarketCategories key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      case 'getDerivativesExchanges':
        return wrappedTool(<DerivativesExchanges key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      case 'getTopHolders':
        if (!('address' in tool.args) || typeof tool.args.address !== 'string') {
          return null;
        }
        return wrappedTool(
          <TopHoldersDisplay 
            key={tool.toolCallId} 
            toolCallId={tool.toolCallId} 
            toolInvocation={tool as CustomToolInvocation}
          />
        );
      case 'getAccountDetails':
        return wrappedTool(<AccountInfo key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      // case 'getTrendingTokens':
      //   return tool.args.chain === 'solana' 
      //     ? wrappedTool(<TrendingSolanaTokens key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>)
      //     : wrappedTool(<TrendingCoins key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
      case 'getTopNfts':
        return wrappedTool(<TopNFTsResults key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} />);
      case 'swap':
        return wrappedTool(
          <ExecuteSwap 
            key={tool.toolCallId} 
            toolCallId={tool.toolCallId} 
            toolInvocation={tool} 
          />
        );
      case 'getRecentDexScreenerTokens':
        return wrappedTool(<RecentDexScreenerTokens key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} />);
      case 'getCryptoNews':
        return wrappedTool(
          <RecentNews key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} />
        );
      
      case 'newsAnalysis':
        return wrappedTool(
          <NewsAnalysis key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} />
        );     
        
      case 'webResearch':
        return wrappedTool(
          <WebResearch key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} />
        );
      case 'getTradingViewChart':
        return wrappedTool(
          <TradingViewChart 
            key={tool.toolCallId}
            toolCallId={tool.toolCallId} 
            toolInvocation={tool} 
          />
        );
      case 'getTechnicalAnalysis':
        return "result" in tool ? wrappedTool(
          <TechnicalAnalysis data={tool.result} />
        ) : null;
      case 'getFredSeries':
        return wrappedTool(
          <FredAnalysis key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} />
        );
      case 'fredSearch':
        return wrappedTool(
          <FredSearch 
            key={tool.toolCallId} 
            toolCallId={tool.toolCallId} 
            toolInvocation={tool}
            onShowChart={(seriesId) => {
              const command = `Show me the FRED series ${seriesId}`;
              // Close the sidebar on mobile
              if (window.innerWidth < 768) {
                setSidebarOpen(false);
              }
              handleToolSelect(command);
            }}
          />
        );
      default:
        return null;
    }
  }, []); // Empty dependency array since this function doesn't depend on any props or state

  const params = useParams();
  const agentId = 'cc425065-b039-48b0-be14-f8afa0704357'
  const searchParams = useSearchParams();
  const chatId = decodeURIComponent(searchParams.get('chatId') || '');
  const [agent, setAgent] = useState<any>(DEFAULT_AGENT);
  const [files, setFiles] = useState<FileList | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [savedInput, setSavedInput] = useState("");
  const [newChatId] = useState<string>(`chat_template_${Date.now()}`);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'tools' | 'artifacts' | 'wallet'>('tools');
  const [selectedArtifact, setSelectedArtifact] = useState<any>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const { isAnyModalOpen } = useModal();
  // Handle tool query parameter (Now placed after dependencies)
  const hasTriggeredTool = useRef(false);
  const router = useRouter();  
  const { user, getAccessToken, ready, authenticated } = usePrivy();
  const { refreshRecentChats } = useRecentChats();
  const [headers, setHeaders] = useState<any>();
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [isHeadersReady, setIsHeadersReady] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { wallets } = useSolanaWallets();
  const pathname = usePathname();
  const savedWallet = localStorage.getItem('rhun_selected_wallet_address');
  const templateWallet = params.userId === 'template' || pathname === '/' 
    ? savedWallet || wallets[0]?.address 
    : null
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const { login } = useLogin();

  // Remove input padding state since we're not using fixed positioning anymore
  const [inputPadding, setInputPadding] = useState("16px");

  // Update input padding based on sidebar state - we can remove this effect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (sidebarOpen && window.innerWidth >= 768) {
        setInputPadding(activeTab === 'artifacts' ? 'calc(50% + 16px)' : '416px'); // 400px + 16px
      } else {
        setInputPadding('16px');
      }
    }
  }, [sidebarOpen, activeTab]);

  // Check if this is a template chat
  const isTemplate = chatId?.startsWith('chat_template_');

  // Initialize chat with template settings if needed
  const { messages, input, handleSubmit, handleInputChange, isLoading, append } = useChat({
    headers,
    body: { 
      agent, 
      user,
      templateWallet,
      isTemplate
    },
    maxSteps: 30,
    initialMessages: initialMessages as Message[],
    sendExtraMessageFields: true,
    id: chatId || newChatId,
    onError: () => {
      toast.error('Failed to send message. Please try again.')
    },
    onFinish: async (message) => {   
      // Debounced save is handled in a separate useEffect
    }
  }) as {
    messages: CustomMessage[];
    input: string;
    handleSubmit: (e: any, options?: any) => void;
    handleInputChange: (e: any) => void;
    isLoading: boolean;
    append: (message: { role: 'user' | 'assistant' | 'system' | 'function'; content: string }) => void;
  };

  // Load initial messages
  const loadInitialMessages = useCallback(async (): Promise<void> => {
    if (!chatId) return;
    
    try {
      const token = await getAccessToken();
      const response = await fetch(
        `/api/chat/${chatId}?userId=${encodeURIComponent(user?.id || '')}&isTemplate=${isTemplate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to load chat history');
      
      const data = await response.json();
      
      if (data.messages && data.messages.length > 0) {
        // Convert string dates to Date objects and preserve all tool data
        const formattedMessages: CustomMessage[] = data.messages.map((msg: any) => ({
          id: msg.messageId,
          createdAt: new Date(msg.createdAt),
          role: msg.role,
          content: msg.content,
          experimental_attachments: msg.attachments?.map((attachment: any) => ({
            name: attachment.name,
            url: attachment.url,
            contentType: attachment.contentType,
          })),            
          toolInvocations: msg.toolInvocations?.map((tool: any) => {
            // Base tool invocation properties
            const baseTool = {
              toolName: tool.toolName,
              toolCallId: tool.toolCallId,
              args: tool.args,
              status: tool.status
            };

            // If the tool has a result, it's a result invocation
            if (tool.result) {
              return {
                ...baseTool,
                state: 'result' as const,
                result: {
                  ...tool.result,
                  // Preserve S3 metadata if present
                  ...(tool.result._storedInS3 && {
                    _storedInS3: true,
                    _s3Reference: tool.result._s3Reference,
                    preview: tool.result.preview || 'Loading full result...'
                  })
                }
              };
            }

            // If no result, it's a partial call
            return {
              ...baseTool,
              state: 'partial-call' as const
            };
          })
        }));
        
        setInitialMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      toast.error('Failed to load chat history');
    }
  }, [chatId, user?.id, isTemplate, getAccessToken]);

  // Use a ref to track if initial load has happened
  const initialLoadDone = useRef(false);

  useEffect(() => {
    // Only load messages if we haven't loaded them yet
    if (chatId && !initialLoadDone.current) {
      loadInitialMessages();
      initialLoadDone.current = true;
    }
  }, [chatId, loadInitialMessages]);

  // Remove the useEffect with debounce and replace with a more predictable pattern
  const previousMessagesRef = useRef<Message[]>([]);
  
  // Define updateChatInDB before it's used
  const updateChatInDB = useCallback(async (messages: CustomMessage[]): Promise<string[]> => {
    const lastMessage = messages[messages.length - 1];
  
    // Skip if there's no lastMessage or if the message has no content/tool invocations
    if (
      !lastMessage || 
      (lastMessage.content === '' && (!lastMessage.toolInvocations || lastMessage.toolInvocations.length === 0)) || 
      (lastMessage.role === 'assistant' && 
       (!lastMessage.toolInvocations || lastMessage.toolInvocations.length === 0) && 
       lastMessage.content && 
       lastMessage.content.includes('Analysis Summary'))
    ) {
      return [];
    }
  
    const token = await getAccessToken();
    const currentChatId = chatId || newChatId;
    
    try {
      // Update chat metadata
      await fetch(`/api/chat/${currentChatId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chatId: currentChatId,
          userId: user?.id,
          agentId,
          agentName: agent?.name,
          lastMessage: lastMessage.content,
          lastUpdated: new Date().toISOString(),
          isTemplate: true
        })
      });

      // Process attachments if they exist
      let processedAttachments = [] as any[];
      if (lastMessage.experimental_attachments?.length) {
        processedAttachments = await Promise.all(
          lastMessage.experimental_attachments.map(async (attachment) => {
            // Only process data URLs
            if (attachment.url.startsWith('data:')) {
              // Create blob from data URL
              const blob = await fetch(attachment.url).then(r => r.blob());
              
              // Get presigned URL
              const presignedResponse = await fetch(`/api/chat/presigned`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  fileName: attachment.name,
                  contentType: attachment.contentType,
                  chatId: currentChatId,
                  messageId: lastMessage.id
                })
              });

              if (!presignedResponse.ok) {
                throw new Error('Failed to get upload URL');
              }

              const { url, fields, fileUrl } = await presignedResponse.json();

              // Create FormData and append fields
              const formData = new FormData();
              Object.entries(fields).forEach(([key, value]) => {
                formData.append(key, value as string);
              });
              formData.append('file', blob, attachment.name);

              // Upload to S3
              const uploadResponse = await fetch(url, {
                method: 'POST',
                body: formData
              });

              if (!uploadResponse.ok) {
                throw new Error('Failed to upload file');
              }

              // Return processed attachment with S3 URL
              return {
                name: attachment.name,
                contentType: attachment.contentType,
                url: fileUrl
              };
            }
            
            // Return non-data URLs as-is
            return attachment;
          })
        );
      }

      // Process tool invocations
      const processedToolInvocations = lastMessage.toolInvocations?.map(tool => {
        // Base tool invocation properties
        const baseTool = {
          toolName: tool.toolName,
          toolCallId: tool.toolCallId,
          args: tool.args,
          status: tool.status
        };

        // If it's a result invocation with S3 storage
        if (hasS3Result(tool)) {
          return {
            ...baseTool,
            state: 'result' as const,
            result: {
              _storedInS3: true,
              _s3Reference: tool.result._s3Reference,
              preview: tool.result.preview || 'Loading full result...'
            }
          };
        }

        // If it's a regular result invocation
        if (isToolResultInvocation(tool)) {
          return {
            ...baseTool,
            state: 'result' as const,
            result: tool.result
          };
        }

        // If it's a partial call
        return {
          ...baseTool,
          state: 'partial-call' as const
        };
      });
  
      // Store the message with processed attachments and tool invocations
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chatId: currentChatId,
          messageId: lastMessage.id,
          userId: user?.id,
          isTemplate,
          role: lastMessage.role,
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          attachments: processedAttachments,
          toolInvocations: processedToolInvocations
        })
      });
  
      await refreshRecentChats();

      return processedAttachments.map(a => a.url);
    } catch (error) {
      console.error('Error updating chat:', error);
      toast.error('Failed to save chat');
      return [];
    }
  }, [agent?.name, agentId, chatId, getAccessToken, newChatId, refreshRecentChats, user?.id, isTemplate]);

  // Stabilize the updateChatInDB function reference with useMemo
  const memoizedUpdateChatInDB = useMemo(() => updateChatInDB, [updateChatInDB]);
  
  useEffect(() => {
    // Only update if the agent is loaded and we have messages
    if (agent && messages.length > 0) {
      // Get only the last message, which is the one that was just added
      const lastMessageIndex = messages.length - 1;
      const lastMessage = messages[lastMessageIndex];
      
      // Skip certain types of messages that may cause loops
      if (lastMessage && 
          lastMessage.role === 'assistant' && 
          (!lastMessage.toolInvocations || lastMessage.toolInvocations.length === 0) && 
          lastMessage.content && 
          lastMessage.content.includes('Analysis Summary')) {
        // Skip updating these types of messages
        return;
      }
      
      // Check if the message content or tool invocations have changed
      const previousMessage = previousMessagesRef.current[lastMessageIndex];
      const hasNewContent = !previousMessage || previousMessage.content !== lastMessage.content;
      const hasToolUpdates = !previousMessage || 
        JSON.stringify(previousMessage.toolInvocations) !== JSON.stringify(lastMessage.toolInvocations);
      
      if (hasNewContent || hasToolUpdates) {
        // Update our ref with the current messages
        previousMessagesRef.current = [...messages];
        
        // Run the save operation after a delay
        const timeoutId = setTimeout(() => {
          memoizedUpdateChatInDB(messages);
        }, 1000);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [messages, agent]);

  const getAgent = async () => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch(
        `/api/${agentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!response.ok) {
        console.error("Failed to fetch agent configuration, using default");
        return DEFAULT_AGENT;
      }
      return response.json();
    } catch (error) {
      console.error("Error fetching agent:", error);
      return DEFAULT_AGENT;
    }
  }

  const refreshAgent = async () => {
    if (!user || !ready) return;
    try {
      const fetchedAgent = await getAgent();
      setAgent(fetchedAgent);
    } catch (error) {
      console.error("Error in refreshAgent:", error);
    }
  }

  useEffect(() => {
    if (user && ready) {
      refreshAgent();
    }
  }, [agentId, user, ready]);

  useEffect(() => {
    const setupHeaders = async () => {
      if (user && ready) {
        const token = await getAccessToken();
        setHeaders({
          'Authorization': `Bearer ${token}`
        });
      } else {
        // Set empty headers for non-authenticated sessions
        setHeaders({});
      }
      setIsHeadersReady(true);
    };
    
    setupHeaders();
  }, [getAccessToken, user, ready]);

  const handleToolSelect = useCallback(async (command: string) => {
    
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }

    // Only persist tool usage to DB if authenticated
    if (user?.id && ready) {
      try {      
        const token = await getAccessToken();
        await fetch(`/api/chat/${chatId ? chatId : newChatId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            chatId: chatId ? chatId : newChatId,
            userId: user?.id,
            isTemplate: true,
            agentId,
            agentName: agent?.name,
            lastMessage: command,
            lastUpdated: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Error saving tool selection:', error);
      }
    }
  
    append({
      role: 'user',
      content: command,
    });

    if (topRef.current) {
      setTimeout(() => {
        topRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
      
  }, [append, chatId, newChatId, user?.id, agentId, agent?.name, getAccessToken, setSidebarOpen, ready]);

  useEffect(() => {
    const tool = searchParams.get('tool');
    // Ensure all dependencies are ready and the tool hasn't been triggered yet
    if (!hasTriggeredTool.current && tool && messages.length === 0 && handleToolSelect) {
      // Add a small delay to ensure everything is initialized
      const timeoutId = setTimeout(() => {
        const toolCommand = getToolCommand(tool);
        if (toolCommand) {
          handleToolSelect(toolCommand);
          hasTriggeredTool.current = true;
          
          // Remove the tool parameter from the URL
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('tool');
          router.replace(`?${newSearchParams.toString()}`, { scroll: false });
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [searchParams, messages, handleToolSelect, router]); // Add router to dependencies    

  const handleFormSubmit = (event: React.FormEvent, options = {}) => {
    if (input.trim()) {
      setSavedInput("");
    }

    handleSubmit(event, options);
    setFiles(null);
    
    // Auto-focus the input again after submitting
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
      // Ensure we scroll to bottom after sending
      scrollToBottom();
    }, 100);
  };

  // Helper function to update textarea height
  const autoResizeTextarea = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
    }
  };

  // useEffect(() => {
  //   // Auto-resize the textarea when input changes
  //   autoResizeTextarea();
  // }, [input]);

  useEffect(() => {
    if (topRef.current) {
      const rect = topRef.current.getBoundingClientRect();
      if (rect.bottom > window.innerHeight || rect.top < 0) {
        topRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [topRef.current]);

  useEffect(() => {
    // Only close sidebar on small screens, never because of modals
    if (window.innerWidth < 1024 && !isAnyModalOpen) {
      setSidebarOpen(false);
    }
  }, [isAnyModalOpen]);

  useEffect(() => {
    if (newChatId && !chatId && authenticated) {
      const url = new URL(window.location.href);
      url.searchParams.set('chatId', newChatId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [newChatId, chatId, authenticated]);  

  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;

    if (items) {
      const files = Array.from(items)
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      if (files.length > 0) {
        const validFiles = files.filter(
          (file) =>
            file.type.startsWith("image/") || file.type.startsWith("text/")
        );

        if (validFiles.length === files.length) {
          const dataTransfer = new DataTransfer();
          validFiles.forEach((file) => dataTransfer.items.add(file));
          setFiles(dataTransfer.files);
        } else {
          toast.error("Only image and text files are allowed");
        }
      }
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = event.dataTransfer.files;
    const droppedFilesArray = Array.from(droppedFiles);
    if (droppedFilesArray.length > 0) {
      const validFiles = droppedFilesArray.filter(
        (file) =>
          file.type.startsWith("image/") || file.type.startsWith("text/")
      );

      if (validFiles.length === droppedFilesArray.length) {
        const dataTransfer = new DataTransfer();
        validFiles.forEach((file) => dataTransfer.items.add(file));
        setFiles(dataTransfer.files);
      } else {
        toast.error("Only image and text files are allowed!");
      }

      setFiles(droppedFiles);
    }
    setIsDragging(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      const validFiles = Array.from(selectedFiles).filter(
        (file) =>
          file.type.startsWith("image/") || file.type.startsWith("text/")
      );

      if (validFiles.length === selectedFiles.length) {
        const dataTransfer = new DataTransfer();
        validFiles.forEach((file) => dataTransfer.items.add(file));
        setFiles(dataTransfer.files);
      } else {
        toast.error("Only image and text files are allowed");
      }
    }
  };

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Add scroll event listener to show/hide scroll button
  // useEffect(() => {
  //   const handleScroll = () => {
  //     if (!chatContainerRef.current) return;
      
  //     const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
  //     const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
      
  //     setShowScrollButton(isScrolledUp);
  //   };
    
  //   const container = chatContainerRef.current;
  //   if (container) {
  //     container.addEventListener('scroll', handleScroll);
  //     return () => container.removeEventListener('scroll', handleScroll);
  //   }
  // }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && !isLoading && chatContainerRef.current) {
      scrollToBottom();
    }
  }, [messages, isLoading]);

  // Auto-focus the input after the page loads
  useEffect(() => {
    if (inputRef.current && window.innerWidth > 768) {
      inputRef.current.focus();
    }
  }, []);

  // Handle keyboard showing/hiding on mobile
  useEffect(() => {
    // iOS workaround to fix the viewport height when the keyboard appears
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVh();
    window.addEventListener('resize', setVh);
    
    // Focus handler for iOS to prevent viewport shifting
    const handleFocus = () => {
      if (window.innerWidth < 768) {
        // On iOS, when keyboard appears, adjust scrollable area
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
          // Add small delay to let keyboard appear first
          setTimeout(() => {
            // Adjust scroll container height to account for keyboard
            const chatContainer = chatContainerRef.current;
            if (chatContainer) {
              chatContainer.style.height = 'calc(100% - 60px)';
              scrollToBottom();
            }
          }, 300);
        } else {
          // For non-iOS devices, just scroll to bottom
          setTimeout(scrollToBottom, 300);
        }
      }
    };
    
    // When blur, reset heights
    const handleBlur = () => {
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        const chatContainer = chatContainerRef.current;
        if (chatContainer) {
          // Reset height after keyboard disappears
          setTimeout(() => {
            chatContainer.style.height = '100%';
          }, 100);
        }
      }
    };
    
    if (inputRef.current) {
      inputRef.current.addEventListener('focus', handleFocus);
      inputRef.current.addEventListener('blur', handleBlur);
    }

    return () => {
      window.removeEventListener('resize', setVh);
      if (inputRef.current) {
        inputRef.current.removeEventListener('focus', handleFocus);
        inputRef.current.removeEventListener('blur', handleBlur);
      }
    };
  }, []);

  // Add custom CSS class for desktop layout
  useEffect(() => {
    // Add a custom style element for the desktop layout
    const style = document.createElement('style');
    style.textContent = `
      @media (min-width: 768px) {
        .desktop-content-width {
          width: 100% !important;
          transition: padding-right 0.3s ease;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [sidebarOpen, activeTab]);

  const handleRemoveFile = (fileToRemove: File) => {
    if (!files) return;
    
    const dataTransfer = new DataTransfer();
    Array.from(files).forEach(file => {
      // Skip the file we want to remove
      if (file !== fileToRemove) {
        dataTransfer.items.add(file);
      }
    });
    
    // If all files were removed, set to null
    if (dataTransfer.files.length === 0) {
      setFiles(null);
    } else {
      setFiles(dataTransfer.files);
    }
  };

  // Use ref to track previous messages hash to prevent infinite loop
  const prevMessagesHashRef = useRef("");
  
  useEffect(() => {
    // Create a more detailed hash of the messages that includes tool data
    const messagesHash = JSON.stringify(messages.map(m => ({
      id: m?.id,
      toolCount: m?.toolInvocations?.length || 0,
      toolData: m?.toolInvocations?.map(t => ({
        id: t.toolCallId,
        result: isToolResultInvocation(t) ? t.result : undefined,
        status: t.status
      }))
    })));
    
    // Skip if messages haven't actually changed in a way that affects artifacts
    if (messagesHash === prevMessagesHashRef.current) return;
    
    // Update hash reference
    prevMessagesHashRef.current = messagesHash;
    
    // Collect artifacts from messages with tool invocations
    const newArtifacts = [];
    for (const message of messages) {
      if (message?.toolInvocations?.length) {
        for (const tool of message.toolInvocations) {
          // Only add tools that have results
          if (tool.result) {
            // Handle S3-stored results
            const result = tool.result._storedInS3 ? {
              ...tool.result,
              _storedInS3: true,
              _s3Reference: tool.result._s3Reference,
              // Add a preview if available
              preview: tool.result.preview || 'Loading full result...'
            } : tool.result;

            newArtifacts.push({
              id: tool.toolCallId,
              toolName: tool.toolName,
              args: tool.args,
              result,
              timestamp: message.createdAt,
              messageId: message.id,
              tool: {
                ...tool,
                result // Use the processed result
              }
            });
          }
        }
      }
    }
    
    setArtifacts(newArtifacts);
    // Only switch to artifacts tab and select the latest artifact if we have new artifacts
    if (newArtifacts.length > 0 && (!artifacts.length || newArtifacts.length > artifacts.length)) {
      setActiveTab('artifacts');
      setSelectedArtifact(newArtifacts[newArtifacts.length-1]);
    }
  }, [messages, artifacts.length]);

  // Add a useEffect to trigger rerender when a TradingView chart is selected
  useEffect(() => {
    if (selectedArtifact?.toolName === 'getTradingViewChart') {
      // Force a layout recalculation and component remount
      const timer = setTimeout(() => {
        // First clean up any existing TradingView scripts
        const existingScripts = document.querySelectorAll(`script[data-trading-view-artifact="${selectedArtifact.id}"]`);
        existingScripts.forEach(script => script.remove());
        
        // Then increment the refresh key to force a remount
        setRefreshKey(prev => prev + 1);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [selectedArtifact]);

  // Add another useEffect to handle tab changes
  useEffect(() => {
    if (activeTab === 'artifacts' && selectedArtifact?.toolName === 'getTradingViewChart') {
      // When switching to the artifacts tab with a TradingView chart selected, refresh it
      const timer = setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedArtifact]);

  // Create a common function for rendering tool icons
  const renderToolIcon = (toolName: string, size: number = 16) => {
    const iconName = getToolIcon(toolName);
    
    switch(iconName) {
      case 'wallet': return <WalletIcon className="text-indigo-400" size={size} />;
      case 'piggyBank': return <PiggyBank className="text-indigo-400" size={size} />;
      case 'coins': return <Coins className="text-indigo-400" size={size} />;
      case 'trendingUp': return <TrendingUp className="text-indigo-400" size={size} />;
      case 'pieChart': return <PieChart className="text-indigo-400" size={size} />;
      case 'layers': return <Layers className="text-indigo-400" size={size} />;
      case 'building': return <Building className="text-indigo-400" size={size} />;
      case 'gauge': return <Gauge className="text-indigo-400" size={size} />;
      case 'activity': return <Activity className="text-indigo-400" size={size} />;
      case 'info': return <Info className="text-indigo-400" size={size} />;
      case 'search': return <Search className="text-indigo-400" size={size} />;
      case 'file': return <File className="text-indigo-400" size={size} />;
      case 'users': return <Users className="text-indigo-400" size={size} />;
      case 'rocket': return <Rocket className="text-indigo-400" size={size} />;
      case 'flame': return <Flame className="text-indigo-400" size={size} />;
      case 'image': return <ImageIcon className="text-indigo-400" size={size} />;
      case 'list': return <List className="text-indigo-400" size={size} />;
      case 'user': return <UserIcon className="text-indigo-400" size={size} />;
      case 'arrowLeftRight': return <ArrowLeftRight className="text-indigo-400" size={size} />;
      case 'lineChart': return <LineChart className="text-indigo-400" size={size} />;
      case 'barChart': return <BarChart className="text-indigo-400" size={size} />;
      case 'newspaper': return <Newspaper className="text-indigo-400" size={size} />;
      case 'barChart2': return <BarChart2 className="text-indigo-400" size={size} />;
      case 'percent': return <Percent className="text-indigo-400" size={size} />;
      case 'fileText': return <FileText className="text-indigo-400" size={size} />;
      case 'globe': return <Globe className="text-indigo-400" size={size} />;
      case 'database': return <Database className="text-indigo-400" size={size} />;
      case 'databaseSearch': return <Database className="text-indigo-400" size={size} />;
      default: return (
        <Activity className="text-indigo-400" size={size} />
      );
    }
  };

  // Add the ToolInvocationCard component definition BEFORE renderToolInvocationForArtifact
  const ToolInvocationCard = ({ tool, onViewArtifact }: { tool: any, onViewArtifact: () => void }) => {
    return (
      <div 
        className="bg-zinc-800 rounded-lg p-3 my-2 border border-zinc-700 hover:border-indigo-500 transition-colors cursor-pointer md:cursor-default"
        onClick={(e) => {
          // On mobile, make the whole card clickable
          if (window.innerWidth < 768) {
            e.stopPropagation();
            onViewArtifact();
            // Don't close the sidebar on mobile automatically
          }
        }}
      >
        <div className="flex justify-between items-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onViewArtifact();
            }}        
        >          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-indigo-500/20">
              {renderToolIcon(tool.toolName)}
            </div>
            <div>
              <div className="font-medium text-white">{getToolDisplayName(tool.toolName)}</div>
              <div className="text-xs text-zinc-400 break-words overflow-wrap-anywhere line-clamp-2 w-full max-w-full md:max-w-[300px]">
                {generateToolDescription(tool.toolName, tool.args)}
              </div>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onViewArtifact();
            }}
            className="hidden md:block px-3 py-1 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-500 rounded-md transition-colors"
          >
            View Result
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-zinc-900 flex flex-col overflow-hidden ios-fix">
      {/* Chat header - fixed height */}
      <div className="flex-none h-[61px] bg-zinc-900 border-b border-zinc-700 flex items-center px-4 justify-between z-10">
        <div className="flex items-center gap-2 pl-12 sm:pl-0">
          <div>
            <img 
              src="https://d1olseq3j3ep4p.cloudfront.net/agents/cc425065-b039-48b0-be14-f8afa0704357/profile-1738538619696.jpg" 
              alt="Rhun Capital"
              className="w-8 h-8 rounded-full object-cover"
            />
          </div>
          <Link className="text-indigo-500 text-indigo-400" href={`/`}>          
            <h1 className="text-lg font-medium text-white">Rhun Capital</h1>
          </Link>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Tab navigation in header */}
          <div className="hidden md:flex border-r border-zinc-700 pr-3 mr-2">
            <button
              onClick={() => {
                setActiveTab('wallet')
                setSidebarOpen(true);
              }}
              className={`px-3 py-1.5 text-sm font-medium transition-colors rounded-md ${
                activeTab === 'wallet' 
                  ? 'text-white bg-zinc-800' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <WalletIcon size={16} />
                <span>Wallet</span>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('tools')
                setSidebarOpen(true);
              }}
              className={`px-3 py-1.5 text-sm font-medium transition-colors rounded-md ${
                activeTab === 'tools' 
                  ? 'text-white bg-zinc-800' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <LayoutGrid size={16} />
                <span>Tools</span>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('artifacts')
                setSidebarOpen(true);
              }}
              className={`px-3 py-1.5 text-sm font-medium transition-colors rounded-md ${
                activeTab === 'artifacts' 
                  ? 'text-white bg-zinc-800' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                <span>Artifacts</span>
                <span className="bg-zinc-700 text-zinc-300 rounded-full px-1.5 py-0.5 text-xs">{artifacts.length}</span>
              </div>
            </button>
          </div>
          
          {/* Mobile menu button */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
            aria-label="Toggle tools sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5v-3z"/>
            </svg>
          </button>
          
          {/* Desktop toggle sidebar button - hidden on mobile */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:block p-2 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Main content area - flexible layout with new structure */}
      <div className="flex flex-col flex-1 overflow-hidden w-full">
        {/* Messages and sidebar in a row */}
        <div className="flex flex-1 overflow-hidden w-full">
          {/* Chat content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Scrollable area and input area in a column flex */}
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Scrollable message area */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto hide-scrollbar chat-scrollable pb-2"
                style={{ 
                  overflowX: 'hidden'
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <AnimatePresence>
                  {isDragging && (
                    <motion.div
                      className="fixed inset-0 z-50 bg-zinc-900/90 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="text-center">
                        <p className="text-white text-lg">Drop files here</p>
                        <p className="text-zinc-400">(images and text only)</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="max-w-3xl mx-auto w-full pt-4 pl-4 pr-4 md:pl-8 md:pr-8">
                  {messages.length > 0 ? (
                    messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        className={`flex gap-3 py-4`}
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                      >
                        <div className="w-6 h-6 flex-shrink-0 text-zinc-400">
                          {message.role === "assistant" ? (
                              <img 
                                src={agent.imageUrl}
                                alt={agent.name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                          ) : (
                            <UserIcon />
                          )}
                        </div>
    
                        <div className="flex-1 space-y-2 max-w-[100%] text-white" ref={topRef}>
                            {message.toolInvocations?.map((tool) => (
                              <ToolInvocationCard
                                key={tool.toolCallId} 
                                tool={tool}
                                onViewArtifact={() => {
                                  // Find the corresponding artifact and select it
                                  const artifact = artifacts.find(a => a.id === tool.toolCallId);
                                  if (artifact) {
                                    setActiveTab('artifacts');
                                    setSelectedArtifact(artifact);
                                    // On mobile, open the sidebar
                                    if (window.innerWidth < 768) {
                                      setSidebarOpen(true);
                                    } else {
                                      // On desktop, ensure sidebar is open
                                      setSidebarOpen(true);
                                    }
                                  }
                                }}
                              />
                            ))}
    
                          {(message.experimental_attachments?.length ?? 0) > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {message.experimental_attachments?.map((attachment: any, idx: number) => (
                                <AttachmentDisplay 
                                  key={`${attachment.name || idx}`} 
                                  attachment={attachment}
                                />
                              ))}
                            </div>
                          )}
                          
                          <div className="message-content">
                            <Markdown>{message.content}</Markdown>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : !searchParams.get('tool') && (
                    <div className="flex items-center justify-center min-h-[calc(100vh-250px)]">
                      <div className="w-full max-w-md">
                        <EmptyState 
                          agent={agent}
                          userId="template"
                          agentId={agentId}
                          onDescribeTools={() => handleToolSelect('What tools do you have access to?')}
                        />
                      </div>
                    </div>
                  )}
    
                  {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="flex gap-3 py-4 bg-zinc-900 text-zinc-500 text-sm">
                      <LoadingIndicator /> <span className="animate-pulse">Thinking...</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Input area in the same flex column as the messages */}
              <div className="flex-shrink-0 bg-zinc-900 border-t border-zinc-700 pt-3 pb-4 px-4 z-30 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"
                style={{
                  paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
                }}
              >
                <AnimatePresence>
                  {files && (
                    <div className="flex gap-2 mb-2 overflow-x-auto pb-2 pt-2 max-w-3xl mx-auto">
                    {files && Array.from(files).map((file) =>
                        file.type.startsWith("image") ? (
                          <motion.div
                            key={file.name}
                            className="relative"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                          >
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="h-16 w-16 object-cover rounded-md"
                            />
                            <button
                              onClick={() => handleRemoveFile(file)}
                              className="absolute -top-2 -right-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-full p-1 w-6 h-6 flex items-center justify-center"
                              aria-label="Remove file"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                              </svg>
                            </button>
                          </motion.div>
                        ) : (
                          <motion.div
                            key={file.name}
                            className="relative"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                          >
                            <div className="h-16 w-16 p-2 text-[8px] bg-zinc-800 rounded-md border border-zinc-700 overflow-hidden">
                              <TextFilePreview file={file} />
                            </div>
                            <button
                              onClick={() => handleRemoveFile(file)}
                              className="absolute -top-2 -right-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-full p-1 w-6 h-6 flex items-center justify-center"
                              aria-label="Remove file"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                              </svg>
                            </button>
                          </motion.div>
                        )
                      )}
                    </div>
                  )}
                </AnimatePresence>

                <form onSubmit={(event) => {
                  const options = files ? { experimental_attachments: files } : {};
                  handleFormSubmit(event, options);
                }} className="max-w-3xl mx-auto flex gap-2 relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    accept="image/png,image/jpeg,image/jpg,text/*"
                    onChange={handleFileChange}
                  />
                  
                  <div className="flex-1 flex items-center bg-zinc-800 rounded-lg px-4">
                    <button
                      type="button"
                      onClick={handleUploadClick}
                      className="p-2 text-zinc-400 hover:text-white"
                    >
                      <AttachmentIcon />
                    </button>
                    
                    <textarea
                      ref={inputRef}
                      className="flex-1 bg-transparent py-2 px-2 text-white outline-none resize-none overflow-y-auto"
                      placeholder="Send a message..."
                      value={input}
                      onChange={(e) => {
                        handleInputChange(e);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          if (input.trim()) {
                            const options = files ? { experimental_attachments: files } : {};
                            handleFormSubmit(event, options);
                          }
                        }
                      }}
                      onPaste={handlePaste}
                      rows={1}
                      style={{ minHeight: '40px', maxHeight: '150px' }}
                    />
                    <button type="submit" className="p-2 text-zinc-400 hover:text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z"/>
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Mobile overlay backdrop - placed outside the sidebar */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/40 z-40 md:hidden" 
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          {/* Sidebar */}
          <div 
            className={`bg-zinc-900 overflow-hidden transition-transform duration-300 ease-linear
              ${sidebarOpen 
                ? 'fixed md:relative md:border-l md:border-zinc-700 md:inset-y-0 md:right-0 inset-0 top-auto z-50 md:z-40 md:w-[400px] shadow-lg md:shadow-none transform translate-x-0 translate-y-0' + (activeTab === 'artifacts' ? ' md:w-[50%]' : '') 
                : 'w-0 md:border-l-0 transform md:translate-x-full translate-y-full'}`}
            style={{ 
              bottom: 0,
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px))",
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              transform: sidebarOpen 
                ? 'translate(0, 0)' 
                : typeof window !== 'undefined' && window.innerWidth >= 768 
                  ? 'translateX(100%)' 
                  : 'translateY(100%)'
            }}
          >
            <div className="h-[calc(100vh-140px)] flex flex-col flex-1 overflow-hidden bg-zinc-900">
              {/* Close button - only on mobile */}
              <div className="flex justify-between items-center p-4 border-b border-zinc-700 md:hidden bg-zinc-900">
                <h3 className="text-lg font-medium text-white">
                  {activeTab === 'wallet' 
                    ? 'Wallet' 
                    : (activeTab === 'tools' 
                      ? 'Tools' 
                      : 'Artifacts')}
                </h3>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSidebarOpen(false);
                  }} 
                  className="text-zinc-400 hover:text-white"
                >
                  <XIcon size={20} />
                </button>
              </div>
              
              {/* Tabs navigation - only on mobile */}
              <div className="flex border-b border-zinc-700 md:hidden px-2 bg-zinc-900">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('wallet');
                  }}
                  className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'wallet' 
                      ? 'text-white border-b-2 border-indigo-500' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <WalletIcon size={16} />
                    <span>Wallet</span>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('tools');
                  }}
                  className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'tools' 
                      ? 'text-white border-b-2 border-indigo-500' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <LayoutGrid size={16} />
                    <span>Tools</span>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('artifacts');
                  }}
                  className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'artifacts' 
                      ? 'text-white border-b-2 border-indigo-500' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    <span>Artifacts</span>
                    <span className="bg-zinc-700 text-zinc-300 rounded-full px-1.5 py-0.5 text-xs">{artifacts.length}</span>
                  </div>
                </button>
              </div>

              <div 
                className="flex-1 overflow-y-auto p-4 bg-zinc-900" 
                onClick={(e) => e.stopPropagation()}
              >
                {activeTab === 'wallet' ? (
                  <WalletContent 
                    templateWallet={templateWallet}
                    user={user}
                    authenticated={authenticated}
                    login={login}
                    wallets={wallets}
                  />
                ) : activeTab === 'tools' ? (
                  <ChatSidebar 
                    agent={agent}
                    isOpen={true}
                    onToggle={() => setSidebarOpen(!sidebarOpen)}
                    onToolSelect={(tool) => {

                      // Prevent multiple selections
                      if (isLoading) {
                        return;
                      }
                      
                      // Special handling for TradingView
                      if (tool.toLowerCase().includes('tradingview') || 
                          tool.toLowerCase().includes('chart')) {
                        
                        
                        // Small delay before proceeding with the tool selection
                        setTimeout(() => {
                          handleToolSelect(tool);
                        }, 200);
                      } else {
                        // For other tools, proceed normally
                        handleToolSelect(tool);
                      }
                    }}
                    refreshAgent={refreshAgent}
                  />
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    {/* <h3 className="text-xl font-medium text-white mb-4 hidden md:block">Artifacts</h3> */}
                    {selectedArtifact ? (
                      <div className="bg-zinc-800 rounded-lg p-4 mb-4 border border-zinc-700">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-full bg-indigo-500/20">
                              {renderToolIcon(selectedArtifact.toolName)}
                            </div>
                            <h3 className="text-lg font-medium text-white">
                              {getToolDisplayName(selectedArtifact.toolName)}
                            </h3>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedArtifact(null);
                            }}
                            className="text-zinc-400 hover:text-white"
                          >
                            <XIcon size={20} />
                          </button>
                        </div>
             
                        <div className="tool-wrapper max-w-full overflow-x-auto" key={`artifact-${selectedArtifact.id}-${refreshKey}`}>
                          {renderToolInvocation(selectedArtifact.tool)}
                        </div>
                      </div>
                    ) : (
                      artifacts.length === 0 ? (
                        <div className="p-8 text-center">
                          <div className="flex items-center justify-center mb-4 text-indigo-500">
                          <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                          </svg>   
                          </div>
                        <h2 className="text-xl font-semibold text-white mb-2">You don&apos;t have any artifacts yet</h2>
                        <p className="text-zinc-400 mb-6">
                          Use the tools to start your research and create artifacts.
                        </p>
                        <button
                          onClick={() => setActiveTab('tools')}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-indigo-400 text-white hover:bg-indigo-400/20 transition-colors text-sm sm:text-base"
                        >
                          View Available Tools
                        </button>                            
        
                      </div>
                      ) : (
                        <div className="space-y-3">
                          {artifacts.map((artifact) => (
                            <button
                              key={artifact.id}
                              className="w-full text-left p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedArtifact(artifact);
                                // On mobile, don't close the sidebar automatically
                                // Let the user see the artifact details inside the sidebar first
                              }}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-full bg-indigo-500/20">
                                    {renderToolIcon(artifact.toolName, 14)}
                                  </div>
                                  <span className="font-medium text-white">{getToolDisplayName(artifact.toolName)}</span>
                                </div>
                                <span className="text-xs text-zinc-400">
                                  {new Date(artifact.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="mt-1 text-xs text-zinc-400 break-words overflow-wrap-anywhere line-clamp-2 md:truncate">
                                {generateToolDescription(artifact.toolName, artifact.args)}
                              </div>
                            </button>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const runtime = 'nodejs';
export const dynamicParams = true;