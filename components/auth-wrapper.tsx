// components/auth-wrapper.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { usePathname } from 'next/navigation'
interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, ready, authenticated, getAccessToken } = usePrivy()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function checkAuthorization() {
      console.log('Auth state:', { ready, authenticated, pathname });
      
      if (!ready || !authenticated) {
        setIsAuthorized(false);
        return;
      }
      
      try {
        const response = await fetch('/api/auth/verify')
        console.log('Verify response:', response);
        
        if (response.ok) {
          setIsAuthorized(true)
        } else {
          setIsAuthorized(false)
          if (pathname !== '/login') {
            router.push('/login')
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        setIsAuthorized(false)
        if (pathname !== '/login') {
          router.push('/login')
        }
      }
    }
  
    checkAuthorization()
  }, [ready, authenticated, router, pathname])

  
  if (!ready || isAuthorized === null) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
    </div>
  }

// Allow rendering children on login page even when not authorized
if (!isAuthorized && pathname !== '/login') {
  return null;
}

  return <>{children}</>
}