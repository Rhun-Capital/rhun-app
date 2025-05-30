import { useEffect, useRef } from 'react';
import { TradingViewChartProps } from '@/types/components';
import { TradingViewWindow } from '../../types/window';

declare global {
  interface Window extends TradingViewWindow {}
}

export default function TradingViewChart({ symbol, interval = '1D', theme = 'dark', className }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof window.TradingView !== 'undefined') {
        new window.TradingView.widget({
          container_id: containerRef.current?.id,
          symbol: symbol,
          interval: interval,
          theme: theme,
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: true,
          save_image: false,
          height: 400,
          width: '100%',
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [symbol, interval, theme]);

  return (
    <div 
      ref={containerRef}
      id={`tradingview_${Math.random().toString(36).substring(7)}`}
      className={className}
    />
  );
} 