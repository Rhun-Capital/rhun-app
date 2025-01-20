// components/recent-chats.tsx
import React, { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { MessageSquareIcon } from '@/components/icons';

interface Chat {
  chatId: string;
  agentId: string;
  agentName: string;
  lastMessage: string;
  lastUpdated: number;
}

export const RecentChats = () => {
  const { user, getAccessToken } = usePrivy();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchRecentChats = async () => {
      if (!user?.id) return;
      
      try {
        const token = await getAccessToken();
        const response = await fetch(`/api/chat/recent?userId=${user.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch chats');
        
        const data = await response.json();
        setChats(data.chats);
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentChats();
  }, [user?.id, getAccessToken]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-sm text-zinc-500">Loading recent chats...</div>
      </div>
    );
  }

  if (chats.length === 0) {
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
        {chats.map((chat) => (
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

function formatTimeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}