import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { X, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useModal } from '@/contexts/modal-context';
import { AutoTradingModalProps } from '@/types/wallet';
import { Strategy, StrategyConfig } from '@/types/trading';

// Modal portal component to ensure modal is rendered at the document root
const ModalPortal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted ? createPortal(children, document.body) : null;
};

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

export default function AutoTradingModal({ isOpen, onClose, walletAddress, onSetupComplete, className }: AutoTradingModalProps) {
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
        <div className={`bg-zinc-900 rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-xl ${className || ''}`}>
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

            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-2">Frequency</h3>
              <div className="grid grid-cols-3 gap-3">
                {config.frequency_options.map((freq) => (
                  <button
                    key={freq}
                    onClick={() => updateConfig('frequency', freq)}
                    className={`p-2 rounded-lg border text-center ${
                      config.frequency === freq
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div className="font-medium text-white capitalize">{freq}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-2">Amount (SOL)</h3>
              <input
                type="number"
                value={config.amount}
                onChange={(e) => updateConfig('amount', parseFloat(e.target.value))}
                min={0.1}
                step={0.1}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white"
              />
            </div>

            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-2">Target Token</h3>
              <div className="grid grid-cols-2 gap-3">
                {POPULAR_TOKENS.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => updateConfig('target_token', token.symbol)}
                    className={`p-3 rounded-lg border flex items-center gap-3 ${
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

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting up...' : 'Start Auto-Trading'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
} 