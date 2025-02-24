'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { usePathname } from 'next/navigation'

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { ready, authenticated } = usePrivy()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (ready && !authenticated && pathname !== '/login') {
      router.push('/login')
    }
  }, [ready, authenticated, router, pathname])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {/* <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" /> */}
        <div className="animate-pulse flex flex-col items-center gap-1 justify-center">
          <div className="text-sm text-zinc-500">Loading</div>
        </div>
      </div>
    )
  }

  // Allow rendering children on login page even when not authenticated
  if (!authenticated && pathname !== '/login') {
    return null
  }

  return <>{children}</>
}