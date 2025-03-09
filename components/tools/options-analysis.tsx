// components/tools/OptionsAnalysis.tsx
import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface OptionsAnalysisProps {
 toolCallId: string;
 toolInvocation: any;
}

export default function OptionsAnalysis({ toolCallId, toolInvocation }: OptionsAnalysisProps) {
 // Directly use toolInvocation.result as the initial state
 const [data, setData] = useState(toolInvocation.result);
 const [isPolling, setIsPolling] = useState(false);
 const { getAccessToken } = usePrivy();

  // Add a useEffect to update state after initial render if needed
  useEffect(() => {
    // If data is missing a requestId but toolInvocation has it, update the state
    setData(toolInvocation.result);

  }, [toolInvocation]); 

 useEffect(() => {

  if (!data) {
    return;
  }

   // If result is still processing and has a requestId, start polling
   if (data?.status === 'processing' && data?.requestId) {
     setIsPolling(true);
     
     let attempts = 0;
     const maxAttempts = 30; // Poll for up to 30 seconds
     
     const pollInterval = setInterval(async () => {
       attempts++;
       
       try {
         const accessToken = await getAccessToken();
         
         // Call the API endpoint to check status
         const response = await fetch(`/api/financial-data/status?requestId=${data.requestId}`, {
           headers: {
             Authorization: `Bearer ${accessToken}`
           }
         });
         const statusData = await response.json();
         
         if (statusData.status === 'completed') {
          try {
            // First clean up any NaN, Infinity, or -Infinity values which aren't valid JSON
            let cleanedResults = statusData.results;
            if (typeof cleanedResults === 'string') {
              // Replace NaN, Infinity and -Infinity with null
              cleanedResults = cleanedResults
                .replace(/: NaN/g, ': null')
                .replace(/: Infinity/g, ': null')
                .replace(/: -Infinity/g, ': null');
            }
            
            // Parse the results JSON if it's a string
            const parsedResults = typeof cleanedResults === 'string' 
              ? JSON.parse(cleanedResults)
              : cleanedResults;
            
            // Access the options data
            const optionsData = parsedResults[data.ticker]?.options_data;
            
            if (optionsData) {
              setData(optionsData);
            } else {
              console.error('Options data not found for ticker:', data.ticker);
            }
          } catch (error) {
            console.error('Error parsing results:', error);
          }
          
          clearInterval(pollInterval);
          setIsPolling(false);
        }
         
         if (attempts >= maxAttempts) {
           clearInterval(pollInterval);
           setIsPolling(false);
         }
       } catch (error) {
         console.error('Error polling for status:', error);
         clearInterval(pollInterval);
         setIsPolling(false);
       }
     }, 10000); // Check every 10 seconds
     
     return () => clearInterval(pollInterval);
   }
 }, [data, getAccessToken]);

 if (!data) {
   return (
     <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2">
       <div className="text-zinc-400">Loading options analysis data...</div>
     </div>
   );
 }
 
 if (data.error) {
   return (
     <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2 text-white">
       <div className="text-red-400">{data.error}</div>
     </div>
   );
 }
 
 if (data.status === 'processing') {
   return (
     <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2 text-white">
       <div className="flex items-center space-x-2">
         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
         <div className="text-indigo-400">
           {isPolling ? "Analyzing options..." : data.message || "Analyzing options..."}
         </div>
       </div>
       <div className="text-zinc-400 text-sm mt-2">Stock symbol: {data.ticker}</div>
     </div>
   );
 }

 // Get closest expirations (first 3)
 const expirations = data.expirations?.slice(0, 3) || [];

 return (
   <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 my-2 text-white">
     <div className="flex justify-between items-center mb-4">
       <h3 className="text-xl font-bold">{data.ticker || toolInvocation.args?.ticker} Options</h3>
       <span className="text-lg">Current Price: ${typeof data.current_price === 'number' ? data.current_price.toFixed(2) : 'N/A'}</span>
     </div>
     
    <div className="mb-4">
      <h4 className="font-semibold mb-2">Upcoming Expirations</h4>
      <div className="flex flex-wrap gap-2">
        {expirations.map((exp: string) => (
          <span key={exp} className="px-3 py-1 bg-zinc-700 rounded-full text-sm">
            {exp}
          </span>
        ))}
        {data.expirations?.length > 3 && (
          <span className="px-3 py-1 bg-zinc-700 rounded-full text-sm">
            +{data.expirations.length - 3} more
          </span>
        )}
      </div>
    </div>
     
     {data.chains && Object.keys(data.chains).length > 0 && (
       <div className="border-t border-zinc-700 pt-3">
         <h4 className="font-semibold mb-2">Options Metrics</h4>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           {Object.entries(data.chains).map(([expiration, chainData]: [string, any]) => (
             <div key={expiration} className="border border-zinc-700 rounded-lg p-3">
               <h5 className="font-medium mb-2">{expiration}</h5>
               <div className="space-y-2 text-sm">
                 <div><span className="text-zinc-400">ATM Call IV:</span> {typeof chainData.atm_call_iv === 'number' ? chainData.atm_call_iv.toFixed(2) : 'N/A'}%</div>
                 <div><span className="text-zinc-400">ATM Put IV:</span> {typeof chainData.atm_put_iv === 'number' ? chainData.atm_put_iv.toFixed(2) : 'N/A'}%</div>
                 <div><span className="text-zinc-400">Call/Put Volume Ratio:</span> {typeof chainData.call_put_ratio === 'number' ? chainData.call_put_ratio.toFixed(2) : 'N/A'}</div>
                 <div><span className="text-zinc-400">Days to Expiration:</span> {chainData.days_to_expiration || 'N/A'}</div>
               </div>
             </div>
           ))}
         </div>
       </div>
     )}
     
     {data.options_sentiment && (
       <div className="border-t border-zinc-700 pt-3 mt-3">
         <h4 className="font-semibold mb-2">Options Sentiment</h4>
         <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
           data.options_sentiment?.sentiment === 'Bullish' ? 'bg-green-800 text-green-100' :
           data.options_sentiment?.sentiment === 'Bearish' ? 'bg-red-800 text-red-100' :
           'bg-zinc-700 text-zinc-300'
         }`}>
           {data.options_sentiment?.sentiment || 'Neutral'}
         </div>
         <div className="text-sm text-zinc-400 mt-1">
           Call/Put Ratio: {typeof data.options_sentiment?.call_put_ratio === 'number' 
             ? data.options_sentiment.call_put_ratio.toFixed(2) 
             : 'N/A'}
         </div>
       </div>
     )}
     
     {/* Last update timestamp */}
     <div className="text-xs text-zinc-500 mt-4 text-right">
       Last updated: {new Date().toLocaleString()}
     </div>
   </div>
 );
}