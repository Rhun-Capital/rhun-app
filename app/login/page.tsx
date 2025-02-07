// pages/login.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import LoginForm from '@/components/login-form'
import { NFTCheckout } from '@/components/nft-checkout'
import WalletConnection from '@/components/wallet-connection';
import Image from 'next/image';

export default function LoginPage() {
 const [token, setToken] = useState('')
 const [error, setError] = useState('')
 const [isLoading, setIsLoading] = useState(false)
 const { user, ready, getAccessToken } = usePrivy()
 const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID as string

 const handleSubmit = async (e: React.FormEvent) => {
   e.preventDefault()
   setError('')
   setIsLoading(true)
   try {
      const accessToken = await getAccessToken()
     const response = await fetch('/api/auth/token', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
       body: JSON.stringify({ token }),
     })
     if (response.ok) {
       window.location.href = '/'
     } else {
       const data = await response.json()
       setError(data.message || 'Invalid token or this token has already been verified.')
     }
   } catch (error) {
     setError('An error occurred. Please try again.')
     setIsLoading(false)
   }
 }

 return (
  <div className="min-h-screen flex items-center bg-zinc-900 justify-center p-4">
    <div className="w-full max-w-md space-y-6 p-6 sm:p-8 bg-zinc-800/50 rounded-lg shadow-2xl backdrop-blur">
      <div className="flex justify-center">
        <Image 
          src="https://rhun.io/images/rhun-logo-gradient.svg" 
          alt="Rhun Capital" 
          height={100} 
          width={100} 
          className="antialiased w-32 sm:w-40" // Responsive logo size
        />
      </div>      
  
      <WalletConnection />

      {user && ready && (
        <div className="space-y-6">
          <LoginForm 
            token={token}
            setToken={setToken}
            error={error}
            isLoading={isLoading}
            handleSubmit={handleSubmit}
          />

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600/30"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-zinc-800 text-gray-400 text-sm">Or</span>
            </div>
          </div>

          <div className="text-center">
            <NFTCheckout collectionId={collectionId} />
          </div> 
        </div>
      )}
    </div>
  </div>
)
}