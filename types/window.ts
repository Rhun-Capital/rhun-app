export interface TradingViewWindow {
  TradingView?: {
    widget: any;
  };
}

declare global {
  interface Window {
    TradingView?: {
      widget: any;
    };
  }
} 