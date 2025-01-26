'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const response = await fetch('/api/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })
      if (response.ok) {
        router.refresh()
        router.replace('/')
      } else {
        const data = await response.json()
        setError(data.message || 'Invalid token or this token has already been verified.')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    }  finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center dark:bg-zinc-900 justify-center">
      <div className="max-w-md w-full space-y-8 p-4 sm:p-8 dark:bg-zinc-800 rounded-lg shadow-xl border ">
        <div>
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-white">Enter Access Key</h2>
        </div>
        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="token" className="sr-only">
              Access Key
            </label>
            <input
              id="token"
              name="token"
              type="text"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 sm:py-3 border border-gray-600 bg-zinc-700 placeholder-gray-400 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 text-sm sm:text-base"
              placeholder="Enter your access key"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-red-400 text-xs sm:text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-colors"
            >
              {!isLoading ? 'Verify Key' : 'Verifying...'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}