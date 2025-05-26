export const formatAmount = (amount: number | null | undefined, decimals: number = 0, isUSD: boolean = false) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '0';
  if (amount === 0) return '0';
  
  if (isUSD) {
    if (amount < 0.01) {
      return '< $0.01';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  const absAmount = Math.abs(amount);
  if (absAmount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (absAmount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (absAmount >= 1_000) {
    return `${(amount / 1_000).toFixed(2)}K`;
  }
  if (absAmount < 0.00001) {
    return amount.toExponential(2);
  }
  return amount.toFixed(decimals);
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