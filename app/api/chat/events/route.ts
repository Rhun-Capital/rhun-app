import { NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  marketCap?: number;
  address?: string;
}

interface Token {
  symbol: string;
  amount: number;
  metadata?: TokenMetadata;
  usd_value?: number;
}

interface WebhookEvent {
  signature: string;
  timestamp: number;
  type: string;
  description: string;
  holder_address: string;
  native_balance_change: number;
  token_transfers: any[];
  fromToken: Token;
  toToken: Token;
  tracked_token?: {
    symbol: string;
    address: string;
    name?: string;
    logoURI?: string;
  };
  holder_mapping?: {
    token_address: string;
    token_symbol: string;
    token_name: string;
    webhook_id: string;
    token_logo_uri?: string;
    token_decimals?: number;
  } | null;
  swap_value_usd?: number;
}

// Tool for analyzing swap events
const analyzeSwapEvents = {
  name: 'analyzeSwapEvents',
  description: 'Analyze a set of swap events to identify patterns and provide market insights',
  parameters: z.object({
    timeframe: z.string().optional(),
    focusToken: z.string().optional(),
  }),
  execute: async (events: WebhookEvent[]) => {
    // Add debug logging for incoming events
    console.log('Analyzing events:', events.map(e => ({
      signature: e.signature,
      fromToken: {
        symbol: e.fromToken.symbol,
        usd_value: e.fromToken.usd_value,
        amount: e.fromToken.amount
      },
      toToken: {
        symbol: e.toToken.symbol,
        usd_value: e.toToken.usd_value,
        amount: e.toToken.amount
      }
    })));

    // Calculate total volume with validation
    const totalVolume = events.reduce((sum, event) => {
      const fromValue = parseFloat(event.fromToken.usd_value?.toString() || '0');
      const toValue = parseFloat(event.toToken.usd_value?.toString() || '0');
      
      // Log any suspicious values
      if (fromValue === 0 && toValue === 0) {
        console.warn('Zero values detected for event:', event.signature);
      }
      
      return sum + Math.max(fromValue, toValue);
    }, 0);
    
    // Identify buy/sell patterns
    const trades = events.map(event => {
      const toTokenSymbol = event.toToken.metadata?.symbol || event.toToken.symbol;
      const isSellEvent = toTokenSymbol.toUpperCase() === 'USDC' || toTokenSymbol.toUpperCase() === 'SOL';
      
      // For sells, use fromToken value; for buys, use toToken value
      const value = isSellEvent ? event.fromToken.usd_value || 0 : event.toToken.usd_value || 0;
      
      return {
        type: isSellEvent ? 'SELL' : 'BUY',
        token: isSellEvent ? event.fromToken.metadata?.symbol || event.fromToken.symbol : event.toToken.metadata?.symbol || event.toToken.symbol,
        value,
        timestamp: event.timestamp
      };
    });

    // Calculate buy/sell ratio
    const sells = trades.filter(t => t.type === 'SELL');
    const buys = trades.filter(t => t.type === 'BUY');
    const buyVolume = buys.reduce((sum, trade) => sum + trade.value, 0);
    const sellVolume = sells.reduce((sum, trade) => sum + trade.value, 0);

    // Find largest trades
    const sortedByValue = [...trades].sort((a, b) => b.value - a.value);
    const largestTrades = sortedByValue.slice(0, 3);

    // Identify most active tokens
    const tokenVolumes = trades.reduce((acc, trade) => {
      acc[trade.token] = (acc[trade.token] || 0) + trade.value;
      return acc;
    }, {} as Record<string, number>);

    const sortedTokens = Object.entries(tokenVolumes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    // Add debug logging
    console.log('Event Analysis Debug:');
    events.forEach((event, i) => {
      console.log(`Event ${i + 1}:`, {
        fromToken: {
          symbol: event.fromToken.symbol,
          usdValue: event.fromToken.usd_value
        },
        toToken: {
          symbol: event.toToken.symbol,
          usdValue: event.toToken.usd_value
        }
      });
    });

    return {
      totalVolume,
      buyVolume,
      sellVolume,
      buySellRatio: sellVolume > 0 ? buyVolume / sellVolume : buyVolume > 0 ? Infinity : 1,
      largestTrades,
      mostActiveTokens: sortedTokens,
      tradeCount: trades.length,
      buyCount: buys.length,
      sellCount: sells.length
    };
  }
};

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();
    
    if (!context?.events || !Array.isArray(context.events)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing events data' }),
        { status: 400 }
      );
    }

    console.log(context.events);

    // Analyze the events
    const analysis = await analyzeSwapEvents.execute(context.events);
    console.log("11:::", analysis);

    // Create a system prompt that includes the analysis data
    const systemPrompt = `You are an expert cryptocurrency market analyst assistant. You help users understand market trends and trading patterns based on real-time swap event data.

Current Analysis Data:
- Total Trading Volume: $${analysis.totalVolume.toLocaleString()}
- Number of Trades: ${analysis.tradeCount} (${analysis.buyCount} buys, ${analysis.sellCount} sells)
- Buy/Sell Ratio: ${analysis.buySellRatio.toFixed(2)}
- Market Sentiment: ${analysis.buySellRatio > 1.2 ? 'Bullish 📈' : analysis.buySellRatio < 0.8 ? 'Bearish 📉' : 'Neutral ↔️'}

Largest Trades:
${analysis.largestTrades.map(trade => 
  `- ${trade.type} ${trade.token}: $${trade.value.toLocaleString()}`
).join('\n')}

Most Active Tokens:
${analysis.mostActiveTokens.map(([token, volume]) => 
  `- ${token}: $${volume.toLocaleString()} in volume`
).join('\n')}

Use this data to provide insights and answer questions about market trends. Be concise but informative, and focus on actionable insights.

If the user greets you or asks a general question, respond naturally while incorporating relevant market data from above.`;

    // Format messages for the AI
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // Create stream from OpenAI
    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 500,
      stream: true
    });

    // Convert the stream to a proper response
    const textStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              // Format each chunk as a JSON event
              const data = JSON.stringify({ type: 'text', value: content });
              controller.enqueue(encoder.encode(`${data}\n`));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new Response(textStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in event analysis:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to analyze events' }),
      { status: 500 }
    );
  }
} 