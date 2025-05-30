import React from 'react';
import { FearGreedProps } from '@/types/market';

const FearGreed: React.FC<FearGreedProps> = ({ toolCallId, toolInvocation }) => {
  if (!toolInvocation.result) {
    return <div className="text-zinc-400">Loading fear and greed index...</div>;
  }

  const { value, classification } = toolInvocation.result;

  if (typeof value !== 'number' || !classification) {
    return <div className="text-zinc-400">Invalid fear and greed data received</div>;
  }

  const getColor = (value: number) => {
    if (value >= 75) return 'text-green-500';
    if (value >= 50) return 'text-green-400';
    if (value >= 25) return 'text-orange-500';
    return 'text-red-500';
  };

  const getBackgroundColor = (value: number) => {
    if (value >= 75) return 'bg-green-500/20';
    if (value >= 50) return 'bg-green-400/20';
    if (value >= 25) return 'bg-orange-500/20';
    return 'bg-red-500/20';
  };

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Fear & Greed Index</h3>
      <div className="flex flex-col items-center">
        <div className={`text-4xl font-bold mb-2 ${getColor(value)}`}>
          {value}
        </div>
        <div className={`text-sm font-medium px-3 py-1 rounded-full ${getBackgroundColor(value)} ${getColor(value)}`}>
          {classification}
        </div>
        <div className="mt-4 text-sm text-zinc-400 text-center">
          The Fear & Greed Index measures market sentiment. Values above 50 indicate greed, while values below 50 indicate fear.
        </div>
      </div>
    </div>
  );
};

export default FearGreed; 