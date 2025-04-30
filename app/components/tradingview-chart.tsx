import { useEffect, useRef } from 'react';

interface TradingViewChartProps {
  toolCallId: string;
  toolInvocation: any;
}

export default function TradingViewChart({ toolCallId, toolInvocation }: TradingViewChartProps) {
  const refreshKeyRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      // First clean up any existing TradingView scripts
      const existingScripts = document.querySelectorAll(`script[data-trading-view-artifact="${toolCallId}"]`);
      existingScripts.forEach(script => script.remove());
      
      // Then increment the refresh key
      refreshKeyRef.current += 1;
    }, 200);
    
    return () => clearTimeout(timer);
  }, [toolCallId]);

  return (
    <div key={`${toolCallId}-${refreshKeyRef.current}`}>
      {/* Your existing TradingView chart rendering code */}
    </div>
  );
} 