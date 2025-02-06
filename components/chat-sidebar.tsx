// components/chat-sidebar.tsx
import React, { useState, useEffect } from 'react';
import { WalletIcon, ToolsIcon } from '@/components/icons';
import { SendIcon, QrCode, Repeat2 } from 'lucide-react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import LoadingIndicator from './loading-indicator';
import CopyButton from './copy-button';
import dynamic from 'next/dynamic';

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


const TransferModal = dynamic(() => import('./send-button'), {
  ssr: false,
});

const ReceiveModal = dynamic(() => import('./receive-button'), {
  ssr: false,
});

const SwapModal = dynamic(() => import('./swap-button'), {
  ssr: false,
});

interface TransferButtonProps {
  tokens: any[];
  publicKey: string;
  agent: any;
  solanaBalance?: {
    amount: number;
    usdValue: number;
    logoURI: string;
  };
}

const SwapButton = ({ tokens, solanaBalance, agent }: TransferButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-[80px] bg-zinc-800 rounded-lg flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 transition-colors p-2"
      >
        <div className=" flex flex-col items-center gap-1 p-2">
        <Repeat2 className="w-[20px] h-[20px]"/>
        <div className="text-sm text-zinc-400">
          Swap
        </div>
        </div>
      </button>
      <SwapModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        tokens={tokens}
        solanaBalance={solanaBalance}
        agent={agent}
      />
    </>
  );
}

const ReceiveButton = ({ agent, tokens, solanaBalance }: TransferButtonProps & { agent: any }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-[80px] bg-zinc-800 rounded-lg flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 transition-colors p-2"
      >
        <div className=" flex flex-col items-center gap-1 p-2">
        <QrCode className="w-[20px] h-[20px]"/>
        <div className="text-sm text-zinc-400">
          Receive
        </div>
        </div>
      </button>
      <ReceiveModal 
        agent={agent}
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

const TransferButton = ({ tokens, solanaBalance, agent }: TransferButtonProps & { agent: any }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-[80px] bg-zinc-800 rounded-lg flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 transition-colors p-2"
      >
        <div className=" flex flex-col items-center gap-1 p-2">
        <SendIcon className="w-[20px] h-[20px]"/>
        <div className="text-sm text-zinc-400">
          Send
        </div>
        </div>
      </button>
      <TransferModal 
        agent={agent}
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        tokens={tokens}
        solanaBalance={solanaBalance}
      />
    </>
  );
};


const ChatSidebar: React.FC<SidebarProps> = ({ agent, isOpen, onToggle, onToolSelect }) => {
  const [activeTab, setActiveTab] = useState<'wallet' | 'tools'>('wallet');
  const { user, getAccessToken } = usePrivy();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [totalValue, setTotalValue] = useState<number | null>(null);
  
  interface Token {
    token_address: string;
    token_icon: string;
    token_name: string;
    usd_value: number;
    formatted_amount: number;
    token_symbol: string;
  }
  
  const [tokens, setTokens] = useState<{ data: Token[]; metadata: { tokens: Object } }>({ data: [], metadata: { tokens: Object } });

  const tools: Tool[] = [
    // { 
    //   name: 'Get My Balance', 
    //   description: 'Check my wallet balance',
    //   command: 'What is my current wallet balance?'
    // },
    // { 
    //   name: "Get Agent's Balance", 
    //   description: "Check the agent's wallet balance",
    //   command: "What is your current wallet balance?"
    // },   
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
      name: 'Get Wallet Info', 
      description: 'View information about a wallet',
      command: 'Show me information about a solana account'
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

  useEffect(() => {
    if (activeTab === 'wallet' && agent.wallets?.solana) {
      getTokens(agent.wallets.solana)
        .then((response) => {
          setTokens(response);
        })
        .catch((error) => console.error('Error fetching tokens:', error));
    }
  }, [activeTab, agent.wallets?.solana]);

  useEffect(() => {
    if (activeTab === 'wallet' && agent.wallets?.solana) {
      getPortfolioValue(agent.wallets.solana)
        .then((portfolio) => {
          // sum the total value of all tokens usdValue
          const tv = portfolio.holdings.reduce((acc: number, token: { usdValue: number }) => acc + token.usdValue, 0);
          setTotalValue(tv)
          console.log("here", portfolio)
          setPortfolio(portfolio);
        })
        .catch((error) => console.error('Error fetching portfolio:', error));
    }
  }, [activeTab, agent.wallets?.solana]);


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
                <ToolsIcon />
                <span>Tools</span>
              </div>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'wallet' ? (
              <div className="p-4 space-y-2">

                {/* Wallet Address */}
                <div className="bg-zinc-800 bg-opacity-40 p-4 rounded-lg border border-zinc-700">
                  <div className="text-sm text-zinc-400">Wallet Address</div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-sm text-white truncate">
                      {agent.wallets?.solana || 
                                            <div className="text-sm text-zinc-500">
                                            Configure wallet to view address
                                          </div>
                      }
                    </div>
                    {agent.wallets?.solana && (
                      <CopyButton text={agent.wallets.solana} />
                    )}
                  </div>
                {/* Portfolio Value */}
                {(agent.wallets?.solana && totalValue) ? <div className="pt-2 border-t border-zinc-700">
                    <div className="text-sm text-zinc-400">Total Value</div>
                    <div className="text-xl font-semibold text-white">
                      {totalValue ? '$' + totalValue.toFixed(2) : <div className="ml-5"><LoadingIndicator /></div>}
                    </div>
                </div> : null}
                
                

                {/* {agent.wallets ?  (
                  <div className="flex gap-2 mt-2">
                  <ReceiveButton 
                      tokens={tokens.data}
                      publicKey={agent.wallets?.solana}
                      agent={agent}
                      solanaBalance={portfolio?.holdings[0] ? {
                        amount: portfolio.holdings[0].amount,
                        usdValue: portfolio.holdings[0].usdValue,
                        logoURI: portfolio.holdings[0].logoURI
                      } : undefined}
                    />

                  <TransferButton 
                      tokens={tokens.data}
                      publicKey={agent.wallets?.solana}
                      agent={agent}
                      solanaBalance={portfolio?.holdings[0] ? {
                        amount: portfolio.holdings[0].amount,
                        usdValue: portfolio.holdings[0].usdValue,
                        logoURI: portfolio.holdings[0].logoURI
                      } : undefined}
                    />

                  <SwapButton 
                      tokens={tokens.data}
                      publicKey={agent.wallets?.solana}
                      solanaBalance={portfolio?.holdings[0] ? {
                        amount: portfolio.holdings[0].amount,
                        usdValue: portfolio.holdings[0].usdValue,
                        logoURI: portfolio.holdings[0].logoURI
                      } : undefined}
                      agent={agent}
                    /> 
                    </div>
                    ) : null} */}


            

                </div>

                {/* Token List */}
                <div className="space-y-2">

                {agent.wallets?.solana && portfolio && <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 mb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Image src={portfolio.holdings[0].logoURI} alt='SOL' width={40} height={40} className="rounded-full object-contain"/>
                            <div className="flex flex-col justify-start gap-1">
                              <div className="text-white">Solana</div>
                              <div className="flex items-center gap-1 text-sm text-zinc-400">
                                <div className="text-sm">{portfolio.holdings[0].amount }</div>
                                <div className="text-sm">SOL</div>
                              </div> 
                            </div>
                          </div>
                          
                          <div className="text-sm text-zinc-400">${portfolio.holdings[0].usdValue.toFixed(2)}</div>
                        </div>
                      </div>}

                  {agent.wallets?.solana ? (
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