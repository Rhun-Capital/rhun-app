import React, { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { X } from 'lucide-react';
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
      <div className="relative z-50 w-full max-w-2xl bg-zinc-900 rounded-lg shadow-xl">
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