interface RateLimit {
  timestamp: number;
  count: number;
}

const rateLimits = new Map<string, RateLimit>();

export function isRateLimited(identifier: string, limit: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimits.get(identifier);

  // Clean up old rate limits
  if (userLimit && now - userLimit.timestamp > windowMs) {
    rateLimits.delete(identifier);
  }

  if (!userLimit) {
    // First request
    rateLimits.set(identifier, { timestamp: now, count: 1 });
    return false;
  }

  if (userLimit.count >= limit) {
    // Rate limited
    return true;
  }

  // Increment counter
  userLimit.count += 1;
  return false;
}