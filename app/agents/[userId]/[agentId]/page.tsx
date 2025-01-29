"use client";
import {
  AttachmentIcon,
  BotIcon,
  UserIcon,
  SettingsIcon,
  MessageIcon
} from "@/components/icons";
import { useRecentChats } from '@/contexts/chat-context';
import { useChat } from "ai/react";
import { DragEvent, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Toaster } from 'sonner';
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { useParams, useSearchParams } from 'next/navigation';
import { usePrivy } from "@privy-io/react-auth";
import LoadingIndicator from "@/components/loading-indicator";
import MarketMovers from "@/components/tools/market-movers";
import TokenInfo from "@/components/tools/token-info";
import SearchTokens from "@/components/tools/search-tokens";
import TotalCryptoMarketCap from "@/components/tools/total-crypto-marketcap";
import MarketCategories from "@/components/tools/market-categories";
import DerivativesExchanges from "@/components/tools/derivatives-exchanges";
// import AnalyzeSolanaTokenHolders from "@/components/analyze-solana-token-holders";
import TopHoldersDisplay from "@/components/tools/get-top-holders";
import { Message } from 'ai'; // Use the AI SDK Message type
import  ChatSidebar  from "@/components/chat-sidebar";
import SolanaBalance  from "@/components/tools/solana-balance";
import PortfolioValue  from "@/components/tools/portfolio-value";
import TokenHoldings  from "@/components/tools/token-holdings";
import FearAndGreedIndex from "@/components/tools/fear-and-greed-index";
import SolanaTransactionVolume from "@/components/tools/solana-transaction-volume";
import  SwapComponent  from "@/components/tools/swap-component";

// import { ChartComponent } from "@/components/line-chart";
// import { PieChart } from "@/components/pie-chart";



const getTextFromDataUrl = (dataUrl: string) => {
  const base64 = dataUrl.split(",")[1];
  return window.atob(base64);
};

function TextFilePreview({ file }: { file: File }) {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      setContent(typeof text === "string" ? text.slice(0, 100) : "");
    };
    reader.readAsText(file);
  }, [file]);

  return (
    <div>
      {content}
      {content.length >= 100 && "..."}
    </div>
  );
}

