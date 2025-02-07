'use client';

import React, { useState } from 'react';
import { MenuIcon, CloseIcon} from './icons';
import {HomeIcon, EyeIcon, SettingsIcon, ChartArea, BotIcon, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { getAccessToken, usePrivy } from '@privy-io/react-auth';
import { usePathname } from 'next/navigation';
import { RecentChats } from './recent-chats-component';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const { login, logout, authenticated, user, getAccessToken } = usePrivy();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const navigation = [
    { name: 'Home', href: '/', icon: HomeIcon },
    ...(authenticated ? [
      { name: 'Agents', href: '/agents', icon: BotIcon },
      { name: 'Watchers', href: '/watchers', icon: EyeIcon },
      { name: 'Portfolio', href: '/portfolio', icon: ChartArea },
      { name: 'Apps', href: '/marketplace', icon: LayoutGrid },
      { name: 'Settings', href: '/settings', icon: SettingsIcon },
    ] : []),
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  const clearCookies = async () => {
    const accessToken = await getAccessToken();
    await fetch('/api/clear-access', { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}` } });
  }

  return (
    <div className="flex h-screen bg-zinc-900 text-zinc-400">
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-zinc-800"
      >
        {isOpen ? <CloseIcon /> : <MenuIcon/>}
      </button>

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 transition-transform duration-300 ease-in-out
        w-64 bg-zinc-900 text-zinc-400 shadow-lg flex flex-col border-r border-zinc-700
      `}>
        <div className="p-4 border-b border-zinc-700 min-h-[61px]">
          <Link href='/' onClick={() => setIsOpen(false)}>
            <div className="flex items-center ml-2">
              <Image src="https://rhun.io/images/rhun-logo-gradient.svg" alt="Rhun Capital" height={124} width={124} className="pr-2 antialiased"/>
            </div>
          </Link>
        </div>
        
        <nav className="p-4 flex-1">
          <ul className="space-y-2 mb-5">
            {navigation.map((item) => (
              <li key={item.name}>
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
                    {item.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {authenticated && <RecentChats />}
        </nav>
          {}
       {pathname !== '/login' && <div className="p-4">
          {authenticated ? (
            <button 
              onClick={() => logout().then(() => router.push('/login'))}
              className="w-full py-2 px-4 text-white font-semibold rounded outline outline-indigo-500"
            >
              Disconnect
            </button>
          ) : (
            <button 
              onClick={login}
              className="w-full py-2 px-4 text-white font-semibold rounded outline outline-indigo-500"
            >
              Connect Wallet
            </button>
          )}
        </div> }

        {/* {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
        <button onClick={() => clearCookies()}>
          Clear Cookies
        </button>
      )} */}

      </div>



      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 overflow-auto bg-zinc-900">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};