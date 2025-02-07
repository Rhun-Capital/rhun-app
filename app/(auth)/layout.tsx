import '../globals.css';
import { AuthWrapper } from '@/components/auth-wrapper'
import PrivyWrapper from '@/components/privy-provider';
import { Sidebar } from '@/components/sidebar';
import { ChatProvider } from '@/contexts/chat-context';
import { Toaster } from 'sonner';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (

      <PrivyWrapper>
        <AuthWrapper>
          <ChatProvider>
            <Sidebar>
              {children}
              <Toaster 
                toastOptions={{
                  className: 'bg-zinc-800 text-white border border-zinc-700'
                }}/>
            </Sidebar>
          </ChatProvider>
        </AuthWrapper>
      </PrivyWrapper>


  );
}