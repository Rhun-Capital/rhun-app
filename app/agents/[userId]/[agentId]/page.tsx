/* eslint-disable @next/next/no-img-element */
"use client";
import { ToolInvocation } from 'ai';
import {
  AttachmentIcon,
  BotIcon,
  UserIcon
} from "@/components/icons";
import Image from 'next/image';
import { useChat } from "ai/react";
import { DragEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { useParams } from 'next/navigation';
import { usePrivy } from "@privy-io/react-auth";
import LoadingIndicator from "@/components/loading-indicator";
import MarketMovers from "@/components/market-movers";
import TokenInfo from "@/components/token-info";
import SearchTokens from "@/components/search-tokens";

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
  const params = useParams();
  const [agent, setAgent] = useState<any>();
  const [headers, setHeaders] = useState<any>();
  const agentId = params.agentId;  

  useEffect(() => {
    const setupHeaders = async () => {
      const token = await getAccessToken();
      setHeaders({
        'Authorization': `Bearer ${token}`
      });
    };
    
    setupHeaders();
  }, [getAccessToken]);


  const { messages, input, handleSubmit, handleInputChange, addToolResult, isLoading } =
    useChat({
      headers,
      body: { agentId, user },
      onError: () =>
        toast.error("You've been rate limited, please try again later!"),
      maxSteps: 20,
      // async onToolCall({ toolCall }) {
      //   if (toolCall.toolName === 'getSolanaBalance') {
      //   }
      // },
    });

  const [files, setFiles] = useState<FileList | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Reference for the hidden file input
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // get agent and sey agent name
    if (!user) return;
    getAgent().then((agent) => {
      setAgent(agent);
    });
  }, [user])

  const getAgent = async () => {
    const accessToken = await getAccessToken();
    const response = await fetch(
      `/api/agents/${user?.id}/${agentId}`,
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-2xl font-semibold"><LoadingIndicator/></div>
      </div>
    );
  }

  return (

      <div
        className="flex flex-row justify-center pb-20  bg-white dark:bg-zinc-900"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <AnimatePresence>
          {isDragging && (
            <motion.div
              className="fixed pointer-events-none dark:bg-zinc-900/90 h-dvh w-dvw z-10 flex flex-row justify-center items-center flex flex-col gap-1 bg-zinc-100/90"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div>Drag and drop files here</div>
              <div className="text-sm dark:text-zinc-400 text-zinc-500">
                {"(images and text)"}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col justify-between gap-4">
          {messages.length > 0 ? (
            <div className="flex flex-col gap-2 h-full w-full items-center">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  className={`flex flex-row gap-2 px-4 w-full md:w-[500px] md:px-0 ${
                    index === 0 ? "pt-20" : ""
                  }`}
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                >
                  <div className="size-[24px] flex flex-col justify-center items-center flex-shrink-0 text-zinc-400">
                    {message.role === "assistant" ? <BotIcon /> : <UserIcon />}
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-zinc-800 dark:text-zinc-300 flex flex-col gap-4">
                      <Markdown>{message.content}</Markdown>
                      {message.toolInvocations?.map((toolInvocation: ToolInvocation) => {
                        const toolCallId = toolInvocation.toolCallId;
                        // render confirmation tool (client-side tool with user interaction)
                        if (toolInvocation.toolName === 'getUserSolanaBalance') {
                          return (
                            <div key={toolCallId}>
                              {toolInvocation.args.message}
                              {/* Balance Display */}
                              <div className="bg-zinc-800 rounded-lg border border-zinc-700">
                                <div className="flex items-center gap-3 bg-zinc-900 rounded-lg p-4">
                                  <Image src="/images/chains/solana.svg" alt="Solana Logo" width={14} height={14} />
                                  <span className="text-xl font-semibold">
                                    {"result" in toolInvocation ? (toolInvocation.result.balance as number).toFixed(4) : 0}
                                  </span>
                                  <span className="text-zinc-400">SOL</span>
                                </div>
                              </div>
                            </div>
                          );
                        }    

                        if (toolInvocation.toolName === 'getAgentSolanaBalance') {

                          return (
                            <div key={toolCallId}>
                              {toolInvocation.args.message}
                              {/* Balance Display */}
                              <div className="bg-zinc-800 rounded-lg border border-zinc-700">
                                <div className="flex items-center gap-3 bg-zinc-900 rounded-lg p-4">
                                  <Image src="/images/chains/solana.svg" alt="Solana Logo" width={14} height={14} />
                                  <span className="text-xl font-semibold">
                                    {"result" in toolInvocation ? (toolInvocation.result.balance as number).toFixed(4) : 0}
                                  </span>
                                  <span className="text-zinc-400">SOL</span>
                                </div>
                              </div>
                            </div>
                          );
                        }   
                        
                        if (toolInvocation.toolName === 'getUserPortfolioValue' || toolInvocation.toolName === 'getAgentPortfolioValue') {
                          {toolInvocation.args.message}
                          return (
                            <div className="p-6 bg-zinc-800 rounded-lg" key={toolCallId}>
                            <h3 className="text-sm text-zinc-400 mb-2">Portfolio Value</h3>
                            <p className="text-2xl font-bold">
                              {"result" in toolInvocation ? '$' + toolInvocation.result.totalValue.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }) : <LoadingIndicator/>}
                            </p>
                          </div>  
                          )            
                        }

                        if (toolInvocation.toolName === 'getUserTokenHoldings' || toolInvocation.toolName === 'getAgentTokenHoldings') {
                          return (
                            <div key={toolCallId}>
                              {toolInvocation.args.message}
                              {/* Balance Display */}
                                {"result" in toolInvocation ? toolInvocation.result.map((token: any) => (
                                  <div key={token.mint} className="flex justify-between items-center p-4 bg-zinc-800 rounded-lg mb-2">
                                    <div className="flex items-center gap-4">
                                      {token.logoURI ? (
                                        <img 
                                          src={token.logoURI} 
                                          alt={token.symbol}
                                          className="w-8 h-8 rounded-full"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const nextSibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                                            if (nextSibling) {
                                              nextSibling.style.display = 'flex';
                                            }
                                          }}
                                        />
                                      ) : 
                                      
                                      <div>
                                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                                            <span className="text-xs text-zinc-300">?</span>
                                        </div>
                                      </div>
                                      }

                                      <div>
                                        <p className="font-medium">{token.name}</p>
                                        <p className="text-sm text-zinc-400">
                                          {token.amount.toLocaleString(undefined, { 
                                            maximumFractionDigits: 4 
                                          })} {token.symbol}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium">
                                        ${token.usdValue.toLocaleString(undefined, { 
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2 
                                        })}
                                      </p>
                                      <p className={`text-sm ${
                                        token.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'
                                      }`}>
                                        {token.priceChange24h.toFixed(2)}%
                                      </p>
                                    </div>
                                  </div>
                                )) : null}


                            </div>
                          );
                        }

                        if (toolInvocation.toolName === 'getFearAndGreedIndex') {

                          return (
                            <div key={toolCallId}>
                              <div className="p-6 bg-zinc-800 rounded-lg">
                                {toolInvocation.args.message}
                                <h3 className="text-lg font-semibold mb-4">Fear & Greed Index</h3>
                                <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`text-3xl font-bold ${
                                      "result" in toolInvocation ? toolInvocation.result.value > 50 
                                        ? 'text-green-500' 
                                        : 'text-red-500'
                                    : null} `}>
                                      {"result" in toolInvocation ? toolInvocation.result.value : <LoadingIndicator/>}
                                    </div>
                                    <div className="text-zinc-400">
                                      {"result" in toolInvocation ? toolInvocation.result.classification : ''}
                                    </div>
                                  </div>                                  

                                </div>
                              </div>
                            </div>     
                          )                     
                        }

                        if (toolInvocation.toolName === 'getSolanaTransactionVolume') {

                          return (
                            <div key={toolCallId}>
                              <div className="p-6 bg-zinc-800 rounded-lg">
                              {toolInvocation.args.message}
                              <div className="mb-4">
                                <h3 className="text-lg font-semibold">Transaction Volume</h3>
                                <small className="text-zinc-400">Last 24 hours</small>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mb-2">
                                <div className="bg-zinc-900 p-4 rounded-lg">
                                  <div className="text-sm text-zinc-400 mb-1">Volume (USD)</div>
                                  <div className="text-lg font-bold">
                                  {"result" in toolInvocation ? toolInvocation.result.volume.volumeUSD.toLocaleString(undefined, {
                                      maximumFractionDigits: 2
                                    }) : <LoadingIndicator/>}
                                  </div>
                                </div>

                                <div className="bg-zinc-900 p-4 rounded-lg">
                                  <div className="text-sm text-zinc-400 mb-1">Volume (SOL)</div>
                                  <div className="text-lg font-bold flex items-center gap-2">
                                    <Image src="/images/chains/solana.svg" alt="Solana Logo" width={14} height={14} />
                                    {"result" in toolInvocation ? toolInvocation.result.volume.volumeSOL.toLocaleString(undefined, {
                                      maximumFractionDigits: 2
                                    }) : <LoadingIndicator/>}
                                  </div>
                                </div>
                              </div>
                              </div>
                              </div>
                          )
    
                          
                        }        
                        
                        if (toolInvocation.toolName === 'getTokenInfo') {
                          return <TokenInfo toolCallId={toolCallId} toolInvocation={toolInvocation}/>
                        } 

                        if (toolInvocation.toolName === 'getMarketMovers') {
                          return <MarketMovers toolCallId={toolCallId} toolInvocation={toolInvocation}/>
                        }

                        if (toolInvocation.toolName === 'searchTokens') {
                          return <SearchTokens toolCallId={toolCallId} toolInvocation={toolInvocation}/>                          
                        }   
                        

                      })}                
                        
                     {/* {message.role === 'assistant' ? <PieChart/> : null} */}
                    </div>
                    <div className="flex flex-row gap-2">
                      {message.experimental_attachments?.map((attachment) =>
                        attachment.contentType?.startsWith("image") ? (
                          <img
                            className="rounded-md w-40 mb-3"
                            key={attachment.name}
                            src={attachment.url}
                            alt={attachment.name}
                          />
                        ) : attachment.contentType?.startsWith("text") ? (
                          <div className="text-xs w-40 h-24 overflow-hidden text-zinc-400 border p-2 rounded-md dark:bg-zinc-800 dark:border-zinc-700 mb-3">
                            {getTextFromDataUrl(attachment.url)}
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {isLoading &&
                messages[messages.length - 1].role !== "assistant" && (
                  <div className="flex flex-row gap-2 px-4 w-full md:w-[500px] md:px-0">
                    <div className="size-[24px] flex flex-col justify-center items-center flex-shrink-0 text-zinc-400">
                      <BotIcon />
                    </div>
                    <div className="flex flex-col gap-1 text-zinc-400">
                      <div>hmm...</div>
                    </div>
                  </div>
                )}

              <div ref={messagesEndRef} />
            </div>
          ) : (
            <motion.div className="h-[350px] px-4 w-full md:w-[500px] md:px-0 pt-20">
              <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm dark:text-zinc-400 dark:border-zinc-700">
                <p className="flex flex-row justify-center gap-4 items-center text-zinc-900 dark:text-zinc-50">  
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
                    className="text-indigo-500 dark:text-indigo-400"
                    href="https://rhun.io"
                    target="_blank"
                  >
                    {agent.name + " "}
                  </Link>
                  in the docs. You can edit the agent details by clicking the button below.
                </p>

                <Link 
                      key={agent.id + '-edit'}
                      href={`/agents/${user?.id}/${agent.id}/edit`}
                      className="group"
                    ><button className="outline outline-indigo-400 px-6 py-1 rounded-md hover:outline-indigo-500">Edit Agent Details</button></Link>


              </div>
            </motion.div>
          )}

          <form
            className="flex flex-col gap-2  items-center"
            onSubmit={(event) => {
              const options = files ? { experimental_attachments: files } : {};
              handleSubmit(event, options);
              setFiles(null);
            }}
          >
            <AnimatePresence>
              {files && files.length > 0 && (
                <div className="flex flex-row gap-2 absolute bottom-12 px-4 w-full md:w-[500px] md:px-0">
                  {Array.from(files).map((file) =>
                    file.type.startsWith("image") ? (
                      <div key={file.name}>
                        <motion.img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="rounded-md w-16"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{
                            y: -10,
                            scale: 1.1,
                            opacity: 0,
                            transition: { duration: 0.2 },
                          }}
                        />
                      </div>
                    ) : file.type.startsWith("text") ? (
                      <motion.div
                        key={file.name}
                        className="text-[8px] leading-1 w-28 h-16 overflow-hidden text-zinc-500 border p-2 rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{
                          y: -10,
                          scale: 1.1,
                          opacity: 0,
                          transition: { duration: 0.2 },
                        }}
                      >
                        <TextFilePreview file={file} />
                      </motion.div>
                    ) : null
                  )}
                </div>
              )}
            </AnimatePresence>

            {/* Hidden file input */}
            <input
              type="file"
              multiple
              accept="image/*,text/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex items-center w-full md:max-w-[500px] max-w-[calc(100dvw-32px)] bg-zinc-100 dark:bg-zinc-700 rounded-full px-4 py-2">
              {/* Upload Button */}
              <button
                type="button"
                onClick={handleUploadClick}
                className="text-zinc-500 dark:text-zinc-300 hover:text-zinc-700 dark:hover:text-zinc-100 focus:outline-none mr-3"
                aria-label="Upload Files"
              >
                <span className="w-5 h-5">
                  <AttachmentIcon aria-hidden="true" />
                </span>
              </button>

              {/* Message Input */}
              <input
                ref={inputRef}
                className="bg-transparent flex-grow outline-none text-zinc-800 dark:text-zinc-300 placeholder-zinc-400"
                placeholder="Send a message..."
                value={input}
                onChange={handleInputChange}
                onPaste={handlePaste}
              />
            </div>
          </form>
        </div>
      </div>
    
  );
}