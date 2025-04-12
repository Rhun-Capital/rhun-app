import React, { useEffect, useState, Dispatch, SetStateAction } from 'react';
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
  isTemplate?: boolean;
}

interface RecentChatsProps {
  maxVisible?: number;
  setIsOpen?: Dispatch<SetStateAction<boolean>>;
}

function formatTimeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export const RecentChats = ({ maxVisible = 3, setIsOpen }: RecentChatsProps) => {
  const { user } = usePrivy();
  const router = useRouter();
  const { recentChats } = useRecentChats();
  
  // Log when component mounts to verify props
  useEffect(() => {
    console.log("RecentChats mounted with setIsOpen:", setIsOpen ? "function provided" : "no function");
  }, [setIsOpen]);

  // No longer checking for user here since we want to show template chats even when logged out
  if (!recentChats || recentChats.length === 0) {
    return (
      <div className="p-4">
        <div className="text-sm text-zinc-500">No recent chats</div>
      </div>
    );
  }

  const visibleChats = recentChats.slice(0, maxVisible);
  const hasMore = recentChats.length > maxVisible;

  const navigateToChat = (chat: Chat) => {
    const userId = chat.isTemplate ? 'template' : user?.id;
    const path = `/agents/${userId}/${chat.agentId}?chatId=${chat.chatId}`;
    if (setIsOpen) {
      setIsOpen(false);
    }
    // Short delay to ensure the sidebar closes before navigating
    setTimeout(() => {
      router.push(path);
      router.refresh();
    }, 10);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-zinc-400">Recent Chats</h3>
      </div>

      <div className="space-y-1 mb-3">
        {visibleChats.map((chat) => (
          <button
            key={chat.chatId}
            onClick={() => navigateToChat(chat)}
            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800 transition-colors text-left group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-zinc-300 truncate">
                  {chat.agentName}
                </div>
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
          onClick={() => {
            console.log("View all clicked, setIsOpen:", !!setIsOpen);
            if (setIsOpen) {
              setIsOpen(false);
              console.log("setIsOpen called with false from View all");
            }
          }}
        >
          View all &rarr;
        </Link>
      )}          
    </div>
  );
};