export default function Home() {
  const { user, getAccessToken } = usePrivy();
  const { refreshRecentChats } = useRecentChats();
  const [agent, setAgent] = useState<any>();
  const [headers, setHeaders] = useState<any>();
  const [files, setFiles] = useState<FileList | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Reference for the hidden file input
  const [isDragging, setIsDragging] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedInput, setSavedInput] = useState("");
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isNewChat, setIsNewChat] = useState(true);
  const [isHeadersReady, setIsHeadersReady] = useState(false);
  const chatCreatedRef = useRef(false);  
  const params = useParams();
  const agentId = params.agentId;  
  const searchParams = useSearchParams(); 
  const chatId = searchParams.get('chatId');  

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

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

  useEffect(() => {
    const loadInitialMessages = async (): Promise<void> => {
      if (!chatId || !params.userId) return;
      
      try {
        const token = await getAccessToken();
        const response = await fetch(
          `/api/chat/${chatId}?userId=${decodeURIComponent(params.userId as string)}`,
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
            toolInvocations: msg.toolInvocations?.map((tool: any) => ({
              ...tool, // Preserve all tool properties
              toolName: tool.toolName,
              toolCallId: tool.toolCallId,
              args: tool.args,
              result: tool.result
            }))
          }));
          
          setInitialMessages(formattedMessages);
          setIsNewChat(false); // Mark as existing chat
          chatCreatedRef.current = true; // Prevent new chat creation

        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        toast.error('Failed to load chat history');
      }
    };
  
    loadInitialMessages();
  }, [chatId, params.userId, getAccessToken]);

  const { messages, input, handleSubmit, handleInputChange, addToolResult , isLoading, append } =
    useChat({
      headers,
      body: { agent, user },
      maxSteps: 20,
      initialMessages,
      id: chatId ?? undefined,

      // onToolCall: async ({ toolCall }) => {
      //   const accessToken = await getAccessToken();
      //   if (toolCall.toolName === 'provideContractAddress') {
      //     addToolResult({ toolCallId: toolCall.toolCallId, result: 'You can search for the token first to get the contract address.' });
      //     // return 'You can search for the token first to get the contract address.';
      //   }

      //   if (toolCall.toolName === 'searchTokens') {
      //     addToolResult({ toolCallId: toolCall.toolCallId, result: 'You can click into the result to get the contract address.' });
      //     // return 'You can click into the result to get the contract address.';
      //   }        
        
      //   // if (toolCall.toolName === 'getTokenInfo') {
      //   //   // First, search for the token
      //   //   const searchResults = await fetch(
      //   //     `/api/tools/search-tokens?query=${(toolCall.args as { query: string }).query}`,
      //   //     {
      //   //       headers: {
      //   //         'accept': 'application/json',
      //   //         'Authorization': `Bearer ${accessToken}`
      //   //       }
      //   //     }
      //   //   ).then(r => r.json());
          
          
      //   //   if (!searchResults.coins || searchResults.coins.length === 0) {
      //   //     addToolResult({ toolCallId: toolCall.toolCallId, result: 'Token not found' });
      //   //     return;
      //   //   }
    
      //   //   // Add the search results 
      //   //   addToolResult({ toolCallId: toolCall.toolCallId, result: "Choose one of the results above to get more information on the token" });
      //   //   return
    
      //   //   // The AI can now see these results and make the next tool call
      //   //   // for getTokenInfo with the correct coinId
      //   // }

      // },
      
      
      onError: () => {
        toast.error('Failed to send message. Please try again.')
      },
      // onToolCall: async ({ toolCall }) => {},
      onFinish: async (message) => {
        // Move message storage here to ensure we get the complete message
        const currentMessages = [...messages, message];  // Include the final message
        updateChatInDB(currentMessages);
      },
    });
  
  // Add this handler function
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      
      if (commandHistory.length === 0) return;
  
      if (event.key === 'ArrowUp') {
        // Save current input if we're just starting to look through history
        if (historyIndex === -1) {
          setSavedInput(input);
        }
  
        // Move back through history
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        handleInputChange({ target: { value: commandHistory[commandHistory.length - 1 - newIndex] } } as any);
      } else if (event.key === 'ArrowDown') {
        if (historyIndex === -1) return;
  
        // Move forward through history
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        
        if (newIndex === -1) {
          // Restore the saved input when we reach the bottom
          handleInputChange({ target: { value: savedInput } } as any);
        } else {
          handleInputChange({ target: { value: commandHistory[commandHistory.length - 1 - newIndex] } } as any);
        }
      }
    }
  };

  const createNewChat = async (message: string) => {
    if (!isNewChat || chatId || currentChatId || chatCreatedRef.current) {
      return chatId || currentChatId;
    }

    if (message.trim() === '') return
  
    const newChatId = `chat_${decodeURIComponent(params.userId as string)}_${Date.now()}`;
    const token = await getAccessToken();
  
    try {
      const response = await fetch(`/api/chat/${newChatId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: decodeURIComponent(params.userId as string),
          agentId,
          agentName: agent?.name,
          lastMessage: message,
          lastUpdated: new Date().toISOString()
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to create chat');
      }
  
      setCurrentChatId(newChatId);
      setIsNewChat(false);
      chatCreatedRef.current = true;
      
      // Refresh the recent chats list
      await refreshRecentChats();

      return newChatId;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  };  

  const updateChatInDB = async (messages: Message[]) => {
    const lastMessage = messages[messages.length - 1];

    if ((lastMessage.content === '' && lastMessage.toolInvocations?.length === 0) || !params.userId) return;  
    
    const chatIdentifier = await createNewChat(lastMessage.content);
    
    if (!chatIdentifier) return;
  
    const token = await getAccessToken();
    
    try {
      // Update chat metadata
      await fetch(`/api/chat/${chatIdentifier}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: decodeURIComponent(params.userId as string),
          agentId,
          agentName: agent?.name,
          lastMessage: lastMessage.content,
          lastUpdated: new Date().toISOString()
        })
      });
  
      // Store the message with tool invocations
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chatId: chatIdentifier,
          messageId: lastMessage.id,
          userId: decodeURIComponent(params.userId as string),
          role: lastMessage.role,
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          toolInvocations: lastMessage.toolInvocations?.map(tool => ({
            toolName: tool.toolName,
            toolCallId: tool.toolCallId,
            args: tool.args,
            result: 'result' in tool ? tool.result : undefined
          }))
        })
      });
    } catch (error) {
      console.error('Error updating chat:', error);
    }
  };
  
  const handleToolSelect = useCallback(async (command: string) => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }

    const token = await getAccessToken();
    
    try {
      const chatIdentifier = await createNewChat(command);
      
      if (chatIdentifier) {
        await fetch(`/api/chat/${chatIdentifier}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: decodeURIComponent(params.userId as string),
            agentId,
            agentName: agent?.name,
            lastMessage: command,
            lastUpdated: new Date().toISOString()
          })
        });
      }
  
      append({
        role: 'user',
        content: command,
      });
      
      // Rest of the function...
    } catch (error) {
      console.error('Error in handleToolSelect:', error);
    }
  }, [append, params.userId, agentId, agent?.name, getAccessToken, isNewChat]);

  // Make sure your handleFormSubmit function looks like this:
  const handleFormSubmit = (event: React.FormEvent, options = {}) => {
    if (input.trim()) {
      // Only add to history if it's different from the last command
      if (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== input.trim()) {
        setCommandHistory(prev => [...prev, input.trim()]);
      }
      setHistoryIndex(-1); // Reset history index
      setSavedInput(""); // Reset saved input
    }
    handleSubmit(event, options);
    setFiles(null);
  };
  

  useEffect(() => {
    // get agent and sey agent name
    if (!user) return;
    getAgent().then((agent) => {
      setAgent(agent);
    });
  }, [user])

  const getAgent = async () => {
    const accessToken = await getAccessToken();
    console.log(`/api/agents/${decodeURIComponent(params.userId as string)}/${agentId}`)
    const response = await fetch(
      `/api/agents/${decodeURIComponent(params.userId as string)}/${agentId}`,
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // const scrollToBottom = () => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // };

  // useEffect(() => {
  //   scrollToBottom();
  // }, [messages]);

  // Function to handle file selection via the upload button
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Function to handle files selected from the file dialog
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

  if (!isHeadersReady) {
    return <LoadingIndicator />;
  }  

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-2xl font-semibold"><LoadingIndicator/></div>
      </div>
    );
  }

  return (
    <div>
    <div className="flex flex-col h-screen bg-white bg-zinc-900">
  
      <div className="flex flex-1 pt-16 lg:pt-0">

      <div className="fixed top-0 left-0 right-0 h-[61px] bg-zinc-900 border-b border-zinc-700 flex items-center px-4 z-10">
        <div className="max-w-4xl mx-auto w-full flex items-center gap-3">
          <div className="lg:ml-0 ml-[55px]">  {/* Add responsive margin here */}
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
          <h1 className="text-lg font-medium text-white">{agent.name}</h1>
        </div>
      </div>        
  
        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          <div 
            className="flex-1 overflow-y-auto pb-32"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag overlay */}
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
  
            {/* Messages */}
            <div className="max-w-4xl mx-auto px-1 mt-[7%]">
              {messages.length > 0 ? (
                messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    className={`flex gap-3 py-4 w-full`}
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
  
                    <div className={`flex-1 space-y-2 max-w-[75%] text-white`}>
                      <Markdown>{message.content}</Markdown>
                      
                      {/* Tool Invocations */}
                      {message.toolInvocations?.map((tool) => {

                        switch(tool.toolName) {
                          case 'getUserSolanaBalance':
                            return <SolanaBalance key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>
                          case 'getAgentSolanaBalance':
                            return <SolanaBalance key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>
                          case 'getUserPortfolioValue':
                            return <PortfolioValue key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>
                          case 'getAgentPortfolioValue':
                            return <PortfolioValue key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>
                          case 'getUserTokenHoldings':
                            return <TokenHoldings key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>
                          case 'getFearAndGreedIndex':
                            return <FearAndGreedIndex key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>
                          case 'getSolanaTransactionVolume':
                            return <SolanaTransactionVolume key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>
                          case 'getAgentTokenHoldings':
                            return <TokenHoldings key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>
                          case 'getMarketMovers':
                            return <MarketMovers key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>;
                          case 'getTokenInfo':
                            return <TokenInfo key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>;
                          case 'searchTokens':
                            return <SearchTokens key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>;
                          case 'getContractAddress':
                            return <SearchTokens key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>;
                          case 'getTotalCryptoMarketCap':
                            return <TotalCryptoMarketCap key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>;
                          case 'getMarketCategories':
                            return <MarketCategories key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>;
                          case 'getDerivativesExchanges':
                            return <DerivativesExchanges key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>;
                          case 'getTopHolders':
                            return <TopHoldersDisplay key={tool.toolCallId} toolCallId={tool.toolCallId} toolInvocation={tool}/>;
                          default:
                            return null;
                        }
                      })}
  
                      {/* Attachments */}
                      {/* {(message.experimental_attachments?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {message.experimental_attachments?.map((attachment) =>
                            attachment.contentType?.startsWith("image") ? (
                              <img
                                key={attachment.name}
                                src={attachment.url}
                                alt={attachment.name}
                                className="rounded-md w-40 h-40 object-cover"
                              />
                            ) : attachment.contentType?.startsWith("text") ? (
                              <div key={attachment.name} className="text-xs w-40 h-24 overflow-hidden text-zinc-400 border p-2 rounded-md bg-zinc-800 border-zinc-700">
                                {attachment.url ? <TextFilePreview file={new File([getTextFromDataUrl(attachment.url ?? '')], attachment.name || '')} /> : null}
                              </div>
                            ) : null
                          )}
                        </div>
                      )} */}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div>
                <div className={`h-[350px] flex items-center ${ sidebarOpen ? '' : 'justify-center'}`}>
                <motion.div className="h-[350px] px-4 w-full md:w-[500px] md:px-0 pt-20">
                    <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm dark:text-zinc-400 border-zinc-700">
                      <p className="flex flex-row justify-center gap-4 items-center dark:text-white dark:text-zinc-50">  
                        <BotIcon />
                        <span>+</span>
                        <AttachmentIcon />
                      </p>
                      <p>
                        You can ask the agent any technical question you&apos;d like. You can also drag and drop files here to send them as attachments. You can
                        send images and text files.
                      </p>
                      <p className="mb-2">
                        {" "}
                        Learn more about how to use{" "}
                        <Link
                          className="text-indigo-500 text-indigo-400"
                          href={`/agents/${decodeURIComponent(params.userId as string)}/${agentId}/edit`}
                        >
                          {agent.name + " "}
                        </Link>
                        in the docs. You can edit the agent details by clicking the button below.
                      </p>
                    </div>
                  </motion.div>

                </div>

                </div>
              )}


              {!messages.length ? <div> <Link href={`/agents/${decodeURIComponent(params.userId as string)}/${agentId}/edit`}>
                <button className="py-1 px-4 text-white outline outline-indigo-600 rounded-lg hover:bg-indigo-600 ml-5">
                <div className="flex items-center"> <SettingsIcon/>&nbsp;Edit Agent</div>
                </button>
              </Link>
              <button 
                onClick={() => handleToolSelect('What tools do you have access to?')}
                className="py-1 px-4 text-white outline outline-indigo-600 rounded-lg hover:bg-indigo-600 ml-5"
              >
                <div className="flex items-center"><MessageIcon/>&nbsp;Describe Tools</div>
              </button></div> : null}

                       
  
              {/* Loading state */}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3 py-4 w-full bg-zinc-900">
                  <LoadingIndicator />
                </div>
              )}
            </div>
          </div>
  
          {/* Input area */}
          <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-700 p-4">
            {/* File previews */}
            {/* <AnimatePresence>
              {files && (
                <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
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
            </AnimatePresence> */}
  
            {/* Input form */}
            <form onSubmit={handleFormSubmit} className="max-w-4xl mx-auto flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept="image/*,text/*"
                onChange={handleFileChange}
              />
              
              <div className="flex-1 flex items-center bg-zinc-800 rounded-full px-4">
                {/* <button
                  type="button"
                  onClick={handleUploadClick}
                  className="p-2 text-zinc-400 hover:text-white"
                >
                  <AttachmentIcon />
                </button> */}
                
                <input
                  ref={inputRef}
                  className="flex-1 bg-transparent py-2 px-2 text-white outline-none"
                  placeholder="Send a message..."
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                />
                <button type="submit" className="p-2 text-zinc-400 hover:text-white">
                  Submit
                </button>
              </div>
  

            </form>


          </div>


        </div>

      </div>
  
      <Toaster />
    </div>
          {/* Sidebar container */}
          <ChatSidebar 
            agent={agent}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onToolSelect={handleToolSelect}
          />      
    </div>
  );


}