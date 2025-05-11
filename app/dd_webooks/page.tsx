'use client';

import { WebhookManager } from '@/components/webhook-manager';

export default function WebhooksPage() {
  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Webhook Manager</h1>
        <WebhookManager />
      </div>
    </div>
  );
} 