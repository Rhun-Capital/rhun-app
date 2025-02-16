import './globals.css';
import { AuthWrapper } from '@/components/auth-wrapper'
import PrivyWrapper from '@/components/privy-provider';
import { Toaster } from 'sonner';
import { Analytics } from "@vercel/analytics/react"
import { ModalProvider } from '@/contexts/modal-context';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <PrivyWrapper>
          <AuthWrapper>
            <ModalProvider>
              {children}
            </ModalProvider>
          </AuthWrapper>
        </PrivyWrapper>
        <Analytics/>
      </body>
    </html>
  );
}