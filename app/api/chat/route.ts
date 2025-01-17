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
  const { messages, user, agentId } = await req.json();
  // Get the latest user message
  const latestMessage = messages[messages.length - 1];

  // Fetch both context and agent configuration in parallel
  const [context, agentConfig] = await Promise.all([
    retrieveContext(latestMessage.content, agentId),
    getAgentConfig(user.id, agentId)
  ]);

  // Format context for the prompt
  const contextText = context
    .map(item => `Relevant context from ${item.source}:\n${item.text}`)
    .join('\n\n');   


  const systemPrompt = `

## User Information:
- User's ID: ${user.id}
- User's Email: ${user.email || 'N/A'}
- User's Wallet: ${user.wallet.address || 'N/A'}

## Agent Information:
- Agent's ID: ${agentConfig.id}
- Agent's Name: ${agentConfig.name}
- Agent's Description: ${agentConfig.description}

## Agent's Solana Wallet Address:
${agentConfig.wallets?.solana || 'N/A'}

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
