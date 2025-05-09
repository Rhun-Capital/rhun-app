'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
  refreshRecentChats: () => void;
}

const ChatContext = createContext<ChatContextType>({
  recentChats: [],
  refreshRecentChats: () => {}
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, getAccessToken } = usePrivy();
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const FETCH_COOLDOWN = 5000; // 5 seconds cooldown between fetches
  const [newChatId, setNewChatId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const fetchRecentChats = useCallback(async () => {
    // Skip if we fetched recently
    const now = Date.now();
    if (now - lastFetchTime < FETCH_COOLDOWN) {
      return;
    }

    if (!user?.id) return;

    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/chat/recent?userId=${encodeURIComponent(user.id)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch recent chats');
      
      const data = await response.json();
      setRecentChats(data.chats || []);
      setLastFetchTime(now);
    } catch (error) {
      console.error('Error fetching recent chats:', error);
    }
  }, [user?.id, getAccessToken, lastFetchTime]);

  // Debounce the fetch function
  const debouncedFetchRecentChats = useMemo(
    () => debounce(fetchRecentChats, 1000),
    [fetchRecentChats]
  );

  useEffect(() => {
    if (user?.id) {
      debouncedFetchRecentChats();
    }
    return () => {
      debouncedFetchRecentChats.cancel();
    };
  }, [user?.id, debouncedFetchRecentChats]);

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
    refreshRecentChats: debouncedFetchRecentChats
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