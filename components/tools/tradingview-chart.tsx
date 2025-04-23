import React, { useEffect, useRef, memo, useState } from 'react';
import type { ToolInvocation as AIToolInvocation } from '@ai-sdk/ui-utils';
import { ExternalLink } from "lucide-react";
import { createPortal } from 'react-dom';

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
  container_id?: string;
  height?: number;
  width?: string;
  studies?: string[];
}

// Global map to track active chart instances
const activeCharts = new Map<string, boolean>();

const TradingViewChart: React.FC<TradingViewChartProps> = memo(({ toolCallId, toolInvocation }) => {
  const container = useRef<HTMLDivElement>(null);
  const expandedContainer = useRef<HTMLDivElement>(null);
  const containerId = `tradingview_chart_${toolCallId}`;
  const expandedContainerId = `tradingview_chart_${toolCallId}_expanded`;
  const isActive = useRef(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const initializeChart = (container: HTMLDivElement | null, containerId: string) => {
    if (!container || !("result" in toolInvocation) || !toolInvocation.result) return;

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

    if (container && isActive.current) {
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
        support_host: "https://www.tradingview.com",
        container_id: containerId,
        studies
      });

      container.appendChild(script);
    }
  };

  useEffect(() => {
    initializeChart(container.current, containerId);
  }, [toolInvocation, containerId]);

  useEffect(() => {
    if (isExpanded && expandedContainer.current) {
      initializeChart(expandedContainer.current, expandedContainerId);
    }
  }, [isExpanded, expandedContainerId]);

  return (
    <>
      <div
        className="p-4 w-full relative"
        style={{ 
          height: "400px", 
          width: "100%",
          minHeight: "300px"
        }}>
        {/* Mobile expand button */}
        <button
          onClick={() => setIsExpanded(true)}
          className="md:hidden absolute top-2 right-2 z-10 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
        >
          <ExternalLink className="h-4 w-4 text-zinc-400" />
        </button>

        <div 
          className="tradingview-widget-container w-full" 
          ref={container} 
          id={containerId}
          style={{ 
            height: "400px", 
            width: "100%",
            minHeight: "300px"
          }}
        >
          <div 
            className="tradingview-widget-container__widget w-full" 
            style={{ 
              height: "calc(100% - 32px)", 
              width: "100%",
              minHeight: "268px"
            }}
          />
        </div>

        {/* Desktop expand button */}
        <button
          onClick={() => setIsExpanded(true)}
          className="hidden md:flex items-center gap-1 mt-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Expand chart</span>
        </button>
      </div>

      {mounted && isExpanded && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="fixed inset-0 bg-zinc-900">
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 right-4 z-[10000] p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="w-full p-4 h-[90vh] md:h-[100vh]" style={{ 
                width: "100vw",
                paddingTop: "3rem",
                paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)"
              }}>
              <div 
                className="tradingview-widget-container w-full h-[calc(90vh-8rem)] md:h-[calc(100vh-8rem)]" 
                ref={expandedContainer}
                id={expandedContainerId}
                style={{ width: "100%" }}
              >
                <div 
                  className="tradingview-widget-container__widget w-full h-[calc(90vh-8rem-32px)] md:h-[calc(100vh-8rem-32px)]" 
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
});

TradingViewChart.displayName = 'TradingViewChart';

export default TradingViewChart; 