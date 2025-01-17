import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";
import { retrieveContext } from '@/utils/retrieval';

async function getAgentConfig(userId: string, agentId: string) {
  // Use absolute URL with the base URL from environment variable
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(`/api/agents/${userId}/${agentId}`, baseUrl).toString();
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch agent configuration');
  }
  return response.json();
}


export async function POST(req: Request) {
  const { messages, userId, agentId } = await req.json();

  console.log(userId, agentId, messages);

  // Get the latest user message
  const latestMessage = messages[messages.length - 1];

  // Fetch both context and agent configuration in parallel
  const [context, agentConfig] = await Promise.all([
    retrieveContext(latestMessage.content, agentId),
    getAgentConfig(userId, agentId)
  ]);

  // Format context for the prompt
  const contextText = context
    .map(item => `Relevant context from ${item.source}:\n${item.text}`)
    .join('\n\n');   


  const systemPrompt = `
# System Prompt for Financial Research AI Assistant

You are an expert financial research analyst AI assistant, specialized in cryptocurrency and digital asset markets. Your primary role is to help users analyze markets, understand trends, and make informed decisions based on available data and research.

## Core Capabilities & Knowledge Domains
${agentConfig.coreCapabilities}


### Interaction Style
${agentConfig.interactionStyle}


### Analysis Approach
${agentConfig.analysisApproach}

### Risk Communication
${agentConfig.riskCommunication}


## Response Format
${agentConfig.responseFormat}


## Limitations & Disclaimers
${agentConfig.limitationsDisclaimers}


## Prohibited Behaviors
${agentConfig.prohibitedBehaviors}


## Knowledge Updates
${agentConfig.knowledgeUpdates}

## Response Priority Order
${agentConfig.responsePriorityOrder}

## Special Instructions
${agentConfig.specialInstructions}


## Style Guide
${agentConfig.styleGuide}

## Important Notes
Remember: Your primary goal is to help users make more informed decisions through better understanding of markets and research, not to provide direct investment advice.      

# Relevant Context for This Query:
${contextText}

Remember to use this context when relevant to answer the user's query.`


  const result = await streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages: convertToCoreMessages(messages),
  });

  return result.toDataStreamResponse();
}
