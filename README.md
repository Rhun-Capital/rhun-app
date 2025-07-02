# RHUN App

RHUN is an advanced AI-powered DeFi automation and analysis platform built on Solana. It combines AI agents, real-time market data, technical analysis, and automated trading capabilities to provide comprehensive cryptocurrency and DeFi management tools.

## Overview

RHUN enables users to:
- **Create AI Agents** with specialized knowledge and autonomous trading capabilities
- **Analyze Markets** with real-time data from multiple sources
- **Execute Trades** through delegated wallet automation
- **Monitor Portfolios** across Solana tokens and DeFi protocols
- **Research Cryptocurrencies** with integrated news, social sentiment, and technical analysis

## Core Features

### 🤖 AI Agent System
- Custom AI agents with configurable personalities and expertise
- Knowledge base integration for specialized domain knowledge
- Autonomous decision-making with user-defined parameters
- Multi-model support (OpenAI GPT-4, Anthropic Claude)

### 💼 Portfolio Management
- Real-time portfolio tracking across Solana wallets
- Token holdings analysis with USD valuations
- Portfolio performance metrics and analytics
- Multi-wallet support for users and agents

### 🔄 Automated Trading
- Delegated wallet integration using Privy
- Multiple trading strategies (DCA, Momentum, Limit Orders, Rebalancing)
- Scheduled execution with AWS Lambda and EventBridge
- Risk management and position sizing controls

### 📊 Market Analysis Tools
- Technical analysis with 15+ indicators
- Real-time price data and market sentiment
- Social media sentiment analysis (Twitter integration)
- Economic data integration (FRED API)

## Chat API Endpoints

The core functionality revolves around the chat system that provides AI-powered interactions:

### Main Chat Endpoint
**`POST /api/chat`**
- Primary AI chat interface with tool integration
- Supports streaming responses for real-time interaction
- Tool execution with result caching for large datasets
- Context-aware responses using vector embeddings

### Chat Management
**`GET /api/chat/[chatId]`**
- Retrieve chat history with message threading
- Support for both user and template chats
- Automatic file attachment handling with signed URLs

**`POST /api/chat/[chatId]`**
- Update chat metadata and last message
- Template chat support for agent demonstrations

**`GET /api/chat/recent`**
- Fetch recent chat history for users
- Paginated results with metadata

### Message Management
**`POST /api/chat/messages`**
- Store chat messages with tool invocation results
- File attachment support with S3 integration
- Large result handling with automatic S3 storage

**`GET /api/chat/messages`**
- Retrieve presigned URLs for stored data access
- Secure temporary access to large datasets

### Real-time Features
**`POST /api/chat/events`**
- Server-sent events for real-time analysis
- Streaming responses for long-running operations

**`POST /api/chat/presigned`**
- Generate presigned URLs for file uploads
- Secure file handling with size and type restrictions

## Available AI Tools

RHUN provides 50+ specialized tools for cryptocurrency and DeFi analysis:

### Portfolio & Balance Tools
- `getUserPortfolioValue` - Real-time portfolio valuation
- `getAgentPortfolioValue` - Agent wallet analysis
- `getUserTokenHoldings` - Detailed token inventory
- `getAgentTokenHoldings` - Agent token positions

### Market Data & Analysis
- `getMarketMovers` - Top gainers/losers analysis
- `getTotalCryptoMarketCap` - Global market metrics
- `getFearAndGreedIndex` - Market sentiment indicator
- `getSolanaTransactionVolume` - Network activity metrics
- `getDerivativesExchanges` - Futures market data

### Token Research Tools
- `getTokenInfo` - Comprehensive token analysis
- `searchTokens` - Multi-source token discovery
- `getTopHolders` - Whale and distribution analysis
- `getRecentDexScreenerTokens` - New token discovery
- `getTrendingTokens` - Momentum identification

### Technical Analysis
- `getTechnicalAnalysis` - 15+ technical indicators
  - SMA/EMA moving averages
  - RSI, MACD, Stochastic RSI
  - Bollinger Bands, Ichimoku Cloud
  - Support/Resistance levels
  - Volume analysis and momentum

### Trading Tools
- `swap` - Token swapping via Jupiter
- `getTradingViewChart` - Interactive price charts
- `executeSwap` - Direct trade execution

### Social & News Analysis
- `getCryptoNews` - Curated cryptocurrency news
- `getOfficialTweets` - Project social media analysis
- `searchTweets` - Social sentiment tracking (when available)

### Economic Data (FRED Integration)
- `getFredSeries` - Federal Reserve economic data
- `fredSearch` - Economic indicator discovery
- Access to GDP, inflation, employment, and monetary data

