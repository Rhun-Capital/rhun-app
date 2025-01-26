interface Token {
    mint: string;
    logoURI: string;
    symbol: string;
    name: string;
    amount: number;
    usdValue: number;
    priceChange24h: number;
  }
  
  interface TokenHoldingsProps {
    toolCallId: string;
    toolInvocation: {
      toolName: string;
      args: { message: string };
      result?: Token[];
    };
  }
  
  const TokenHoldings: React.FC<TokenHoldingsProps> = ({ toolCallId, toolInvocation }) => {
    if (!['getUserTokenHoldings', 'getAgentTokenHoldings'].includes(toolInvocation.toolName)) return null;
  
    const TokenCard = ({ token }: { token: Token }) => (
      <div className="flex justify-between items-center p-3 sm:p-4 bg-zinc-800 rounded-lg mb-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {token.logoURI ? (
            <img 
              src={token.logoURI} 
              alt={token.symbol}
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
            <p className="font-medium text-sm sm:text-base truncate">{token.name}</p>
            <p className="text-xs sm:text-sm text-zinc-400 truncate">
              {token.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {token.symbol}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-medium text-sm sm:text-base">
            ${token.usdValue.toLocaleString(undefined, { 
              minimumFractionDigits: 2,
              maximumFractionDigits: 2 
            })}
          </p>
          <p className={`text-xs sm:text-sm ${
            token.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
          </p>
        </div>
      </div>
    );
  
    return (
      <div key={toolCallId} className="space-y-2">
        <div className="text-sm sm:text-base mb-3">
          {toolInvocation.args.message}
        </div>
        <div className="space-y-2">
          {"result" in toolInvocation && toolInvocation.result?.map(token => (
            <TokenCard key={token.mint} token={token} />
          ))}
        </div>
      </div>
    );
  };
  
  export default TokenHoldings;