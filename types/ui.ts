import { SendToken } from './wallet';
import { ReactNode } from 'react';
import { ChartData } from './chart';

// Modal types
export interface ModalContextType {
  isOpen: boolean;
  modalContent: ReactNode;
  openModal: (content: ReactNode) => void;
  closeModal: () => void;
}

// Basic UI component types
export interface TokenIconProps {
  icon?: string;
  symbol: string;
  size?: number;
  className?: string;
}

export interface CopyButtonProps {
  text: string;
  className?: string;
}

export interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export interface Option {
  value: string;
  label: string;
  image?: string;
}

export interface ImageSelectProps {
  options: Array<{
    value: string;
    label: string;
    image: string;
  }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export interface ImageUploadProps {
  onImageChange: (file: File | null) => void;
  initialImage?: string;
}

// Chat UI types
export interface RecentChatsProps {
  maxVisible?: number;
  setIsOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

// Form types
export interface FundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  defaultAmount?: number;
}

export interface LoginFormProps {
  token: string;
  setToken: (token: string) => void;
  error: string | null;
  isLoading: boolean;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

// Navigation types
export type Category = 'Wallet' | 'Portfolio' | 'Analytics' | 'Search' | 'Market';

export type ModalType = 'transfer' | 'receive' | 'swap' | null;

// Wallet UI types
export interface TransferModalProps {
  agent: any;
  tokens: SendToken[];
  isOpen: boolean;
  onClose: () => void;
  token: SendToken | "SOL";
  solanaBalance?: {
    amount: number;
    usdValue: number;
    logoURI: string;
  };
  onSwapComplete?: () => void;
}

export type { ChartData };

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export interface GlobalMarketProps {
  refreshInterval?: number;
  className?: string;
}

export interface FearGreedProps {
  value: number;
  className?: string;
}

export interface BalanceProps {
  address: string;
  className?: string;
}

export interface QuoteSwapProps {
  fromToken: string;
  toToken: string;
  amount: number;
  className?: string;
}

export interface TopHoldersDisplayProps {
  tokenAddress: string;
  limit?: number;
  className?: string;
} 