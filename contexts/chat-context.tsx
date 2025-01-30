'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface Chat {
  chatId: string;
  agentId: string;
  agentName: string;
  lastMessage: string;
  lastUpdated: number;
  isTemplate?: boolean;
}

interface ChatContextType {
  recentChats: Chat[];
  refreshRecentChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, getAccessToken } = usePrivy();
  const [recentChats, setRecentChats] = useState<Chat[]>([]);

  const fetchUserChats = async () => {
    const token = await getAccessToken();
    const response = await fetch(`/api/chat/recent?userId=${user?.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch user chats');
    
    const data = await response.json();
    return data.chats.map((chat: Chat) => ({ ...chat, isTemplate: false }));
  };

  const fetchTemplateChats = async () => {
    const token = await getAccessToken();
    const response = await fetch(`/api/chat/recent?userId=template`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch template chats');
    
    const data = await response.json();
    return data.chats.map((chat: Chat) => ({ ...chat, isTemplate: true }));
  };

  const fetchRecentChats = async () => {
    try {
      
      
      // Fetch both user and template chats in parallel
      const [userChats, templateChats] = await Promise.all([
        user && user.id ? fetchUserChats() : Promise.resolve([]),
        fetchTemplateChats()
      ]);

      // Combine and sort all chats by lastUpdated
      const allChats = [...userChats, ...templateChats].sort(
        (a, b) => b.lastUpdated - a.lastUpdated
      );

      setRecentChats(allChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  useEffect(() => {
    fetchRecentChats();
  }, [user?.id]);

  const contextValue = {
    recentChats,
    refreshRecentChats: fetchRecentChats
  };

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