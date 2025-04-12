"use client";
import {
  AttachmentIcon,
  UserIcon
} from "@/components/icons";
import {BotIcon} from "lucide-react";
import { useRecentChats } from '@/contexts/chat-context';
import { useChat } from "ai/react";
import { DragEvent, useCallback, useEffect, useRef, useState } from "react";
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
import { Message } from 'ai';
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
        className="h-16 w-16 object-cover rounded-md"
      />
    );
  }
  
  if (attachment.type?.startsWith('text/')) {
    return (
      <div className="h-16 w-16 p-2 text-[8px] bg-zinc-800 rounded-md border border-zinc-700 overflow-hidden">
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
        className="h-16 w-16 object-cover rounded-md"
      />
    );
  }
  
  if (attachment.contentType?.startsWith('text/') && attachment.url) {
    return (
      <div className="h-16 w-16 p-2 text-[8px] bg-zinc-800 rounded-md border border-zinc-700 overflow-hidden">
        <span className="text-xs truncate">{attachment.name || 'Text file'}</span>
      </div>
    );
  }
  
  // Default fallback
  return (
    <div className="h-16 w-16 p-2 text-[8px] bg-zinc-800 rounded-md border border-zinc-700 overflow-hidden flex items-center justify-center">
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
          {agent.imageUrl ? (
            <img 
              src={agent.imageUrl} 
              alt={agent.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <BotIcon className="w-8 h-8 sm:w-12 sm:h-12 text-zinc-400" />
          )}
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

export default function Home() {
  const params = useParams();
  const agentId = 'cc425065-b039-48b0-be14-f8afa0704357'
  const searchParams = useSearchParams();
  const chatId = decodeURIComponent(searchParams.get('chatId') || '');
  const [agent, setAgent] = useState<any>();
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
  const { user, getAccessToken, ready } = usePrivy();
  const { refreshRecentChats } = useRecentChats();
  const [headers, setHeaders] = useState<any>();
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [isHeadersReady, setIsHeadersReady] = useState(false);

  const { messages, input, handleSubmit, handleInputChange, isLoading, append } = useChat({
    headers,
    body: { agent, user },
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
      throw new Error("Failed to fetch agent configuration");
    }
    return response.json();
  }

  const refreshAgent = async () => {
    if (!user) return;
    getAgent().then((agent) => {
      setAgent(agent);
    });
  }

  useEffect(() => {
    refreshAgent();
  }, [agentId]);

  useEffect(() => {
    const setupHeaders = async () => {
      const token = await getAccessToken();
      setHeaders({
        'Authorization': `Bearer ${token}`
      });
      setIsHeadersReady(true);
    };
    
    setupHeaders();
  }, [getAccessToken]);

  const handleToolSelect = useCallback(async (command: string) => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }

    const token = await getAccessToken();
    
    try {      
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
    
      append({
        role: 'user',
        content: command,
      });

      if (topRef.current) {
        setTimeout(() => {
          topRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
      
    } catch (error) {
      console.error('Error in handleToolSelect:', error);
    }
  }, [append, chatId, newChatId, user?.id, agentId, agent?.name, getAccessToken, setSidebarOpen]);

  useEffect(() => {
    const tool = searchParams.get('tool');
    // Ensure all dependencies are ready and the tool hasn't been triggered yet
    if (!hasTriggeredTool.current && tool && messages.length === 0 && handleToolSelect) {
      // Add a small delay to ensure everything is initialized
      const timeoutId = setTimeout(() => {
        const toolCommand = getToolCommand(tool);
        if (toolCommand) {
          console.log(`Triggering tool from URL parameter: ${tool} with command: ${toolCommand}`);
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
  };

  useEffect(() => {
    if (topRef.current) {
      const rect = topRef.current.getBoundingClientRect();
      if (rect.bottom > window.innerHeight || rect.top < 0) {
        topRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [topRef.current]);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);


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
  
    loadInitialMessages();
  }, [chatId, getAccessToken, user]);

  const updateChatInDB = async (messages: Message[]): Promise<string[]> => {
    const lastMessage = messages[messages.length - 1];
  
    if ((lastMessage.content === '' && lastMessage.toolInvocations?.length === 0) || !user?.id) {
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
  };

  useEffect(() => {
    if (!agent) return;
    if (messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;
    
    // Create a new debounced function for each message
    const debouncedSave = debounce(async () => {
      await updateChatInDB(messages);
    }, 1000);
  
    debouncedSave();
  
    return () => {
      debouncedSave.cancel();
    };
  }, [messages, agent]);

  useEffect(() => {
    // get agent and set agent name
    if (!user) return;
    getAgent().then((agent) => {
      setAgent(agent);
    });
  }, [user]);

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-2xl font-semibold"><LoadingIndicator/></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-900">
      <div className="flex flex-1 pt-16 lg:pt-0">
        <div className="fixed top-0 left-0 right-0 h-[61px] bg-zinc-900 border-b border-zinc-700 flex items-center px-4 z-10">
          <div className="flex items-center gap-2 relative lg:left-[250px] md:left-[25px] sm:left-[25px]">
            <div className="lg:ml-0 ml-[55px]">
              {agent.imageUrl ? (
                <img 
                  src={agent.imageUrl} 
                  alt={agent.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                  <BotIcon />
                </div>
              )}
            </div>
            <Link className="text-indigo-500 text-indigo-400" href={`/`}>          
              <h1 className="text-lg font-medium text-white">{agent.name}</h1>
            </Link>
          </div>
        </div>

        <div className="flex-1 flex flex-col max-w-full break-words overflow-hidden">
          <div 
            className={`flex-1 overflow-y-auto ${messages.length === 0 ? 'pt-0 sm:32' : 'pt-0 sm:pt-20'} pb-32`}
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
              
            <div className="max-w-2xl sm:max-w-4xl mx-auto">
              {messages.length > 0 ? (
                messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    className={`flex gap-3 py-4 max-w-[95%]`}
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                  >
                    <div className="w-6 h-6 flex-shrink-0 text-zinc-400">
                      {message.role === "assistant" ? (
                        agent.imageUrl ? (
                          <img 
                            src={agent.imageUrl} 
                            alt={agent.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <BotIcon />
                        )
                      ) : (
                        <UserIcon />
                      )}
                    </div>

                    <div className="flex-1 space-y-2 max-w-[100%] text-white" ref={topRef}>
                      {message.toolInvocations?.map((tool) => {
                        switch(tool.toolName) {
                          case 'getUserSolanaBalance':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><SolanaBalance key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/></div>
                          case 'getAgentSolanaBalance':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><SolanaBalance key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/></div>
                          case 'getUserPortfolioValue':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><PortfolioValue key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/></div>
                          case 'getAgentPortfolioValue':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><PortfolioValue key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/></div>
                          case 'getUserTokenHoldings':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><TokenHoldings key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/></div>
                          case 'getFearAndGreedIndex':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><FearAndGreedIndex key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/></div>
                          case 'getSolanaTransactionVolume':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><SolanaTransactionVolume key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/></div>
                          case 'getAgentTokenHoldings':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><TokenHoldings key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/></div>
                          case 'getMarketMovers':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><MarketMovers key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/></div>
                          case 'getRecentlyLaunchedCoins':
                            return <RecentCoinsResults key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>;
                          case 'getTokenInfo':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><TokenInfo key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/></div>
                          case 'searchTokens':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><SearchTokens key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/></div>
                          case 'getContractAddress':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><SearchTokens key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/></div>
                          case 'getTotalCryptoMarketCap':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><TotalCryptoMarketCap key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/></div>
                          case 'getMarketCategories':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><MarketCategories key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/></div>
                          case 'getDerivativesExchanges':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><DerivativesExchanges key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/></div>
                          case 'getTopHolders':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><TopHoldersDisplay key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/></div>
                          case 'getAccountDetails':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><AccountInfo key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/></div>
                          case 'getTrendingTokens':
                            return tool.args.chain === 'solana' 
                              ? <TrendingSolanaTokens key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>
                              : <TrendingCoins key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>;
                          case 'getTopNfts':
                            return <TopNFTsResults key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} />;
                          case 'swap':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><ExecuteSwap key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} /></div>;
                          case 'getRecentDexScreenerTokens':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><RecentDexScreenerTokens key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} /></div>;
                          case 'getCryptoNews':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><RecentNews key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} /></div>;
                          case 'stockAnalysis':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><StockAnalysis key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} /></div>;
                          case 'optionsAnalysis':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><OptionsAnalysis key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} /></div>;
                          case 'newsAnalysis':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><NewsAnalysis key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} /></div>;
                          case 'webResearch':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><WebResearch key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} /></div>;
                          case 'getTradingViewChart':
                            return <TradingViewChart key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} />;
                          case 'getTechnicalAnalysis':
                            return "result" in tool ? (
                              <div className="p-4">
                                <TechnicalAnalysis data={tool.result} />
                              </div>
                            ) : null;
                          case 'getFredSeries':
                            return <div className="max-w-[100%] sm:max-w-[75%]"><FredAnalysis key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool} /></div>;
                          case 'fredSearch':
                            return (
                              <div className="max-w-[100%] sm:max-w-[75%]">
                                <FredSearch 
                                  key={tool.toolCallId} 
                                  toolCallId={tool.toolCallId} 
                                  toolInvocation={tool}
                                  onShowChart={(seriesId) => handleToolSelect(`Show me the FRED series ${seriesId}`)}
                                />
                              </div>
                            );
                          default:
                            return null;
                        }
                      })}

                      {(message.experimental_attachments?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {message.experimental_attachments?.map((attachment, idx) => (
                            <AttachmentDisplay 
                              key={`${attachment.name || idx}`} 
                              attachment={attachment}
                            />
                          ))}
                        </div>
                      )}
                      
                      <div className="max-w-[90%] sm:max-w-[75%]">
                        <Markdown>{message.content}</Markdown>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : !searchParams.get('tool') && (
                <div className={`flex items-center ${ sidebarOpen ? '' : 'justify-center'}`}>
                  <motion.div className="h-[350px] px-4 w-full md:w-[500px] md:px-0 pt-0 sm:pt-40">
                    <EmptyState 
                      agent={agent}
                      userId="template"
                      agentId={agentId}
                      onDescribeTools={() => handleToolSelect('What tools do you have access to?')}
                    />
                  </motion.div>
                </div>
              )}

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3 py-4 w-full bg-zinc-900 text-zinc-500 text-sm">
                  <LoadingIndicator /> <span className="animate-pulse">Thinking...</span>
                </div>
              )}
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-700 p-4">
            <AnimatePresence>
              {files && (
                <div className="flex gap-2 mb-2 overflow-x-auto pb-2 sm:relative sm:left-[250px] sm:ml-0">
                  {Array.from(files).map((file) =>
                    file.type.startsWith("image") ? (
                      <motion.img
                        key={file.name}
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-16 w-16 object-cover rounded-md"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                      />
                    ) : (
                      <motion.div
                        key={file.name}
                        className="h-16 w-16 p-2 text-[8px] bg-zinc-800 rounded-md border border-zinc-700 overflow-hidden"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                      >
                        <TextFilePreview file={file} />
                      </motion.div>
                    )
                  )}
                </div>
              )}
            </AnimatePresence>

            <form onSubmit={(event) => {
              const options = files ? { experimental_attachments: files } : {};
              handleFormSubmit(event, options);
              setFiles(null);
            }} className="max-w-2xl mx-auto flex gap-2 relative">
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
                  className="flex-1 bg-transparent py-2 px-2 text-white outline-none resize-none overflow-y-auto pb-2"
                  placeholder="Send a message..."
                  value={input}
                  onChange={handleInputChange}
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
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <ChatSidebar 
        agent={agent}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onToolSelect={handleToolSelect}
        refreshAgent={refreshAgent}
      />
    </div>
  );
}

export const dynamic = 'force-dynamic';
export const runtime = 'edge'; 