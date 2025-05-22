import LoadingIndicator from '../loading-indicator';

interface FearGreedProps {
    toolCallId: string;
    toolInvocation: {
      toolName: string;
      args: { message: string };
      result?: {
        value: number;
        classification: string;
      };
    };
  }
  
  const FearGreedIndex: React.FC<FearGreedProps> = ({ toolCallId, toolInvocation }) => {
    if (toolInvocation.toolName !== 'getFearAndGreedIndex') return null;
  
    return (
      <div key={toolCallId}>
        <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg space-y-2 sm:space-y-4">
          <div className="text-sm sm:text-base">
            {toolInvocation.args.message}
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white">Fear & Greed Index</h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className={`text-2xl sm:text-3xl font-bold ${
              "result" in toolInvocation 
                ? (toolInvocation.result?.value || 0) > 50 
                  ? 'text-green-500' 
                  : 'text-red-500'
                : ''
            }`}>
              {"result" in toolInvocation 
                ? toolInvocation.result?.value || 0
                : <LoadingIndicator/>
              }
            </div>
            <div className="text-sm sm:text-base text-zinc-400">
              {"result" in toolInvocation && toolInvocation.result ? toolInvocation.result.classification : ''}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  export default FearGreedIndex;