"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react"
import PrivyWrapper from "@/components/privy-provider";
import { ChatProvider } from "@/contexts/chat-context";
import { ModalProvider } from "@/contexts/modal-context";
import { Sidebar } from "@/components/sidebar";
import Head from 'next/head';
import { useEffect, useState } from 'react';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${mounted ? inter.className : ''} h-full`}>
        <ModalProvider>
          <PrivyWrapper>
            <ChatProvider>
              <div className="flex flex-row h-full w-full bg-zinc-900 relative">
                <Sidebar />
                <div className="flex-1 h-full w-full overflow-y-auto">
                  {children}
                </div>
              </div>
              <Toaster />
            </ChatProvider>
          </PrivyWrapper>
        </ModalProvider>
        <Analytics/>
      </body>
    </html>
  );
}