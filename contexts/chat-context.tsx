'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface Chat {
  chatId: string;
  agentId: string;
  agentName: string;
  lastMessage: string;
  lastUpdated: number;
}

interface ChatContextType {
  recentChats: Chat[];
  refreshRecentChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, getAccessToken } = usePrivy();
  const [recentChats, setRecentChats] = useState<Chat[]>([]);

  const fetchRecentChats = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }
    
    try {
      console.log('Fetching recent chats for user:', user.id);
      const token = await getAccessToken();
      const response = await fetch(`/api/chat/recent?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch chats');
      
      const data = await response.json();
      console.log('Fetched chats:', data.chats);
      setRecentChats(data.chats);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  useEffect(() => {
    console.log('ChatProvider useEffect triggered', { userId: user?.id });
    fetchRecentChats();
  }, [user?.id, getAccessToken]);

  const contextValue = {
    recentChats,
    refreshRecentChats: fetchRecentChats
  };

  console.log('ChatProvider rendering with chats:', recentChats);

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

export function useRecentChats() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useRecentChats must be used within a ChatProvider');
  }
  return context;
}