### Account Analysis
- `getAccountDetails` - Wallet activity analysis
- `getAccountActivities` - Transaction history
- `trackWallet` - Ongoing wallet monitoring

### Research Tools
- `webResearch` - AI-powered web research
- `newsAnalysis` - Market impact analysis
- `stockAnalysis` - Traditional market analysis

## Technology Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React** with modern hooks and context

### Backend & APIs
- **Vercel Edge Functions** for scalable API endpoints
- **AWS Lambda** for background processing
- **DynamoDB** for data persistence
- **S3** for file storage and large datasets

### Blockchain Integration
- **Solana Web3.js** for blockchain interactions
- **Privy** for wallet management and authentication
- **Jupiter** for token swapping
- **Raydium SDK** for AMM interactions

### AI & Analysis
- **OpenAI GPT-4** for conversational AI
- **Anthropic Claude** for advanced reasoning
- **Pinecone** for vector search and embeddings
- **Custom technical analysis engine**

### External Data Sources
- **Helius** - Solana RPC and historical data
- **CoinGecko** - Cryptocurrency market data
- **Solscan** - Solana account and transaction data
- **DexScreener** - DEX trading data
- **FRED** - Federal Reserve economic data
- **Twitter API** - Social sentiment analysis

## Environment Configuration

Copy `.env.example` to `.env` and configure the following:

```bash
# Core Application
NEXT_PUBLIC_URL=your-domain.com
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Blockchain & Wallets
HELIUS_API_KEY=your-helius-key
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-secret

# AWS Infrastructure
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-west-2

# External APIs
COINGECKO_API_KEY=your-coingecko-key
SOLSCAN_API_KEY=your-solscan-key
FRED_API_KEY=your-fred-key
```

See `.env.example` for the complete list of required environment variables.

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd rhun-app
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. **Start development server:**
   ```bash
   pnpm dev
   ```

4. **Access the application:**
   - Navigate to `http://localhost:3000`
   - Connect your Solana wallet
   - Create or interact with AI agents

## Project Structure

```
rhun-app/
├── app/                     # Next.js App Router
│   ├── (auth)/             # Protected routes
│   │   ├── agents/         # Agent management
│   │   ├── portfolio/      # Portfolio dashboard
│   │   └── marketplace/    # Agent marketplace
│   ├── api/                # API endpoints
│   │   ├── chat/          # Chat system APIs
│   │   ├── trading/       # Trading endpoints
│   │   └── tools/         # Tool-specific APIs
│   └── components/         # UI components
├── components/             # Shared components
│   ├── tools/             # Tool UI components
│   └── ui/                # Base UI components
├── utils/                  # Utility functions
│   ├── agent-tools.ts     # AI tool implementations
│   ├── technical-analysis.ts # TA calculations
│   └── server-wallet.ts   # Wallet operations
├── types/                  # TypeScript definitions
└── contexts/              # React contexts
```

## AWS Infrastructure

Required AWS services:
- **DynamoDB Tables:**
  - `Agents` - Agent configurations
  - `ChatMessages` - Chat history
  - `TokenHoldersActivity` - Blockchain monitoring
  - `TradingStrategies` - Automated trading configs

- **Lambda Functions:**
  - Trading execution engine
  - Wallet monitoring
  - Background data processing

- **EventBridge Rules:**
  - Scheduled trading execution
  - Market data updates

## Usage Examples

### Creating an AI Agent
```typescript
// Agents can be configured with:
// - Custom personalities and knowledge
// - Specific trading strategies
// - Risk management parameters
// - Automated execution permissions
```

### Using Chat Tools
```typescript
// Examples of natural language queries:
// "Show me technical analysis for Solana"
// "What are the top gainers today?"
// "Swap 10 SOL for USDC"
// "Track this wallet: [address]"
// "What's the latest GDP data?"
```

### Automated Trading
```typescript
// Set up automated strategies:
// - Dollar Cost Averaging (DCA)
// - Momentum-based trading
// - Limit orders
// - Portfolio rebalancing
```

## Security & Compliance

- **Wallet Security:** Privy-managed delegated wallets with user consent
- **Data Encryption:** All sensitive data encrypted at rest and in transit
- **Rate Limiting:** API protection with Redis-based rate limiting
- **Access Control:** JWT-based authentication with role management

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a pull request

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## Support

For support:
1. Check the [documentation](docs/)
2. Search [existing issues](https://github.com/your-org/rhun-app/issues)
3. Create a new issue with detailed information
4. Contact: support@rhun.io

---

**RHUN** - Autonomous Intelligence for Decentralized Finance
