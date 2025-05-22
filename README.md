# RHUN App

RHUN is an AI-powered DeFi automation platform that enables users to create and manage automated trading strategies on the Solana blockchain. It combines the power of delegated wallets, technical analysis, and AI to provide a seamless automated trading experience.

## Features

- 🤖 AI-powered trading strategy creation and management
- 🔄 Automated DeFi trading execution
- 👛 Secure delegated wallet integration with Privy
- 📊 Real-time market data analysis
- 📈 Technical analysis signals
- ⚡ Built on Solana for fast, low-cost transactions

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- AWS (DynamoDB, Lambda, EventBridge)
- Privy for wallet management
- Solana Web3.js
- Raydium SDK
- OpenAI for AI features

## Prerequisites

- Node.js 18+
- pnpm
- AWS account with appropriate permissions
- Privy account and API keys
- Helius API key
- OpenAI API key

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/rhun-app.git
   cd rhun-app
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in all required environment variables in `.env`

4. Initialize the database:
   ```bash
   pnpm run init-db
   ```

5. Start the development server:
   ```bash
   pnpm dev
   ```

## Environment Variables

Create a `.env` file with the following variables:

```env
# AI Configuration
OPENAI_API_KEY=

# Blockchain Configuration
HELIUS_API_KEY=
NEXT_PUBLIC_NETWORK=devnet  # or mainnet-beta

# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_APP_SECRET=

# AWS Configuration
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1

# Application URLs
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_WEBHOOK_URL=
```

## Project Structure

```
rhun-app/
├── app/                    # Next.js app router pages
├── components/            # React components
├── contexts/             # React context providers
├── hooks/               # Custom React hooks
├── lambda/              # AWS Lambda functions
├── lib/                 # Core business logic
├── public/              # Static assets
├── scripts/             # Utility scripts
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## AWS Infrastructure

The application uses several AWS services:
- DynamoDB for strategy and user data storage
- Lambda for executing automated trades
- EventBridge for scheduling trade executions
- S3 for file storage (optional)

Required DynamoDB tables:
- TokenHoldersActivity
- TokenHoldersMapping

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and contribute to the project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

If you discover any security-related issues, please email security@rhun.app instead of using the issue tracker.

## Support

For support, please:
1. Check the [documentation](docs/)
2. Search existing [issues](https://github.com/your-org/rhun-app/issues)
3. Create a new issue if needed

## Acknowledgments

- [Privy](https://privy.io/) for wallet infrastructure
- [Solana](https://solana.com/) blockchain
- [Raydium](https://raydium.io/) DEX
- [Helius](https://helius.xyz/) for Solana APIs
