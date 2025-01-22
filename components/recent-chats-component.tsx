'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquareIcon } from '@/components/icons';
import { usePrivy } from '@privy-io/react-auth';
import { useRecentChats } from '@/contexts/chat-context';

function formatTimeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export const RecentChats = () => {
  const { user } = usePrivy();
  const router = useRouter();
  const { recentChats } = useRecentChats();

  // Add console.log to debug
  console.log('Recent chats from context:', recentChats);

  if (!user) {
    return null;
  }

  if (!recentChats || recentChats.length === 0) {
    return (
      <div className="p-4">
        <div className="text-sm text-zinc-500">No recent chats</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-zinc-400 mb-2">Recent Chats</h3>
      <div className="space-y-1">
        {recentChats.map((chat) => (
          <button
            key={chat.chatId}
            onClick={() => router.push(`/agents/${user?.id}/${chat.agentId}?chatId=${chat.chatId}`)}
            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800 transition-colors text-left group"
          >
            <MessageSquareIcon />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-300 truncate">
                {chat.agentName}
              </div>
              <div className="text-xs text-zinc-500 truncate">
                {chat.lastMessage}
              </div>
            </div>
            <div className="text-xs text-zinc-600">
              {formatTimeAgo(chat.lastUpdated)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};