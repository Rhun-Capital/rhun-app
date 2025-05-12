'use client';

import React, { useState, useEffect } from 'react';
import { MenuIcon, CloseIcon} from './icons';
import {HomeIcon, EyeIcon, CircleUser, ChartArea, BotIcon, LayoutGrid, BookIcon, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { getAccessToken, usePrivy } from '@privy-io/react-auth';
import { usePathname } from 'next/navigation';
import { RecentChats } from './recent-chats-component';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useModal } from '../contexts/modal-context';

export const Sidebar = () => {
  const { login, logout, authenticated, user, getAccessToken } = usePrivy();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { isAnyModalOpen } = useModal();
  const [unreadWatcherCount, setUnreadWatcherCount] = useState(0);

  const fetchUnreadCounts = async () => {
    if (!authenticated || !user?.id) return;
    
    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/watchers/unread-counts?userId=${encodeURIComponent(user.id)}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadWatcherCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };  

  
  // Fetch unread counts for notification badges
  useEffect(() => {
    fetchUnreadCounts();
    // Set up polling to check for new notifications every minute
    const intervalId = setInterval(fetchUnreadCounts, 60000);
    return () => clearInterval(intervalId);
  }, [authenticated, user]);  


  useEffect(() => {
    if (authenticated && user?.id) {
      fetchUnreadCounts();
    }
  }, [pathname]);

  const navigation = [
    { name: 'Tools', href: '/tools', icon: LayoutGrid },
    { name: 'Agents', href: '/agents', icon: BotIcon, requiresAuth: true },
    { name: 'Watchers', href: '/watchers', icon: EyeIcon, requiresAuth: true, badge: unreadWatcherCount > 0 ? unreadWatcherCount : null },
    // { name: 'Portfolio', href: '/portfolio', icon: ChartArea, requiresAuth: true },
    // { name: 'Apps', href: '/marketplace', icon: LayoutGrid, requiresAuth: true },
    { name: 'Account', href: '/account', icon: CircleUser, requiresAuth: true },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  const clearCookies = async () => {
    const accessToken = await getAccessToken();
    await fetch('/api/auth/clear-access', { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}` } });
  }

  const handleLogout = async () => {
    // clear localStorage.rhun_selected_wallet_address
    localStorage.removeItem('rhun_selected_wallet_address');
    await clearCookies(); // Clear access tokens
    await logout(); // Clear Privy state
    if (pathname === '/tools') {
      router.push('/tools');
    } else {
      router.push('/');
    }
  }

  return (
    <>
      {/* Mobile menu button - positioned outside the sidebar */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-[100] p-2 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors text-white"
        aria-label="Toggle menu"
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[90] lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div 
        className={`
          w-64 text-zinc-400 shadow-lg flex flex-col border-r border-zinc-700 bg-zinc-900
          lg:relative fixed inset-y-0 left-0
          transform transition-transform duration-300 ease-in-out
          ${isAnyModalOpen ? 'bg-black/50 backdrop-blur-sm' : 'z-[95]'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:min-h-screen
        `}
      >
        <div className="p-4 pt-6">
          <button
            onClick={() => {
              if (pathname === '/') {
                window.location.href = "/";
              } else {
                router.push("/");
              }
              setIsOpen(false);
            }}
            className="flex items-center pb-2 md:pb-0 ml-12 md:ml-2 max-h-6"
          >
            <Image src="https://rhun.io/images/rhun-logo-gradient.svg" alt="Rhun Capital" height={124} width={124} className="pr-2 antialiased"/>
          </button>
        </div>
        
        <nav className="p-4 flex-1">
          <ul className="space-y-2 mb-5">
            <li>
              <button 
                key="new-chat"
                onClick={() => {
                  setIsOpen(false);
                  setTimeout(() => {
                    if (pathname === '/') {
                      window.location.href = "/";
                    } else {
                      router.push("/");
                    }
                  }, 10);
                }}
                className="w-full flex items-center p-2 rounded transition-colors hover:bg-zinc-800 bg-indigo-400/10 border-indigo-400 border-2"
              >
                <div className="text-indigo-400">
                  <PlusCircle className="h-5 w-5"/>
                </div>
                <span className="text-white ml-3">New chat</span>
              </button>
            </li>
            {navigation.map((item) => (
              <li key={item.name}>
                {(!item.requiresAuth || authenticated) ? (
                  <Link 
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center p-2 rounded transition-colors ${
                      pathname === item.href
                        ? 'bg-zinc-800' 
                        : 'hover:bg-zinc-800'
                    }`}
                  >
                    <div className="text-zinc-400"> 
                      <item.icon className="h-5 w-5"/>                  
                    </div>
                    <span className={`${ 
                      pathname === item.href
                        ? 'text-white'
                        : 'text-white hover:text-white'
                    } ml-3`}>
                      
                      {item.badge ? (
                      <div className="flex items-center gap-2">
                         {item.name}
                        <div className="-top-1 -right-1 bg-indigo-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                      </div></div>): item.name}                      
                    </span>
                  </Link>
                ) : (
                  <div className="flex items-center p-2 cursor-not-allowed opacity-50">
                    <div className="text-zinc-600"> 
                      <item.icon className="h-5 w-5"/>                  
                    </div>
                    <span className="text-zinc-600 ml-3">
                      {item.name}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {authenticated && <RecentChats setIsOpen={setIsOpen} />}
        </nav>

        <div className="ml-4 w-[89%] hidden sm:block">
            <Link 
              href="https://rhun-capital.gitbook.io/"
              target="_blank"
              className='flex items-center p-2 rounded transition-colors hover:bg-zinc-800'
            >
              <div className="flex gap-3 items-center">
              <div className="text-zinc-400"> 
                <BookIcon className="h-5 w-5"/>
              </div>                  
              <div className="text-white">Documentation</div>
              </div>
              
              </Link>
          </div>


       <div className="p-4">
          {authenticated ? (
            <button 
              onClick={handleLogout}
              className="w-full py-2 px-4 text-white font-semibold rounded outline outline-indigo-400"
            >
              Disconnect
            </button>
          ) : (
            <button 
              onClick={login}
              className="w-full py-2 px-4 text-white font-semibold rounded outline outline-indigo-400"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </>
  );
};