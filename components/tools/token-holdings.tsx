import { Token } from '@/types/token';
import { TokenHoldingsProps } from '../../types/components';

const TokenHoldings: React.FC<TokenHoldingsProps> = ({ toolCallId, toolInvocation }) => {
  if (!toolInvocation || !['getUserTokenHoldings', 'getAgentTokenHoldings'].includes(toolInvocation.toolName)) {
    return null;
  }

  const formatTokenAmount = (amount: number, decimals: number) => {
    return amount / (10 ** decimals);
  }

  const TokenCard = ({ token }: { token: Token }) => (
    <div className="flex justify-between items-center p-3 sm:p-4 bg-zinc-800 rounded-lg mb-2">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {token.token_icon ? (
          <img 
            src={token.token_icon} 
            alt={token.token_symbol}
            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const nextSibling = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (nextSibling) {
                nextSibling.style.display = 'flex';
              }
            }}
          />
        ) : (
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
            <span className="text-xs text-zinc-300">?</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm sm:text-base truncate text-white">{token.token_name}</p>
          <p className="text-xs sm:text-sm text-zinc-400 truncate">
            {formatTokenAmount(token.amount, token.token_decimals)} {token.token_symbol}
          </p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-medium text-sm sm:text-base text-white">
          {token.usd_value && token.usd_value > 0.009 ? '$'+token.usd_value.toLocaleString(undefined, { 
            minimumFractionDigits: 2,
            maximumFractionDigits: 2 
          }) : '-'}
        </p>
      </div>
    </div>
  );

  return (
    <div key={toolCallId} className="space-y-2">
      <div className="text-sm sm:text-base mb-3 text-white">
        {toolInvocation.toolName}
      </div>
      <div className="space-y-2">
        {toolInvocation.result?.data?.map((token: Token) => (
          <TokenCard key={token.token_address} token={token} />
        ))}
      </div>
    </div>
  );
};

TokenHoldings.displayName = 'TokenHoldings';

export default TokenHoldings;