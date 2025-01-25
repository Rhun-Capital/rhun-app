// import React from 'react';

// interface TokenAnalysisProps {
//   data: {
//     mintAddress: string;
//     symbol: string;
//     name: string;
//     holders: number;
//     overlappingHolders: {
//       token: string;
//       count: number;
//       percentage: number;
//     }[];
//     price: number;
//     marketCap: number;
//     createdAt: Date;
//   }[];
// }

// const AnalyzeSolanaTokenHolders: React.FC<TokenAnalysisProps> = ({ toolCallId, toolInvocation }) => {
//   return (
//     <div className="space-y-4">
//       {data.map((token: typeof data[0]) => (
//         <div key={token.mintAddress} className="p-6 bg-zinc-800 rounded-lg border border-zinc-700">
//           <div className="flex justify-between items-start mb-4">
//             <div>
//               <h3 className="text-xl font-bold text-white">{token.name}</h3>
//               <p className="text-zinc-400">{token.symbol}</p>
//               <a 
//                 href={`https://solscan.io/token/${token.mintAddress}`}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="text-xs text-indigo-400 hover:text-indigo-300"
//               >
//                 View on Solscan
//               </a>
//             </div>
//             <div className="text-right">
//               <p className="text-white font-medium">
//                 ${token.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
//               </p>
//               <p className="text-sm text-zinc-400">
//                 MC: ${(token.marketCap / 1000000).toFixed(2)}M
//               </p>
//             </div>
//           </div>

//           <div className="grid grid-cols-2 gap-4 mb-4">
//             <div className="bg-zinc-700 rounded-lg p-3">
//               <p className="text-sm text-zinc-400">Holders</p>
//               <p className="text-lg font-bold text-white">
//                 {token.holders.toLocaleString()}
//               </p>
//             </div>
//             <div className="bg-zinc-700 rounded-lg p-3">
//               <p className="text-sm text-zinc-400">Created</p>
//               <p className="text-lg font-bold text-white">
//                 {new Date(token.createdAt).toLocaleDateString()}
//               </p>
//             </div>
//           </div>

//           <div className="space-y-2">
//             <h4 className="text-sm font-medium text-zinc-400 mb-2">
//               Holder Overlap Analysis
//             </h4>
//             {token.overlappingHolders.map((overlap: { token: string; count: number; percentage: number }) => (
//               <div 
//                 key={overlap.token} 
//                 className="flex justify-between items-center bg-zinc-700 rounded-lg p-2"
//               >
//                 <div className="flex items-center gap-2">
//                   <span className="text-sm text-zinc-300 font-mono">
//                     {overlap.token.slice(0, 4)}...{overlap.token.slice(-4)}
//                   </span>
//                   <a 
//                     href={`https://solscan.io/token/${overlap.token}`}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="text-xs text-indigo-400 hover:text-indigo-300"
//                   >
//                     View
//                   </a>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <span className="text-sm text-zinc-300">
//                     {overlap.count.toLocaleString()} holders
//                   </span>
//                   <span className="text-sm text-zinc-400">
//                     ({overlap.percentage.toFixed(1)}%)
//                   </span>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// };

// export default AnalyzeSolanaTokenHolders;