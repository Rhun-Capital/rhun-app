// First, create a separate TrackWalletModal component
import React, { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Loader2, X, Tag as TagIcon } from 'lucide-react';
import { toast } from 'sonner';

interface TrackingFilters {
  minAmount?: number;
  specificToken?: string;
  platform?: string[];
  activityTypes?: string[];
  sort_by?: string;
  sort_order?: string;
}

interface TrackWalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void; 
    walletAddress: string;
    userId: string;
  }

const TrackWalletModal: React.FC<TrackWalletModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  walletAddress,
  userId
}) => {
  const { getAccessToken } = usePrivy();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for form fields
  const [name, setName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
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

  // Tag handling functions
  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    
    // Split by comma for multiple tags added at once
    const newTags = tagInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag && !tags.includes(tag));
    
    if (newTags.length > 0) {
      setTags([...tags, ...newTags]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
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
          userId,
          filters,
          name: name.trim() || null,
          tags: tags.length > 0 ? tags : null
        })
      });
      
      if (!response.ok) throw new Error('Failed to start tracking');
      
      toast.success('Wallet tracking started successfully');
      
      onSuccess();

      
      onClose();
    } catch (error) {
      console.error('Error tracking wallet:', error);
      toast.error('Failed to track wallet');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-zinc-700">
          <h2 className="text-lg sm:text-xl font-semibold text-white">Track Wallet</h2>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-2"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Wallet Address (non-editable) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Wallet Address</label>
              <div className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-400 font-mono text-sm">
                {walletAddress}
              </div>
            </div>

            {/* Wallet Identity Section */}
            <div>
              <h3 className="text-base font-medium text-white mb-4">Wallet Identity</h3>
              
              {/* Wallet Name */}
              <div className="space-y-2 mb-4">
                <label className="text-sm text-zinc-400">Wallet Name (Optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`Wallet ${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`}
                  className="w-full px-3 py-2 bg-zinc-900 rounded-lg border border-zinc-700 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              
              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Tags (Optional)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <div key={tag} className="bg-indigo-900/50 text-indigo-200 px-2 py-1 rounded-md flex items-center text-sm">
                      <TagIcon size={12} className="mr-1" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-indigo-300 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInput}
                    onBlur={addTag}
                    placeholder="Add tags (comma or enter to separate)"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Tags help you organize and search for wallets
                </p>
              </div>
            </div>
            
            {/* Alert Settings Section */}
            <div>
              <h3 className="text-base font-medium text-white mb-4">Alert Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Minimum Amount Filter */}
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Minimum Amount (USD)</label>
                  <input
                    type="number"
                    min="0"
                    value={filters.minAmount}
                    onChange={(e) => handleFilterChange('minAmount', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-900 rounded-lg border border-zinc-700 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-zinc-500">
                    Only alert for transactions above this amount
                  </p>
                </div>

                {/* Specific Token Filter */}
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Specific Token Address (Optional)</label>
                  <input
                    type="text"
                    value={filters.specificToken}
                    onChange={(e) => handleFilterChange('specificToken', e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 rounded-lg border border-zinc-700 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Enter token address"
                  />
                  <p className="text-xs text-zinc-500">
                    Only alert for transactions involving this token
                  </p>
                </div>
              </div>

              {/* Activity Types Filter */}
              <div className="space-y-2 mt-4">
                <label className="text-sm text-zinc-400">Activity Types</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { value: 'ACTIVITY_TOKEN_SWAP', label: 'Token Swap' },
                    { value: 'ACTIVITY_AGG_TOKEN_SWAP', label: 'Aggregator Token Swap' },
                    { value: 'ACTIVITY_TOKEN_ADD_LIQ', label: 'Add Liquidity' },
                    { value: 'ACTIVITY_TOKEN_REMOVE_LIQ', label: 'Remove Liquidity' }
                  ].map(({ value, label }) => (
                    <label key={value} className="flex items-center space-x-2 px-3 py-2 bg-zinc-900 rounded-lg border border-zinc-700 hover:bg-zinc-850">
                      <input
                        type="checkbox"
                        checked={filters.activityTypes?.includes(value)}
                        onChange={(e) => {
                          const types = e.target.checked
                            ? [...(filters.activityTypes || []), value]
                            : (filters.activityTypes || []).filter(t => t !== value);
                          handleFilterChange('activityTypes', types);
                        }}
                        className="form-checkbox h-4 w-4 text-indigo-600 rounded border-zinc-500 bg-zinc-700"
                      />
                      <span className="text-sm text-zinc-300">{label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Select which activity types to receive alerts for
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-zinc-700 p-4 sm:p-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing...
              </>
            ) : (
              'Start Tracking'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrackWalletModal;