export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
        <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
    </div>
  );
} 