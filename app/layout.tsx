import './globals.css';
import AuthProvider from '@/components/auth-provider';
import { Sidebar } from '@/components/sidebar';
import { ChatProvider } from '@/contexts/chat-context';
import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        
        <AuthProvider>
          <ChatProvider>
            <Sidebar>
              {children}
              <Toaster 
                toastOptions={{
                  className: 'bg-zinc-800 text-white border border-zinc-700'
                }}/>
            </Sidebar>
          </ChatProvider>
        </AuthProvider>
        
      </body>
    </html>
  );
}