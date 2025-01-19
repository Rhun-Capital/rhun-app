// Icons for different app categories
export const CategoryIcons = {
    Wallet: () => (
      <svg viewBox="0 0 100 100" className="w-8 h-8">
        <rect x="20" y="30" width="60" height="40" rx="5" fill="none" stroke="currentColor" strokeWidth="4"/>
        <path d="M65 50 H80 Q85 50 85 55 V65 Q85 70 80 70 H65 Q60 70 60 65 V55 Q60 50 65 50" fill="currentColor"/>
        <rect x="30" y="25" width="40" height="10" fill="currentColor"/>
      </svg>
    ),
    
    Portfolio: () => (
      <svg viewBox="0 0 100 100" className="w-8 h-8">
        <path d="M20 80 L40 60 L60 70 L80 30" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="40" cy="60" r="4" fill="currentColor"/>
        <circle cx="60" cy="70" r="4" fill="currentColor"/>
        <circle cx="80" cy="30" r="4" fill="currentColor"/>
      </svg>
    ),
  
    Analytics: () => (
      <svg viewBox="0 0 100 100" className="w-8 h-8">
        <rect x="20" y="60" width="15" height="20" fill="currentColor"/>
        <rect x="42.5" y="40" width="15" height="40" fill="currentColor"/>
        <rect x="65" y="20" width="15" height="60" fill="currentColor"/>
      </svg>
    ),
  
    Search: () => (
      <svg viewBox="0 0 100 100" className="w-8 h-8">
        <circle cx="45" cy="45" r="20" fill="none" stroke="currentColor" strokeWidth="4"/>
        <path d="M60 60 L75 75" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
      </svg>
    ),
  
    Market: () => (
      <svg viewBox="0 0 100 100" className="w-8 h-8">
        <path d="M20 50 Q50 20 80 50" fill="none" stroke="currentColor" strokeWidth="4"/>
        <path d="M20 70 Q50 40 80 70" fill="none" stroke="currentColor" strokeWidth="4"/>
        <circle cx="50" cy="50" r="4" fill="currentColor"/>
      </svg>
    )
  };
  
  // Common icon wrapper component
  type Category = 'Wallet' | 'Portfolio' | 'Analytics' | 'Search' | 'Market';

  export const IconWrapper = ({ category, className = "" }: { category: Category; className?: string }) => {
    const Icon = CategoryIcons[category] || CategoryIcons.Analytics;
    return (
      <div className={`text-indigo-500 ${className}`}>
        <Icon />
      </div>
    );
  };