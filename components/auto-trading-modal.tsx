import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { X, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useModal } from '@/contexts/modal-context';

// Modal portal component to ensure modal is rendered at the document root
const ModalPortal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted ? createPortal(children, document.body) : null;
};

interface AutoTradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  onSetupComplete: () => void;
}

type Strategy = 'dca' | 'momentum' | 'limit' | 'rebalance';

interface StrategyConfig {
  name: string;
  description: string;
  icon: string;
  frequency: 'hourly' | 'daily' | 'weekly';
  frequency_options: string[];
  amount: number;
  target_token: string;
}

const STRATEGY_CONFIGS: Record<Strategy, StrategyConfig> = {
  dca: {
    name: 'Dollar Cost Averaging',
    description: 'Automatically invest a fixed amount at regular intervals',
    icon: '💰',
    frequency: 'daily',
    frequency_options: ['daily', 'weekly'],
    amount: 0.1,
    target_token: 'BONK'
  },
  momentum: {
    name: 'Momentum Trading',
    description: 'Buy when token shows upward momentum and sell on downtrends',
    icon: '📈',
    frequency: 'hourly',
    frequency_options: ['hourly', 'daily'],
    amount: 0.1,
    target_token: 'BONK'
  },
  limit: {
    name: 'Limit Orders',
    description: 'Set price targets to automatically buy or sell tokens',
    icon: '🎯',
    frequency: 'hourly',
    frequency_options: ['hourly'],
    amount: 0.1,
    target_token: 'BONK'
  },
  rebalance: {
    name: 'Portfolio Rebalancing',
    description: 'Maintain target allocations by buying/selling as needed',
    icon: '⚖️',
    frequency: 'weekly',
    frequency_options: ['daily', 'weekly'],
    amount: 0.2,
    target_token: 'BONK'
  }
};

const POPULAR_TOKENS = [
  { symbol: 'BONK', name: 'Bonk', image: 'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg' },
  { symbol: 'JTO', name: 'Jito', image: 'https://assets.coingecko.com/coins/images/33210/small/jito-token-logo-icon.png' },
  { symbol: 'JUP', name: 'Jupiter', image: 'https://assets.coingecko.com/coins/images/34655/small/jup-symbol-color.png' },
  { symbol: 'PYTH', name: 'Pyth Network', image: 'https://assets.coingecko.com/coins/images/28468/small/pyth_token_logo.png' }
];

export default function AutoTradingModal({ isOpen, onClose, walletAddress, onSetupComplete }: AutoTradingModalProps) {
  const { getAccessToken } = usePrivy();
  const { closeModal } = useModal();
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>('dca');
  const [config, setConfig] = useState<StrategyConfig>(STRATEGY_CONFIGS.dca);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const updateConfig = (key: keyof StrategyConfig, value: any) => {
    setConfig({
      ...config,
      [key]: value
    });
  };

  const handleStrategyChange = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setConfig(STRATEGY_CONFIGS[strategy]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await getAccessToken();
      
      const response = await fetch('/api/trading/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          walletAddress,
          strategy: selectedStrategy,
          config: {
            frequency: config.frequency,
            amount: config.amount,
            targetToken: config.target_token
          }
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set up auto-trading');
      }
      
      setSuccess(true);
      setTimeout(() => {
        onSetupComplete();
        onClose();
        closeModal();
      }, 2000);
    } catch (err) {
      console.error('Error setting up auto-trading:', err);
      setError(err instanceof Error ? err.message : 'Failed to set up auto-trading');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Set Up Automated Trading</h2>
            <button 
              onClick={() => {
                onClose();
                closeModal();
              }} 
              className="text-zinc-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {success ? (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-4">
              <p className="text-green-400 font-medium">Auto-trading strategy has been scheduled!</p>
              <p className="text-zinc-400 text-sm mt-1">Your strategy will run according to your schedule.</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Failed to set up auto-trading</p>
                <p className="text-zinc-400 text-sm mt-1">{error}</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-2">Select Strategy</h3>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(STRATEGY_CONFIGS) as Strategy[]).map((strategy) => (
                  <button
                    key={strategy}
                    onClick={() => handleStrategyChange(strategy)}
                    className={`p-4 rounded-lg border text-left h-full ${
                      selectedStrategy === strategy
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div className="text-xl mb-2">{STRATEGY_CONFIGS[strategy].icon}</div>
                    <div className="font-medium text-white">{STRATEGY_CONFIGS[strategy].name}</div>
                    <div className="text-xs text-zinc-400 mt-1 line-clamp-2">
                      {STRATEGY_CONFIGS[strategy].description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-400 block mb-2">
                  Frequency
                </label>
                <div className="flex gap-3">
                  {config.frequency_options.map((freq) => (
                    <button
                      key={freq}
                      onClick={() => updateConfig('frequency', freq)}
                      className={`px-4 py-2 rounded-lg border ${
                        config.frequency === freq
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-400 block mb-2">
                  Amount per Trade (SOL)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={config.amount}
                  onChange={(e) => updateConfig('amount', parseFloat(e.target.value) || 0.1)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
                />
                <div className="flex gap-2 mt-2">
                  {[0.05, 0.1, 0.25, 0.5].map((value) => (
                    <button
                      key={value}
                      onClick={() => updateConfig('amount', value)}
                      className={`flex-1 px-3 py-1 rounded text-sm ${
                        config.amount === value
                          ? 'bg-indigo-500 text-white'
                          : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                      }`}
                    >
                      {value} SOL
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-400 block mb-2">
                  Target Token
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {POPULAR_TOKENS.map((token) => (
                    <button
                      key={token.symbol}
                      onClick={() => updateConfig('target_token', token.symbol)}
                      className={`flex items-center gap-2 p-3 rounded-lg border ${
                        config.target_token === token.symbol
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <Image 
                        src={token.image} 
                        alt={token.name} 
                        width={24} 
                        height={24} 
                        className="rounded-full" 
                      />
                      <div>
                        <div className="font-medium text-white">{token.symbol}</div>
                        <div className="text-xs text-zinc-400">{token.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-700 pt-4 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-zinc-700 text-white rounded-md hover:bg-zinc-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting up...' : 'Schedule Trading'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
} 