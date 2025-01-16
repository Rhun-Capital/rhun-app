'use client';

import React from 'react';
import { SettingsIcon, BookIcon, BotIcon, HomeIcon } from './icons';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { usePathname } from 'next/navigation';

export const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const { login, logout, authenticated, user } = usePrivy();
  const pathname = usePathname();

  // Safely get the display text for the user
  const userDisplay = React.useMemo(() => {
    if (!user) return '';
    if (user.email) return user.email.address;
    if (typeof user.wallet?.address === 'string') {
      const addr = user.wallet.address;
      return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    }
    return '';
  }, [user]);

  const navigation = [
    { name: 'Home', href: '/', icon: HomeIcon },
    ...(authenticated ? [
      { name: 'Agents', href: '/agents', icon: BotIcon },
      { name: 'Research', href: '/research', icon: BookIcon },
      { name: 'Settings', href: '/settings', icon: SettingsIcon },
    ] : []),
  ];

  return (
    <div className="flex h-screen dark:bg-zinc-900 text-zinc-400">
      <div className="w-64 dark:bg-zinc-900 text-zinc-400 shadow-lg flex flex-col border-r border-zinc-700">
        <div className="p-4 border-b border-zinc-700">
          <h1 className="text-xl font-bold text-white">
            R H U N
          </h1>
        </div>
        
        <nav className="p-4 flex-1">
          <ul className="space-y-2">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link 
                  href={item.href}
                  className={`flex items-center p-2 rounded transition-colors ${
                    pathname === item.href
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <item.icon />
                  <span className="ml-3">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>   
        
        <div className="p-4">
          {authenticated ? (
            <button 
              onClick={logout}
              className="w-full py-2 px-4 text-white font-semibold rounded outline outline-green-500"
            >
              Disconnect
            </button>
          ) : (
            <button 
              onClick={login}
              className="w-full py-2 px-4 text-white font-semibold rounded outline outline-green-500"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <header className="dark:bg-zinc-900 text-zinc-400 shadow-sm p-4 border-b border-zinc-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">&nbsp;</h2>
            {authenticated && userDisplay && (
              <div className="text-sm text-zinc-400">
                {userDisplay}
              </div>
            )}
          </div>
        </header>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};