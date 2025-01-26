import LoadingIndicator from '../loading-indicator';

interface PortfolioValueProps {
    toolCallId: string;
    toolInvocation: {
      toolName: string;
      args: { message: string };
      result?: { totalValue: number };
    };
  }
  
  const PortfolioValue: React.FC<PortfolioValueProps> = ({ toolCallId, toolInvocation }) => {
    if (!['getUserPortfolioValue', 'getAgentPortfolioValue'].includes(toolInvocation.toolName)) return null;
  
    return (
      <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg" key={toolCallId}>
        <div className="text-sm text-zinc-400 mb-2">
          {toolInvocation.args.message}
        </div>
        <h3 className="text-xs sm:text-sm text-zinc-400 mb-1 sm:mb-2">Portfolio Value</h3>
        <p className="text-xl sm:text-2xl font-bold">
          {toolInvocation.result ? 
            `$${toolInvocation.result?.totalValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}` : 
            <LoadingIndicator/>
          }
        </p>
      </div>
    );
  };
  
  export default PortfolioValue;