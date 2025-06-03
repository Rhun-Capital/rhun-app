import React, { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import ImageUpload from './image-upload';
import { TokenTabProps, TokenData } from '../types/token';

export default function TokenTab({ agentId }: TokenTabProps) {
  const { getAccessToken } = usePrivy();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [tokenData, setTokenData] = useState<TokenData>({
    tokenName: '',
    tokenTicker: '',
    tokenDescription: '',
    twitter: '',
    website: '',
    telegram: '',
    twitch: '',
    isAntiPvp: false
  });

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setTokenData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const accessToken = await getAccessToken();
      
      // Create form data for the token
      const formData = new FormData();
      if (imageFile) {
        formData.append('image', imageFile);
      }
      formData.append('data', JSON.stringify(tokenData));

      const response = await fetch('/api/tokens/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to create token');
      }

      const data = await response.json();
      setMessage('Token created successfully!');
      toast.success('Token created successfully!');
      
      // Reset form
      setTokenData({
        tokenName: '',
        tokenTicker: '',
        tokenDescription: '',
        twitter: '',
        website: '',
        telegram: '',
        twitch: '',
        isAntiPvp: false
      });
      setImageFile(null);
    } catch (error) {
      console.error('Error creating token:', error);
      setMessage('Error creating token');
      toast.error('Failed to create token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.includes('Error') 
            ? 'bg-red-900/50 border border-red-500' 
            : 'bg-green-900/50 border border-green-500'
        }`}>
          <div className="flex-1">
            <div className="flex align-center gap-2 items-center">
              {message.includes('Error') && <AlertCircle/>}
              <p className="text-white text-sm">
                {message}
              </p>
            </div>
          </div>
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}

      <div className="border-b border-zinc-700 pb-4">
        <h2 className="text-lg font-semibold">Create Token</h2>
        <p className="text-sm text-zinc-400">Launch a new token using the Gochu SDK</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-6 bg-zinc-800 bg-opacity-40 border border-zinc-700 rounded-lg">
          <h3 className="text-md font-medium mb-4">Token Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Token Name</label>
              <input
                type="text"
                name="tokenName"
                value={tokenData.tokenName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 rounded-lg bg-zinc-700 bg-opacity-40 border border-zinc-700 text-white placeholder-zinc-400"
                placeholder="Enter token name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Token Ticker</label>
              <input
                type="text"
                name="tokenTicker"
                value={tokenData.tokenTicker}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 rounded-lg bg-zinc-700 bg-opacity-40 border border-zinc-700 text-white placeholder-zinc-400"
                placeholder="Enter token ticker (e.g., MTK)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                name="tokenDescription"
                value={tokenData.tokenDescription}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full px-4 py-2 rounded-lg bg-zinc-700 bg-opacity-40 border border-zinc-700 text-white placeholder-zinc-400"
                placeholder="Enter token description"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-zinc-800 bg-opacity-40 border border-zinc-700 rounded-lg">
          <h3 className="text-md font-medium mb-4">Social Links</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Twitter</label>
              <input
                type="url"
                name="twitter"
                value={tokenData.twitter}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-zinc-700 bg-opacity-40 border border-zinc-700 text-white placeholder-zinc-400"
                placeholder="https://twitter.com/your-token"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Website</label>
              <input
                type="url"
                name="website"
                value={tokenData.website}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-zinc-700 bg-opacity-40 border border-zinc-700 text-white placeholder-zinc-400"
                placeholder="https://your-token-website.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Telegram</label>
              <input
                type="url"
                name="telegram"
                value={tokenData.telegram}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-zinc-700 bg-opacity-40 border border-zinc-700 text-white placeholder-zinc-400"
                placeholder="https://t.me/your-token"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Twitch</label>
              <input
                type="url"
                name="twitch"
                value={tokenData.twitch}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-zinc-700 bg-opacity-40 border border-zinc-700 text-white placeholder-zinc-400"
                placeholder="https://twitch.tv/your-token"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-zinc-800 bg-opacity-40 border border-zinc-700 rounded-lg">
          <h3 className="text-md font-medium mb-4">Token Image</h3>
          <ImageUpload
            onImageChange={handleImageChange}
            initialImage={imageFile ? URL.createObjectURL(imageFile) : undefined}
          />
        </div>

        <div className="p-6 bg-zinc-800 bg-opacity-40 border border-zinc-700 rounded-lg">
          <h3 className="text-md font-medium mb-4">Token Settings</h3>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="isAntiPvp"
              checked={tokenData.isAntiPvp}
              onChange={handleInputChange}
              className="form-checkbox bg-zinc-700 border-zinc-600 text-indigo-500 rounded"
            />
            <label className="text-sm text-zinc-400">Enable Anti-PVP Protection</label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Creating Token...' : 'Create Token'}
          </button>
        </div>
      </form>
    </div>
  );
} 