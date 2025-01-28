import './globals.css';
import AuthProvider from '@/components/auth-provider';
import { Sidebar } from '@/components/sidebar';
import { ChatProvider } from '@/contexts/chat-context';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-zinc-900">
      <body>
        
        <AuthProvider>
          <ChatProvider>
            <Sidebar>{children}</Sidebar>
          </ChatProvider>
        </AuthProvider>
        
      </body>
    </html>
  );
}