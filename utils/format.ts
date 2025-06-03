export const formatAmount = (amount: number | null | undefined, decimals: number = 0, isUSD: boolean = false) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '0';
  if (amount === 0) return '0';
  
  // First adjust for decimals
  const adjustedAmount = amount / Math.pow(10, decimals);
  
  if (isUSD) {
    if (adjustedAmount < 0.01) {
      return '< $0.01';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(adjustedAmount);
  }

  // For non-USD values, format with appropriate precision
  if (adjustedAmount < 0.000001) {
    return adjustedAmount.toExponential(4);
  } else if (adjustedAmount < 0.001) {
    return adjustedAmount.toFixed(6);
  } else if (adjustedAmount < 1) {
    return adjustedAmount.toFixed(4);
  } else if (adjustedAmount < 1000) {
    return adjustedAmount.toFixed(2);
  } else if (adjustedAmount < 1000000) {
    return `${(adjustedAmount / 1000).toFixed(2)}K`;
  } else if (adjustedAmount < 1000000000) {
    return `${(adjustedAmount / 1000000).toFixed(2)}M`;
  } else {
    return `${(adjustedAmount / 1000000000).toFixed(2)}B`;
  }
};

export const formatExactAmount = (amount: number, isUSD: boolean = false) => {
  if (isUSD) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(amount);
};

export const formatAddress = (address?: string | null): string => {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}; 