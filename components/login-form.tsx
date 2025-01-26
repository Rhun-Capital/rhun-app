// components/LoginForm.tsx
interface LoginFormProps {
  token: string;
  setToken: (token: string) => void;
  error: string | null;
  isLoading: boolean;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ token, setToken, error, isLoading, handleSubmit }) => (
    <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="token" className="sr-only">Access Key</label>
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
      {error && <div className="text-red-400 text-xs sm:text-sm text-center">{error}</div>}
      <button type="submit" className="group relative w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-colors">
        {!isLoading ? 'Verify Key' : 'Verifying...'}
      </button>
    </form>
   );

export default LoginForm;