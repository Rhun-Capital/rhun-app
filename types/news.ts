import { BaseToolProps, ToolInvocationState } from './tools';
import { CryptoNewsProps, BrowserUseResultProps } from './components';

export interface CryptoNewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  image?: string;
  publishedAt: string;
  content?: string;
  author?: string;
  category?: string;
  tags?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  relevance?: number;
  metadata?: Record<string, any>;
  imageUrl?: string;
}

export interface NewsAnalysis {
  summary: string;
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral';
    score: number;
  };
  topics: string[];
  entities: {
    name: string;
    type: string;
    count: number;
  }[];
  keywords: {
    word: string;
    score: number;
  }[];
  sources: {
    name: string;
    count: number;
  }[];
  timeline: {
    date: string;
    count: number;
  }[];
}

export interface NewsSearchResult {
  articles: CryptoNewsArticle[];
  totalResults: number;
  page: number;
  pageSize: number;
  query: string;
  filters?: {
    from?: string;
    to?: string;
    sources?: string[];
    categories?: string[];
    tags?: string[];
  };
}

export interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: CryptoNewsArticle[];
}

export interface NewsError {
  code: string;
  message: string;
  status: number;
}

export interface BaseCryptoNewsProps {
  query: string;
  onNewsUpdate?: (news: CryptoNewsArticle[]) => void;
  className?: string;
}

export interface NewsAnalysisProps extends BaseToolProps {
  toolInvocation: {
    toolName: string;
    args: { message: string; ticker?: string };
    result?: {
      sentiment: string;
      summary: string;
      keyPoints: string[];
      impact: {
        price: string;
        market: string;
        industry: string;
      };
      ticker?: string;
      processed_news?: Array<{
        title: string;
        sentiment: {
          score: number;
        };
        published_timestamp: string;
        publisher: string;
        summary: string;
        link: string;
      }>;
      news_sentiment?: {
        sentiment: string;
        average_score: number;
      };
    } | {
      error: string;
      message: string;
      status?: string;
    } | {
      status: 'processing';
      message: string;
    };
    state: ToolInvocationState;
  };
}

export interface ExtendedCryptoNewsProps extends CryptoNewsProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: {
      articles: Array<{
        title: string;
        description: string;
        url: string;
        source: string;
        publishedAt: string;
      }>;
    };
    state: ToolInvocationState;
  };
}

export interface TaskData {
  id: string;
  status: string;
  result?: any;
  error?: string;
  created_at: string;
  updated_at: string;
}

export type PartialTaskData = Partial<TaskData>;

export interface ExtendedBrowserUseResultProps extends BrowserUseResultProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    result?: TaskData;
    state: ToolInvocationState;
  };
} 