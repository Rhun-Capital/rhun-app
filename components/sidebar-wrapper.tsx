'use client';

import { Sidebar } from './sidebar';

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
  return <Sidebar>{children}</Sidebar>;
}