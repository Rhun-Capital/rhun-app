import { ChatOpenAI } from 'langchain/chat_models/openai';
import { PromptTemplate } from 'langchain/prompts';
import { z } from 'zod';
import { SolanaQuerySchema } from '@/utils/solana-schema';
import { HumanMessage } from 'langchain/schema';

export const runtime = 'edge';

const prompt = PromptTemplate.fromTemplate(`
You are a Solana query parser. Convert the following natural language query into a structured format that matches our SolanaQuerySchema.

Schema:
{{
  intent: "get_transactions" | "get_token_holdings" | "get_account_details" | "get_token_holders" | "get_defi_activities",
  timeFrame?: {{
    type: "last_days" | "specific_range" | "all",
    value?: number | {{ from: string, to: string }}
  }},
  limit?: number,
  sortBy?: "block_time" | "amount" | "value",
  sortOrder?: "asc" | "desc",
  filters?: {{
    token?: string,
    platform?: string[],
    activityType?: string[]
  }}
}}

Examples:
- "Show me transactions from the last 3 days" -> {{
  "intent": "get_transactions",
  "timeFrame": {{ "type": "last_days", "value": 3 }}
}}
- "What tokens are in these wallets?" -> {{
  "intent": "get_token_holdings"
}}
- "Get the latest 5 transactions" -> {{
  "intent": "get_transactions",
  "limit": 5,
  "sortBy": "block_time",
  "sortOrder": "desc"
}}

Current query: {query}

Return ONLY the JSON object that matches the schema. Do not include any explanations or additional text.
`);

export async function POST(req: Request) {
  const { query } = await req.json();

  const model = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0,
  });

  const formattedPrompt = await prompt.format({
    query,
  });

  const response = await model.call([
    new HumanMessage(formattedPrompt)
  ]);

  const result = JSON.parse(response.content);
  return Response.json(result);
} 