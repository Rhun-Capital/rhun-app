import './globals.css';
import AuthProvider from '@/components/auth-provider';
import { Sidebar } from '@/components/sidebar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>
          <Sidebar>{children}</Sidebar>
        </AuthProvider>
      </body>
    </html>
  );
}