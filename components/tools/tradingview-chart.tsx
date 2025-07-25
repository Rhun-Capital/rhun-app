import React, { useEffect, useRef, memo, useState } from 'react';
import { ExternalLink } from "lucide-react";
import { createPortal } from 'react-dom';
import { TradingViewResult } from '@/types/chart';
import { TradingViewChartProps } from '@/types/market';
import { TradingViewWindow } from '../../types/window';

declare global {
  interface Window extends TradingViewWindow {}
}

// Global map to track active chart instances
const activeCharts = new Map<string, boolean>();

const TradingViewChart: React.FC<TradingViewChartProps> = memo(({ toolCallId, toolInvocation, interval = '1D', theme = 'dark', className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const expandedContainer = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const containerId = `tradingview_chart_${toolCallId}`;
  const expandedContainerId = `tradingview_chart_${toolCallId}_expanded`;
  const isActive = useRef(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const inArtifactsPanel = containerId.includes('artifact') || 
    (typeof window !== 'undefined' && window.location.pathname.includes('artifacts'));

  // Cleanup function to remove scripts and reset state
  const cleanup = () => {
    if (scriptRef.current) {
      scriptRef.current.remove();
      scriptRef.current = null;
    }
    
    // Clean up any existing TradingView scripts for this container
    if (typeof document !== 'undefined') {
      const existingScripts = document.querySelectorAll(`script[data-container-id="${containerId}"]`);
      existingScripts.forEach(script => script.remove());
      
      const expandedScripts = document.querySelectorAll(`script[data-container-id="${expandedContainerId}"]`);
      expandedScripts.forEach(script => script.remove());
    }
    
    // Clear active chart tracking
    activeCharts.delete(containerId);
    activeCharts.delete(expandedContainerId);
    isActive.current = false;
  };

  // Mount/unmount effect
  useEffect(() => {
    setMounted(true);
    
    // Global error handler for TradingView widget
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('tradingview') || 
          (event.filename && event.filename.includes('tradingview'))) {
        console.error('TradingView widget error:', event);
        setError('Failed to load chart. Please try again.');
      }
    };
    
    window.addEventListener('error', handleError);
    
    return () => {
      setMounted(false);
      window.removeEventListener('error', handleError);
      cleanup();
    };
  }, [containerId, expandedContainerId]);

  const initializeChart = (containerElement: HTMLDivElement | null, containerIdStr: string) => {
    if (!containerElement || !("result" in toolInvocation) || !toolInvocation.result) {
      console.warn(`Cannot initialize chart - container or result is missing for ${containerIdStr}`);
      return;
    }

    try {
      // Clean up existing scripts first
      cleanup();
      
      // Verify the container exists in DOM
      if (typeof document !== 'undefined') {
        const domContainer = document.getElementById(containerIdStr);
        if (!domContainer) {
          console.warn(`Container #${containerIdStr} not found in DOM`);
          return;
        }
        
        // Clear the container
        if (containerElement.innerHTML) {
          containerElement.innerHTML = '';
        }
      } else {
        return; // Not in browser environment
      }

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
        studies = []
      } = result;

      // Mark this instance as active
      activeCharts.set(containerIdStr, true);
      isActive.current = true;

      // Create widget container first
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'tradingview-widget-container__widget';
      widgetContainer.style.height = 'calc(100% - 32px)';
      widgetContainer.style.width = '100%';
      containerElement.appendChild(widgetContainer);

      // Create a new script element
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.setAttribute('data-container-id', containerIdStr);
      
      // Add load and error handlers
      script.onerror = (e) => {
        console.error(`Error loading TradingView script for ${containerIdStr}:`, e);
        setError('Failed to load chart. Please refresh and try again.');
      };
      
      // Set the widget config
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
        container_id: containerIdStr,
        studies
      });

      // Store reference and append to container
      scriptRef.current = script;
      containerElement.appendChild(script);
      
      // Mark as initialized
      setInitialized(true);
    } catch (error) {
      console.error(`Error initializing TradingView chart for ${containerIdStr}:`, error);
      setError('An error occurred while loading the chart.');
    }
  };

  // Delay initialization to ensure DOM is ready
  useEffect(() => {
    if (!mounted) return;
    
    const timer = setTimeout(() => {
      if (containerRef.current && document.getElementById(containerId)) {
        initializeChart(containerRef.current, containerId);
      }
    }, 500); // Significant delay to ensure DOM is ready
    
    return () => clearTimeout(timer);
  }, [mounted, containerId, toolInvocation]);

  // Expanded view initialization
  useEffect(() => {
    if (!mounted || !isExpanded) return;
    
    const timer = setTimeout(() => {
      if (expandedContainer.current && document.getElementById(expandedContainerId)) {
        initializeChart(expandedContainer.current, expandedContainerId);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [isExpanded, mounted, expandedContainerId]);

  // Reset error when toolInvocation changes
  useEffect(() => {
    setError(null);
  }, [toolInvocation]);

  if (error) {
    return (
      <div className="p-4 w-full flex flex-col items-center justify-center text-red-500 bg-zinc-800 rounded-md">
        <p className="mb-2">{error}</p>
        <button 
          onClick={() => {
            setError(null);
            setInitialized(false);
            if (containerRef.current) {
              initializeChart(containerRef.current, containerId);
            }
          }}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-md text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className={`p-4 w-full relative ${className}`}
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
          ref={containerRef} 
          id={containerId}
          style={{ 
            height: "400px", 
            width: "100%",
            minHeight: "300px"
          }}
        />

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
              />
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