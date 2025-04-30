'use client';

import { Sidebar } from './sidebar';

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-row h-full w-full bg-zinc-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-hidden h-full">
        {children}
      </div>
    </div>
  );
}