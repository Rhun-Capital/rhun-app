import { Category } from './ui';

export interface App {
  id: string;
  name: string;
  description: string;
  category: Category;
  isInstalled?: boolean;
}

export interface AppMarketplaceTabProps {
  agentId: string;
} 