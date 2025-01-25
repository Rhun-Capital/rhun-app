// components/chat-sidebar.tsx
import React, { useState, useEffect } from 'react';
import { WalletIcon, ToolsIcon, ChevronRightIcon } from '@/components/icons';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import LoadingIndicator from './loading-indicator';

interface Tool {
  name: string;
  description: string;
  command: string;
}

interface SidebarProps {
  agent: any;
  isOpen: boolean;
  onToggle: () => void;
  onToolSelect: (command: string) => void;
}

const ChatSidebar: React.FC<SidebarProps> = ({ agent, isOpen, onToggle, onToolSelect }) => {
  const [activeTab, setActiveTab] = useState<'wallet' | 'tools'>('wallet');
  const { user, getAccessToken } = usePrivy();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [solanaBalance, setSolanaBalance] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const tools: Tool[] = [
    { 
      name: 'Get My Balance', 
      description: 'Check my wallet balance',
      command: 'What is my current wallet balance?'
    },
    { 
      name: "Get Agent's Balance", 
      description: "Check the agent's wallet balance",
      command: "What is your current wallet balance?"
    },   
    { 
      name: 'Get My Portfolio Value', 
      description: 'View your portfolio value',
      command: 'Show me my portfolio value'
    },
    { 
      name: "Get Agent's Portfolio Value", 
      description: "View the agent's portfolio value",
      command: "Show me your portfolio value"
    },
    { 
      name: 'Get My Token Holdings', 
      description: 'View your token holdings',
      command: 'Show me my token holdings'
    },
    { 
      name: "Get Agent's Token Holdings", 
      description: "View the agent's token holdings",
      command: "Show me your token holdings"
    },
    { 
      name: 'Get Solana Transaction Volume', 
      description: 'View the transaction volume on Solana',
      command: 'Show me the transaction volume on Solana'
    },
    { 
      name: 'Get Token Info', 
      description: 'View information about a token',
      command: 'Show me information about the token'
    },
    { 
      name: 'Get Market Movers', 
      description: 'View top gainers and losers',
      command: 'Show me the top market movers today'
    },
    { 
      name: 'Search Tokens', 
      description: 'Search for tokens',
      command: 'Search for tokens'
    },
    { 
      name: 'Get Top Token Holders', 
      description: 'View top token holders and activity',
      command: 'Show me the top token holders'
    },
    { 
      name: 'Get Total Crypto Market Cap', 
      description: 'View the total crypto market cap',
      command: 'Show me the total crypto market cap'
    },
    { 
      name: 'Get Market Categories', 
      description: 'View market categories',
      command: 'Show me the market categories'
    },
    { 
      name: 'Get Derivatives Exchanges', 
      description: 'View derivatives exchanges',
      command: 'Show me derivatives exchanges'
    },
    // { 
    //   name: 'Market Data Summary', 
    //   description: 'View a summary of the market.',
    //   command: 'Give a summary of the market.'
    // },
    { 
      name: 'Fear & Greed Index', 
      description: 'Check market sentiment',
      command: 'What is the current fear and greed index?'
    }
  ];

  const handleToolClick = (tool: Tool) => {
    onToolSelect(tool.command);
  };

  const copyToClipboard = async () => {
    if (agent.wallets?.solana) {
      try {
        await navigator.clipboard.writeText(agent.wallets.solana);
        setCopySuccess(true);
        // Reset copy success message after 2 seconds
        setTimeout(() => {
          setCopySuccess(false);
        }, 2000);
      } catch (err) {
        console.error('Failed to copy wallet address:', err);
      }
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

  useEffect(() => {
    if (activeTab === 'wallet' && agent.wallets?.solana) {
      getPortfolioValue(agent.wallets.solana)
        .then((portfolio) => {
          setPortfolio(portfolio);
        })
        .catch((error) => console.error('Error fetching portfolio:', error));
    }
  }, [activeTab, agent.wallets?.solana]);

  useEffect(() => {
    if (activeTab === 'wallet' && agent.wallets?.solana) {
      getSolanaBalance(agent.wallets.solana)
        .then((response) => {
          setSolanaBalance(response);
        })
        .catch((error) => console.error('Error fetching balance:', error));
    }
  }, [portfolio]);  

  return (
    <div className={`fixed right-0 top-0 h-full border-l border-zinc-700 transition-all duration-300 bg-zinc-900 z-10 ${
      isOpen ? 'w-80' : 'w-0'
    }`}>
      {/* Toggle Button */}
      <button 
        onClick={onToggle}
        className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 bg-zinc-800 rounded-l-lg border-l border-t border-b border-zinc-700 hover:bg-zinc-700 transition-colors"
      >
        {isOpen ? <div>&raquo;</div> : <div>&laquo;</div>}
      </button>

      {isOpen && (
        <div className="h-full flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-zinc-700 h-15">
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
                <ToolsIcon />
                <span>Tools</span>
              </div>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'wallet' ? (
              <div className="p-4 space-y-4">
                {/* Wallet Address */}
                <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                  <div className="text-sm text-zinc-400 mb-1">Wallet Address</div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm text-white truncate">
                      {agent.wallets?.solana || 
                                            <div className="text-sm text-zinc-500">
                                            Configure wallet to view address
                                          </div>
                      }
                    </div>
                    {agent.wallets?.solana && (
                      <button
                        onClick={copyToClipboard}
                        className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
                      >
                        {copySuccess ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Wallet Balance */}
                <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                  <div className="text-sm text-zinc-400 mb-1">Balance</div>
                  <div className="flex items-center gap-2">
                    <Image src="/images/chains/solana.svg" alt="SOL" width={14} height={14} />
                    <div className="text-xl font-semibold text-white">
                      {agent.wallets?.solana 
                        ? solanaBalance ? solanaBalance?.balance + ' SOL' : <div className="ml-5"><LoadingIndicator /></ div>
                        : 'No wallet configured'
                      }
                    </div>
                  </div>
                </div>

                {/* Token List */}
                <div className="space-y-2">
                  <div className="text-sm text-zinc-400 px-1">Tokens</div>
                  {agent.wallets?.solana ? (
                    <div className="bg-zinc-800 rounded-lg border border-zinc-700 divide-y divide-zinc-700">
                      <div className="p-3">
                        <div className="text-sm text-zinc-500">No tokens found</div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-700">
                      <div className="text-sm text-zinc-500">
                        Configure wallet to view tokens
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {tools.map((tool) => (
                  <div 
                    key={tool.name}
                    onClick={() => handleToolClick(tool)}
                    className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer group"
                  >
                    <div className="font-medium text-white group-hover:text-white/90">{tool.name}</div>
                    <div className="text-sm text-zinc-400 group-hover:text-zinc-300">{tool.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSidebar;