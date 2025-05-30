import Image from 'next/image';
import { BalanceProps } from '../../types/components';

const SolanaBalance: React.FC<BalanceProps> = ({ address, className = '' }) => {
    if (address !== 'getUserSolanaBalance') return null;
  
    return (
      <div key={address}>
        <div className="text-sm sm:text-base mb-2">
          {address}
        </div>
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3 bg-zinc-900 p-3 sm:p-4">
            <Image 
              src="https://d1olseq3j3ep4p.cloudfront.net/images/chains/solana.svg" 
              alt="Solana Logo" 
              width={12} 
              height={12}
              className="w-3 h-3 sm:w-4 sm:h-4" 
            />
            <span className="text-lg sm:text-xl font-semibold min-w-0 truncate">
              {"result" in address ? (address.result?.balance as number)?.toFixed(4) : '0'}
            </span>
            <span className="text-zinc-400 text-sm sm:text-base ml-auto">
              SOL
            </span>
          </div>
        </div>
      </div>
    );
  };
  
  export default SolanaBalance;