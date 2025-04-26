"use client";
import {
  AttachmentIcon,
  UserIcon
} from "@/components/icons";
import {BotIcon} from "lucide-react";
import { useRecentChats } from '@/contexts/chat-context';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { usePathname } from 'next/navigation';
import { useChat } from "ai/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import LoadingIndicator from "@/components/loading-indicator";
import MarketMovers from "@/components/tools/market-movers";
import TokenInfo from "@/components/tools/token-info";
import SearchTokens from "@/components/tools/search-tokens";
import TotalCryptoMarketCap from "@/components/tools/total-crypto-marketcap";
import MarketCategories from "@/components/tools/market-categories";
import DerivativesExchanges from "@/components/tools/derivatives-exchanges";
import RecentCoinsResults from "@/components/tools/recent-coins";
import TopHoldersDisplay from "@/components/tools/get-top-holders";
import type { Message } from 'ai';
import React from 'react';
import ChatSidebar from '@/components/chat-sidebar';
import SolanaBalance  from "@/components/tools/solana-balance";
import PortfolioValue  from "@/components/tools/portfolio-value";
import TokenHoldings  from "@/components/tools/token-holdings";
import FearAndGreedIndex from "@/components/tools/fear-and-greed-index";
import SolanaTransactionVolume from "@/components/tools/solana-transaction-volume";
import AccountInfo from "@/components/tools/account-info";
import TrendingCoins from "@/components/tools/trending-searches";
import TrendingSolanaTokens from "@/components/tools/trending-solana-tokens";
import TopNFTsResults from "@/components/tools/top-nfts";
import SwapComponent from "@/components/tools/swap-component";
import { debounce } from 'lodash';
import ExecuteSwap from "@/components/tools/execute-swap";
import RecentDexScreenerTokens from "@/components/tools/recent-dexscreener-tokens";
import RecentNews from "@/components/tools/recent-news";
import StockAnalysis from "@/components/tools/stock-analysis";
import OptionsAnalysis from "@/components/tools/options-analysis";
import NewsAnalysis from "@/components/tools/news-analysis";
import WebResearch from "@/components/tools/web-research";
import TradingViewChart from "@/components/tools/tradingview-chart";
import TechnicalAnalysis from '@/components/tools/technical-analysis';
import FredAnalysis from '@/components/tools/fred-analysis';
import { FredSearch } from '@/components/tools/fred-search';
import type { ToolInvocation as AIToolInvocation } from '@ai-sdk/ui-utils';
import { getToolCommand } from '@/app/config/tool-commands';
import { useModal } from "@/contexts/modal-context";
import { Button } from "@/components/ui/button";
import { v4 as uuidv4 } from 'uuid';
import { usePrivy } from "@privy-io/react-auth";
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { XIcon, MenuIcon } from "lucide-react";

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
            max-width: 90vw !important;
            overflow-x: scroll !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block;
          }
          
          table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            font-size: 0.85rem !important;
          }
          
          td, th {
            padding: 4px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            max-width: 60px !important;
          }
          
          pre, code {
            max-width: 90vw !important;
            overflow-x: scroll !important;
            white-space: pre-wrap !important;
          }
          
          .message-content {
            max-width: 90vw !important;
            overflow-wrap: break-word !important;
            padding-right: 0 !important;
          }
          
          div[class*="market"], 
          div[class*="token"], 
          div[class*="chart"],
          div[class*="holder"],
          div[class*="transaction"] {
            max-width: 90vw !important;
            overflow-x: scroll !important;
          }
        }
        
        /* Desktop remains untouched */
        @media (min-width: 769px) {
          .tool-wrapper {
            width: auto;
            overflow: visible;
          }
          
          table {
            width: auto;
            table-layout: auto;
          }
        }
      `}</style>
    </Suspense>
  );
}

function HomeContent() {
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  const templateWallet = params.userId === 'template' || pathname === '/' 
    ? wallets[0]?.address 
    : null

  const { messages, input, handleSubmit, handleInputChange, isLoading, append } = useChat({
    headers,
    body: { 
      agent, 
      user,
      templateWallet
    },
    maxSteps: 30,
    initialMessages,
    sendExtraMessageFields: true,
    id: chatId || newChatId,
    onError: () => {
      toast.error('Failed to send message. Please try again.')
    },
    onFinish: async (message) => {   
      // Debounced save is handled in a separate useEffect
    },
  });

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

  useEffect(() => {
    // Auto-resize the textarea when input changes
    autoResizeTextarea();
  }, [input]);

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

  useEffect(() => {
    const loadInitialMessages = async (): Promise<void> => {
      if (!chatId || !user?.id) return;
      
      try {
        const token = await getAccessToken();
        const response = await fetch(
          `/api/chat/${chatId}?userId=${encodeURIComponent(user?.id as string)}`,
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
          const formattedMessages: Message[] = data.messages.map((msg: any) => ({
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
              // Ensure we preserve all S3 references and metadata for tool results
              const mappedTool = {
                ...tool, 
                toolName: tool.toolName,
                toolCallId: tool.toolCallId,
                args: tool.args,
                result: tool.result
              };
              
              // Make sure we keep the special fields for S3 references intact
              if (mappedTool.result && mappedTool.result._storedInS3) {
                mappedTool.result = {
                  ...mappedTool.result,
                  _storedInS3: true,
                  _s3Reference: mappedTool.result._s3Reference
                };
              }
              
              return mappedTool;
            })
          }));
          
          setInitialMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        toast.error('Failed to load chat history');
      }
    };
  
    // Only load messages if user is authenticated
    if (user?.id && ready) {
      loadInitialMessages();
    }
  }, [chatId, getAccessToken, user, ready]);

  const updateChatInDB = useCallback(async (messages: Message[]): Promise<string[]> => {
    const lastMessage = messages[messages.length - 1];
  
    // Skip if there's no lastMessage or if the message has no content/tool invocations
    if (
      !lastMessage || 
      (lastMessage.content === '' && lastMessage.toolInvocations?.length === 0) || 
      (lastMessage.role === 'assistant' && !lastMessage.toolInvocations?.length && lastMessage.content?.includes('Analysis Summary'))
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
  
      // Store the message with processed attachments
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
          isTemplate: true,
          role: lastMessage.role,
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          attachments: processedAttachments,
          toolInvocations: lastMessage.toolInvocations?.map(tool => ({
            toolName: tool.toolName,
            toolCallId: tool.toolCallId,
            args: tool.args,
            result: 'result' in tool ? tool.result : undefined
          }))
        })
      });
  
      await refreshRecentChats();
    } catch (error) {
      console.error('Error updating chat:', error);
      toast.error('Failed to save chat message');
    }
    
    return [];
  }, [chatId, newChatId, user?.id, agentId, agent?.name, getAccessToken, refreshRecentChats]);

  useEffect(() => {
    if (agent) {
      // Create a new debounced function for each message
      const debouncedSave = debounce(async () => {
        await updateChatInDB(messages);
      }, 1000);
    
      debouncedSave();
    
      return () => {
        debouncedSave.cancel();
      };
    }
  }, [messages, agent]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Add scroll event listener to show/hide scroll button
  useEffect(() => {
    const handleScroll = () => {
      if (!chatContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
      
      setShowScrollButton(isScrolledUp);
    };
    
    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

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

  // Add a custom CSS class for desktop layout
  useEffect(() => {
    // Add a custom style element for the desktop layout
    const style = document.createElement('style');
    style.textContent = `
      @media (min-width: 768px) {
        .desktop-content-width {
          width: ${sidebarOpen ? 'calc(100% - 400px)' : '100%'} !important;
          transition: width 0.3s ease;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [sidebarOpen]);

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

  return (
    <div className="fixed inset-0 bg-zinc-900 flex flex-col overflow-hidden ios-fix">
      {/* Chat header - fixed height */}
      <div className="flex-none h-[61px] bg-zinc-900 border-b border-zinc-700 flex items-center px-4 justify-between z-10">
        <div className="flex items-center gap-2 pl-[50px] md:pl-[250px]">
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
        
        <div className="flex items-center gap-2">
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

      {/* Main content area - flexible layout */}
      <div className="flex flex-1 overflow-hidden w-full">
        {/* Chat content */}
        <div className="flex-1 flex flex-col relative desktop-content-width">
          {/* Scrollable area */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto hide-scrollbar chat-scrollable"
            style={{ 
              paddingBottom: '72px', 
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
                      {message.toolInvocations?.map((tool) => {
                        const wrappedTool = (component: React.ReactNode) => (
                          <div className="tool-wrapper">
                            {component}
                          </div>
                        );
                        
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
                            return wrappedTool(<TopHoldersDisplay key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
                          case 'getAccountDetails':
                            return wrappedTool(<AccountInfo key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
                          case 'getTrendingTokens':
                            return tool.args.chain === 'solana' 
                              ? wrappedTool(<TrendingSolanaTokens key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>)
                              : wrappedTool(<TrendingCoins key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>);
                          case 'getTopNfts':
                            return wrappedTool(<TopNFTsResults key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} />);
                          case 'swap':
                            return wrappedTool(<ExecuteSwap key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} />);
                          case 'getRecentDexScreenerTokens':
                            return wrappedTool(<RecentDexScreenerTokens key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} />);
                          case 'getCryptoNews':
                            return wrappedTool(
                              <RecentNews key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} />
                            );
                          case 'stockAnalysis':
                            return wrappedTool(
                              <StockAnalysis key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} append={append} />
                            );
                          
                          case 'optionsAnalysis':
                            return wrappedTool(
                              <OptionsAnalysis key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} />
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
                            return wrappedTool(<TradingViewChart key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} />);
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
                                onShowChart={(seriesId) => handleToolSelect(`Show me the FRED series ${seriesId}`)}
                              />
                            );
                          default:
                            return null;
                        }
                      })}

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

          {/* Input area - fixed at bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-700 p-4 z-30 pb-safe"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)"
            }}
          >
            <AnimatePresence>
              {files && (
                <div className="flex gap-2 mb-2 overflow-x-auto pb-2 pt-2 max-w-3xl mx-auto">
                  {Array.from(files).map((file) =>
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

        {/* Desktop sidebar with absolute positioning */}
        <div 
          className={`hidden md:block fixed top-[61px] right-0 bottom-0 border-l border-zinc-700 bg-zinc-900 overflow-y-auto z-10 transition-transform duration-300 w-[400px] ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ 
            paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 16px))', /* Add padding to account for input area height and iOS safe area */
            height: 'auto',
            maxHeight: 'calc(100vh - 61px)' /* Viewport height minus header */
          }}
        >
      <ChatSidebar 
        agent={agent}
            isOpen={true}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onToolSelect={handleToolSelect}
        refreshAgent={refreshAgent}
      />
        </div>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            className="fixed bottom-[84px] right-4 bg-indigo-500 text-white p-2 rounded-full shadow-lg z-30"
            onClick={scrollToBottom}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 15a.5.5 0 0 1-.5-.5V2.707L1.854 8.354a.5.5 0 1 1-.708-.708l6-6a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8.5 2.707V14.5a.5.5 0 0 1-.5.5z" transform="rotate(180, 8, 8)"/>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mobile sidebar - slides up from bottom */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setSidebarOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-xl overflow-hidden"
              style={{ maxHeight: 'calc(75vh - 40px)' }}
              onClick={e => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) {
                  setSidebarOpen(false);
                }
              }}
            >
              {/* Drag handle */}
              <div 
                className="w-full h-10 flex justify-center items-center cursor-grab active:cursor-grabbing"
                onTouchStart={e => e.stopPropagation()}
              >
                <div className="w-16 h-1.5 bg-zinc-600 rounded-full"></div>
              </div>
              <div className="overflow-hidden" style={{ height: 'calc(75vh - 40px)' }}>
                <ChatSidebar 
                  agent={agent}
                  isOpen={true}
                  onToggle={() => setSidebarOpen(false)}
                  onToolSelect={handleToolSelect}
                  refreshAgent={refreshAgent}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const runtime = 'nodejs';
export const dynamicParams = true;
