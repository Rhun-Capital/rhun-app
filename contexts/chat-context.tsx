'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { debounce } from 'lodash';

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
  const [newChatId, setNewChatId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const fetchUserChats = async () => {
    const token = await getAccessToken();
    const response = await fetch(`/api/chat/recent?userId=${user?.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch user chats');
    
    const data = await response.json();
    return data.chats.map((chat: Chat) => ({ ...chat }));
  };

  // const fetchTemplateChats = async () => {
  //   const token = await getAccessToken();
  //   const response = await fetch(`/api/chat/recent?userId=template`, {
  //     headers: {
  //       'Authorization': `Bearer ${token}`
  //     }
  //   });
    
  //   if (!response.ok) throw new Error('Failed to fetch template chats');
    
  //   const data = await response.json();
  //   return data.chats.map((chat: Chat) => ({ ...chat, isTemplate: true }));
  // };

  const fetchRecentChats = async () => {
    try {
      
      
      // // Fetch both user and template chats in parallel
      // const [userChats, templateChats] = await Promise.all([
      //   user && user.id ? fetchUserChats() : Promise.resolve([]),
      //   fetchTemplateChats()
      // ]);

      const userChats = await fetchUserChats();

      // Combine and sort all chats by lastUpdated
      // const allChats = [...userChats, ...templateChats].sort(
      //   (a, b) => b.lastUpdated - a.lastUpdated
      // );

      const allChats = [...userChats].sort(
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

  useEffect(() => {
    if (newChatId && !chatId) {
      const url = new URL(window.location.href);
      url.searchParams.set('chatId', newChatId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [newChatId, chatId]);

  useEffect(() => {
    const resizeTextarea = () => {
      if (inputRef.current) {
        // Reset height to auto to get the correct scrollHeight
        inputRef.current.style.height = 'auto';
        // Set the height to match the scrollHeight (content height)
        const scrollHeight = inputRef.current.scrollHeight;
        inputRef.current.style.height = `${Math.min(scrollHeight, 150)}px`;
      }
    };
    
    resizeTextarea();
    
    // Create a debounced version of the resize function
    const debouncedResize = debounce(resizeTextarea, 50);
    
    // Add event listener for window resize
    window.addEventListener('resize', debouncedResize);
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      debouncedResize.cancel();
    };
  }, [inputRef]); // Re-run when inputRef changes

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