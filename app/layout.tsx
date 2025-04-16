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

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${inter.className} h-full overflow-hidden`}>
        <ModalProvider>
          <PrivyWrapper>
            <ChatProvider>
              <div className="flex h-full bg-zinc-900">
                <Sidebar>
                  {children}
                </Sidebar>
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