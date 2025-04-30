import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import LoadingIndicator from './loading-indicator';
import { Markdown } from "@/components/markdown";

interface Chat {
  chatId: string;
  agentId: string;
  agentName: string;
  lastMessage: string;
  lastUpdated: number;
  isTemplate: boolean;
}

const formatTimeAgo = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export const RecentChatsPage = () => {
  const { user, getAccessToken } = usePrivy();
  const [searchQuery, setSearchQuery] = useState('');
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

  // Filter chats based on search query
  const filteredChats = chats.filter(chat => { 
    const agentNameMatch = chat.agentName ? chat.agentName.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const lastMessageMatch = chat.lastMessage ? chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    return agentNameMatch || lastMessageMatch;
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-white mb-8">Recent Chats</h1>
        <div className="text-zinc-400"><LoadingIndicator /></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-white mb-8">Recent Chats</h1>
      
      {/* Search bar */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-5 pr-4 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-700 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Chats list */}
      <div className="space-y-2 overflow-y-auto flex-1">
        {filteredChats.map((chat) => (
          <button
            key={chat.chatId}
            onClick={() => {
              router.push(`/agents/${chat.isTemplate ? 'template' : user?.id}/${chat.agentId}?chatId=${chat.chatId}`)
              router.refresh();
            }}
            className="w-full flex items-center gap-3 p-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors text-left group"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-300 mb-1">
                {chat.agentName}
              </div>
              <div className="text-sm text-zinc-500 line-clamp-2">
              <Markdown>{chat.lastMessage}</Markdown>
              </div>
            </div>
            <div className="text-xs text-zinc-600 whitespace-nowrap">
              {formatTimeAgo(chat.lastUpdated)}
            </div>
          </button>
        ))}

        {filteredChats.length === 0 && (
          <div className="text-center py-8">
            <p className="text-zinc-400">
              {searchQuery
                ? 'No chats found matching your search'
                : 'No recent chats'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};