// pages/login.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoginForm from '@/components/login-form'
import { NFTCheckout } from '@/components/nft-checkout'
import WalletConnection from '@/components/wallet-connection';


export default function LoginPage() {
 const [token, setToken] = useState('')
 const [error, setError] = useState('')
 const [isLoading, setIsLoading] = useState(false)
 const router = useRouter()
 const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID as string

 const handleSubmit = async (e: React.FormEvent) => {
   e.preventDefault()
   setError('')
   setIsLoading(true)
   try {
     const response = await fetch('/api/verify-token', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
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
   } finally {
     setIsLoading(false)
   }
 }

 return (
   <div className="min-h-screen flex items-center bg-zinc-900 justify-center">
     <div className="max-w-md w-full space-y-8 p-4 sm:p-8 bg-zinc-800 rounded-lg shadow-xl border">
       <h2 className="text-center text-2xl sm:text-3xl font-bold text-white">Access Platform</h2>
       
       <LoginForm 
         token={token}
         setToken={setToken}
         error={error}
         isLoading={isLoading}
         handleSubmit={handleSubmit}
       />

       {/* <div className="text-center">
         <div className="relative">
           <div className="absolute inset-0 flex items-center">
             <div className="w-full border-t border-gray-600"></div>
           </div>
           <div className="relative flex justify-center">
             <span className="px-2 bg-zinc-800 text-gray-400">Or</span>
           </div>
         </div>
       </div> */}

       {/* <WalletConnection />

      <div className="text-center">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-2 bg-zinc-800 text-gray-400">Or</span>
          </div>
        </div>
      </div>


       <div className="text-center flex flex-col items-center">
         <h3 className="text-white mb-4">Access with Fast Pass NFT</h3>
         <NFTCheckout collectionId={collectionId} />
       </div> */}
       
     </div>
     
   </div>
 )
}