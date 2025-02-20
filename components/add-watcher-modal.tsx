import React, { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { X, Tag, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface TrackingFilters {
  minAmount?: number;
  specificToken?: string;
  platform?: string[];
  activityTypes?: string[];
  sort_by?: string;
  sort_order?: string;
}

interface AddWatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => Promise<void>;
}

const AddWatcherModal: React.FC<AddWatcherModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { getAccessToken, user } = usePrivy();
  const [isLoading, setIsLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [name, setName] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<TrackingFilters>({
    activityTypes: ['ACTIVITY_TOKEN_SWAP', 'ACTIVITY_AGG_TOKEN_SWAP'],
    minAmount: 0,
    platform: [],
    specificToken: '',
    sort_by: 'block_time',
    sort_order: 'desc'
  });

  const handleFilterChange = (key: keyof TrackingFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle tag input - adds tags when user presses Enter or comma
  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  // Add tag from input
  const addTag = () => {
    if (!tagsInput.trim()) return;
    
    // Split by comma for multiple tags added at once
    const newTags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag && !tags.includes(tag));
    
    if (newTags.length > 0) {
      setTags([...tags, ...newTags]);
      setTagsInput('');
    }
  };

  // Remove a tag
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      toast.error('Please enter a wallet address');
      return;
    }

    setIsLoading(true);
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/tools/track-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          walletAddress,
          userId: user?.id,
          name: name.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
          filters
        })
      });
      
      if (!response.ok) throw new Error('Failed to create watcher');
      
      toast.success('Watcher created successfully');
      if (onSuccess) await onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating watcher:', error);
      toast.error('Failed to create watcher');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-50 w-full max-w-2xl bg-zinc-900 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-white">Add New Watcher</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name Input (New) */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Name (Optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 text-white focus:outline-none focus:border-indigo-500"
              placeholder="Enter a descriptive name"
            />
          </div>

          {/* Wallet Address Input */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Wallet Address</label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 text-white focus:outline-none focus:border-indigo-500"
              placeholder="Enter wallet address"
              required
            />
          </div>

          {/* Tags Input (New) */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Tags (Optional)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <div key={tag} className="bg-indigo-900/30 text-indigo-200 px-2 py-1 rounded-md flex items-center text-sm">
                  <Tag size={12} className="mr-1 text-indigo-300" />
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 text-indigo-300 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center">
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyDown={handleTagInput}
                onBlur={addTag}
                placeholder="Add tags (comma or enter to separate)"
                className="flex-1 px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={addTag}
                className="ml-2 p-2 bg-zinc-800 rounded-lg border border-zinc-700 text-indigo-400 hover:text-indigo-300 transition-colors"
                disabled={!tagsInput.trim()}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white">Tracking Filters</h3>
            
            {/* Minimum Amount Filter */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Minimum Amount (USD)</label>
              <input
                type="number"
                min="0"
                value={filters.minAmount}
                onChange={(e) => handleFilterChange('minAmount', parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Specific Token Filter */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Specific Token Address (Optional)</label>
              <input
                type="text"
                value={filters.specificToken}
                onChange={(e) => handleFilterChange('specificToken', e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 text-white focus:outline-none focus:border-indigo-500"
                placeholder="Enter token address"
              />
            </div>

            {/* Activity Types Filter */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Activity Types</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  'ACTIVITY_TOKEN_SWAP',
                  'ACTIVITY_AGG_TOKEN_SWAP',
                  'ACTIVITY_TOKEN_ADD_LIQ',
                  'ACTIVITY_TOKEN_REMOVE_LIQ'
                ].map((type) => (
                  <label key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.activityTypes?.includes(type)}
                      onChange={(e) => {
                        const types = e.target.checked
                          ? [...(filters.activityTypes || []), type]
                          : (filters.activityTypes || []).filter(t => t !== type);
                        handleFilterChange('activityTypes', types);
                      }}
                      className="form-checkbox bg-zinc-800 border-zinc-700 text-indigo-500 rounded"
                    />
                    <span className="text-sm text-zinc-400">
                      {type.replace('ACTIVITY_', '')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Watcher...' : 'Create Watcher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddWatcherModal;