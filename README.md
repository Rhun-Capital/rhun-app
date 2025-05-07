# Vercel AI SDK useChat with Attachments Example

This example demonstrates how to use the [Vercel AI SDK](https://sdk.vercel.ai/docs) with [Next.js](https://nextjs.org/) with the `useChat` hook to create a chat interface that can send and receive multi-modal messages from the AI provider of your choice.

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fai-sdk-preview-attachments&env=OPENAI_API_KEY&envDescription=API%20keys%20needed%20for%20application&envLink=platform.openai.com)

## How to use

Run [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init), [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/), or [pnpm](https://pnpm.io) to bootstrap the example:

```bash
npx create-next-app --example https://github.com/vercel-labs/ai-sdk-preview-attachments ai-sdk-preview-attachments-example
```

```bash
yarn create next-app --example https://github.com/vercel-labs/ai-sdk-preview-attachments ai-sdk-preview-attachments-example
```

```bash
pnpm create next-app --example https://github.com/vercel-labs/ai-sdk-preview-attachments ai-sdk-preview-attachments-example
```

To run the example locally you need to:

1. Sign up for accounts with the AI providers you want to use (e.g., OpenAI, Anthropic).
2. Obtain API keys for each provider.
3. Set the required environment variables as shown in the `.env.example` file, but in a new file called `.env`.
4. `npm install` to install the required dependencies.
5. `npm run dev` to launch the development server.


## Learn More

To learn more about Vercel AI SDK or Next.js take a look at the following resources:

- [Vercel AI SDK docs](https://sdk.vercel.ai/docs)
- [Vercel AI Playground](https://play.vercel.ai)
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

# Environment Variables

To run this project, you need to set the following environment variables:

## Required Variables

```
# Helius API Key
HELIUS_API_KEY=your_helius_api_key_here

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=us-east-1

# Public URLs
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_WEBHOOK_URL=https://your-production-domain.com
```

## DynamoDB Tables
The following tables will be created automatically when you run `npm run init-db`:

```
DYNAMODB_HOLDERS_ACTIVITY_TABLE_NAME=TokenHoldersActivity
DYNAMODB_TOKEN_HOLDERS_MAPPING_TABLE_NAME=TokenHoldersMapping
```

## Webhook URL Requirements

For Helius webhooks to work correctly:
- Your webhook URL must be publicly accessible with HTTPS
- Set `NEXT_PUBLIC_URL` to your public-facing URL (the one that Helius can reach)
- For local development, you can use a service like ngrok but be aware it may be less reliable
- Example with ngrok: `NEXT_PUBLIC_URL=https://your-domain.ngrok-free.app`

