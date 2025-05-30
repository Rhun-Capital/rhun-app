import LoadingIndicator from '../loading-indicator';
import { PortfolioValueProps } from '../../types/props';

const PortfolioValue: React.FC<PortfolioValueProps> = ({ toolCallId, toolInvocation }) => {

  return (
    <div className="p-4 sm:p-6 bg-zinc-800 rounded-lg" key={toolCallId}>
      <div className="text-sm text-zinc-400 mb-2">
        {toolInvocation.args.message}
      </div>
      <h3 className="text-xs sm:text-sm text-zinc-400 mb-1 sm:mb-2">Portfolio Value</h3>
      <p className="text-xl sm:text-2xl font-bold text-white">
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