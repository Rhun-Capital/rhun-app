import React, { useEffect, useRef, memo } from 'react';
import type { ToolInvocation as AIToolInvocation } from '@ai-sdk/ui-utils';

interface TradingViewChartProps {
  toolCallId: string;
  toolInvocation: AIToolInvocation;
}

interface TradingViewResult {
  symbol?: string;
  interval?: string;
  theme?: 'light' | 'dark';
  style?: string;
  locale?: string;
  timezone?: string;
  toolbar_bg?: string;
  enable_publishing?: boolean;
  allow_symbol_change?: boolean;
  // save_image?: boolean;
  container_id?: string;
  height?: number;
  width?: string;
  studies?: string[];
}

// Global map to track active chart instances
const activeCharts = new Map<string, boolean>();

const TradingViewChart: React.FC<TradingViewChartProps> = memo(({ toolCallId, toolInvocation }) => {
  const container = useRef<HTMLDivElement>(null);
  const containerId = `tradingview_chart_${toolCallId}`;
  const isActive = useRef(true);

  useEffect(() => {
    if (!("result" in toolInvocation) || !toolInvocation.result) return;

    const result = toolInvocation.result as TradingViewResult;
    const { 
      symbol = 'BINANCE:BTCUSDT',
      interval = 'D',
      theme = 'dark',
      style = '1',
      locale = 'en',
      timezone = 'Etc/UTC',
      toolbar_bg = '#f1f3f6',
      enable_publishing = false,
      allow_symbol_change = true,
      // save_image = false,
      height = 600,
      width = '100%',
      studies = []
    } = result;

    // Mark this instance as active
    activeCharts.set(containerId, true);
    isActive.current = true;

    // Cleanup any existing chart with this ID
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) {
      existingContainer.innerHTML = '';
    }

    // Remove any existing TradingView scripts
    const allTradingViewScripts = document.querySelectorAll('script[src*="tradingview.com"]');
    allTradingViewScripts.forEach(script => script.remove());

    if (container.current && isActive.current) {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.setAttribute('data-container-id', containerId);
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol,
        interval,
        timezone,
        theme,
        style,
        locale,
        toolbar_bg,
        enable_publishing,
        allow_symbol_change,
        // save_image,
        support_host: "https://www.tradingview.com",
        container_id: containerId,
        studies
      });

      container.current.appendChild(script);
    }

    // Cleanup function
    return () => {
      isActive.current = false;
      activeCharts.delete(containerId);
      
      // Only remove scripts if this is the last active chart
      if (activeCharts.size === 0) {
        const allTradingViewScripts = document.querySelectorAll('script[src*="tradingview.com"]');
        allTradingViewScripts.forEach(script => script.remove());
      }
    };
  }, [toolInvocation, containerId]);

  return (
    <div
    className="p-4"
    style={{ 
      height: "500px", 
      width: "100%",
      minHeight: "500px"
    }}>
      <div 
        className="tradingview-widget-container" 
        ref={container} 
        id={containerId}
        style={{ 
          height: "500px", 
          width: "100%",
          minHeight: "500px"
        }}
      >
        <div 
          className="tradingview-widget-container__widget" 
          style={{ 
            height: "calc(100% - 32px)", 
            width: "100%",
            minHeight: "468px"
          }}
        />
      </div>
    </div>
  );
});

TradingViewChart.displayName = 'TradingViewChart';

export default TradingViewChart; 