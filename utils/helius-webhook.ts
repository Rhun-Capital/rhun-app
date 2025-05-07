interface WebhookConfig {
  webhookURL: string;
  transactionTypes?: string[];
  accountAddresses?: string[];
  webhookType?: 'enhanced' | 'raw';
  authHeader?: string;
}

interface WebhookResponse {
  webhookID: string;
  webhookURL: string;
  transactionTypes: string[];
  accountAddresses: string[];
  webhookType: string;
  authHeader?: string;
}

/**
 * Register a new webhook with Helius
 */
export async function registerWebhook(config: WebhookConfig): Promise<WebhookResponse> {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    throw new Error('HELIUS_API_KEY is not set in environment variables');
  }

  const response = await fetch('https://api.helius.xyz/v0/webhooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      webhookURL: config.webhookURL,
      transactionTypes: config.transactionTypes || ['ANY'],
      accountAddresses: config.accountAddresses || [],
      webhookType: config.webhookType || 'enhanced',
      authHeader: config.authHeader,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to register webhook: ${error.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Get all registered webhooks
 */
export async function getWebhooks(): Promise<WebhookResponse[]> {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    throw new Error('HELIUS_API_KEY is not set in environment variables');
  }

  const response = await fetch('https://api.helius.xyz/v0/webhooks', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get webhooks: ${error.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(webhookId: string): Promise<void> {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    throw new Error('HELIUS_API_KEY is not set in environment variables');
  }

  const response = await fetch(`https://api.helius.xyz/v0/webhooks/${webhookId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to delete webhook: ${error.message || response.statusText}`);
  }
}

/**
 * Update a webhook
 */
export async function updateWebhook(
  webhookId: string,
  config: Partial<WebhookConfig>
): Promise<WebhookResponse> {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    throw new Error('HELIUS_API_KEY is not set in environment variables');
  }

  const response = await fetch(`https://api.helius.xyz/v0/webhooks/${webhookId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update webhook: ${error.message || response.statusText}`);
  }

  return response.json();
} 