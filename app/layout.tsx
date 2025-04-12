"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import PrivyWrapper from "@/components/privy-provider";
import { ChatProvider } from "@/contexts/chat-context";
import { ModalProvider } from "@/contexts/modal-context";
import { Sidebar } from "@/components/sidebar";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ModalProvider>
          <PrivyWrapper>
            <ChatProvider>
                <div className="flex h-screen bg-zinc-900">
                  
                    <main className="flex-1 overflow-y-auto">
                    <Sidebar>
                      {children}
                      </Sidebar>
                    </main>
                  
                </div>
                <Toaster />
            </ChatProvider>
          </PrivyWrapper>
        </ModalProvider>
      </body>
    </html>
  );
}