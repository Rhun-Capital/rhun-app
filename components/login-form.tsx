// components/LoginForm.tsx
import React from 'react';
import { LoginFormProps } from '../types/ui';

const LoginForm: React.FC<LoginFormProps> = ({
  token,
  setToken,
  error,
  isLoading,
  handleSubmit
}) => {
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="token" className="block text-sm font-medium text-gray-300">
          API Token
        </label>
        <input
          type="password"
          id="token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="mt-1 block w-full rounded-md bg-zinc-800 border-zinc-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Enter your API token"
          required
        />
      </div>
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {isLoading ? 'Loading...' : 'Login'}
      </button>
    </form>
  );
};

export default LoginForm;