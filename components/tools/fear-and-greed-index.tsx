import { FearGreedProps } from '@/types/market';

const FearAndGreedIndex: React.FC<FearGreedProps> = ({
  toolCallId,
  toolInvocation,
}) => {
  if (toolInvocation.toolName !== 'getFearAndGreedIndex') return null;
  if (!toolInvocation.result) {
    return <div className="text-zinc-400">Loading fear and greed index...</div>;
  }

  const { value, classification } = toolInvocation.result;

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
    <div key={toolCallId} className="p-4 sm:p-6 bg-zinc-800 rounded-lg space-y-2 sm:space-y-4">
      <div className="text-sm sm:text-base">
        {toolInvocation.args.message}
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-white">Fear & Greed Index</h3>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`text-2xl sm:text-3xl font-bold ${getColor(value)}`}>{value}</div>
          <div className={`text-sm sm:text-base px-3 py-1 rounded-full ${getBackgroundColor(value)} ${getColor(value)}`}>
            {classification || 'Loading...'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FearAndGreedIndex;