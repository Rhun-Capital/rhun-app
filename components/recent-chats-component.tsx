// components/recent-chats.tsx
import React, { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { MessageSquareIcon } from '@/components/icons';
import Link from 'next/link';
import { useRecentChats } from '@/contexts/chat-context';

interface Chat {
  chatId: string;
  agentId: string;
  agentName: string;
  lastMessage: string;
  lastUpdated: number;
}

function formatTimeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export const RecentChats = ({ maxVisible = 3 }) => {
  const { user } = usePrivy();
  const router = useRouter();
  const { recentChats } = useRecentChats();

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

  // Only show first maxVisible chats
  const visibleChats = recentChats.slice(0, maxVisible);
  const hasMore = recentChats.length > maxVisible;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-zinc-400">Recent Chats</h3>
      </div>

      <div className="space-y-1 mb-3">
        {visibleChats.map((chat) => (
          <button
            key={chat.chatId}
            onClick={() => {
              router.push(`/agents/${user?.id}/${chat.agentId}?chatId=${chat.chatId}`)
              router.refresh();
            }}
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
      {hasMore && (
          <Link 
            href="/recent-chats" 
            className="text-xs text-zinc-400 hover:text-indigo-300 flex items-center"
          >
            View all &rarr;
          </Link>
        )}          
    </div>
  );
};