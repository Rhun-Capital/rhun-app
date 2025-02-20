import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { CloseIcon } from '@/components/icons';
import { Loader2, Edit2, X, Save, Tag as TagIcon } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 10;

interface LastActivityWrapper {
  userId: string;
  timestamp: number;
  sk: string;
  pk: string;
  walletAddress: string;
  type: string;
}

interface Watcher {
  walletAddress: string;
  name?: string;
  tags?: string[];
  lastDataPoint?: {
    solBalance: number;
    timestamp: number;
  };
  isActive: boolean;
  lastChecked?: string | null;
  filters?: {
    minAmount?: number;
    specificToken?: string;
    activityTypes?: string[];
    platform?: string[];
  };
  userId: string;
  createdAt: string;
  sk: string;
  pk: string;
  type: string;
  lastActivity?: LastActivityWrapper[];
}

interface WalletDetailsModalProps {
  watcher: Watcher;
  onClose: () => void;
  onUpdate: (updatedWatcher: Watcher) => void;
}

const formatActivityType = (type: string) => {
  if (!type) return 'Unknown';
  if (type === 'swapActivity') return 'Swap';
  return type.replace('ACTIVITY_', '');
};

const WalletDetailsModal: React.FC<WalletDetailsModalProps> = ({ watcher, onClose, onUpdate }) => {
  const { getAccessToken, user } = usePrivy();
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // New state for editing name and tags
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(watcher.name || '');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>(watcher.tags || []);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, [currentPage]);

  // Reset edit form when watcher changes
  useEffect(() => {
    setName(watcher.name || '');
    setTags(watcher.tags || []);
  }, [watcher]);

  const fetchActivities = async () => {
    if (!watcher || !watcher.filters) return;
    
    setIsLoading(true);
    try {
      const queryString = Object.keys(watcher.filters || {})
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent((watcher.filters as Record<string, any>)[key])}`)
        .join('&');        
      const token = await getAccessToken();
      const response = await fetch(
        `/api/watchers/activities?walletAddress=${watcher.walletAddress}&userId=${user?.id}&page=${currentPage}&pageSize=${PAGE_SIZE}&${queryString}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      setActivities(prev => 
        currentPage === 1 ? data.activities : [...prev, ...data.activities]
      );
      setHasMore(data.activities.length === PAGE_SIZE);
    } catch (err) {
      setError('Failed to load activities');
      console.error('Error fetching activities:', err);
    } finally {
      setIsLoading(false);
    }
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

  const handleSave = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      const token = await getAccessToken();
      
      // Create query string for the watcher's filters
      const queryString = watcher.filters 
        ? Object.keys(watcher.filters)
            .map((key) => `${key}=${(watcher.filters as any)[key]}`)
            .join('&')
        : '';
      
      const updateData = {
        name: name.trim() || null,
        tags: tags.length > 0 ? tags : null,
      };
  
      const response = await fetch(
        `/api/watchers?userId=${encodeURIComponent(user.id)}&walletAddress=${watcher.walletAddress}&queryString=${encodeURIComponent(queryString)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updateData),
        }
      );
  
      if (!response.ok) {
        throw new Error('Failed to update watcher');
      }
  
      // This part is correct - we create an updated watcher object with the new values
      const updatedWatcher = {
        ...watcher,
        name: name.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined
      };
      
      // This is the key part - calling onUpdate with the updated watcher
      if (onUpdate) {
        onUpdate(updatedWatcher);
      }
      
      setIsEditing(false);
      toast.success('Watcher updated successfully');
    } catch (error) {
      console.error('Error updating watcher:', error);
      toast.error('Failed to update watcher');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTokenDetails = (activity: any) => {
    if (!activity.routers) return null;
    
    const router = activity.routers;
    return {
      token1: {
        amount: router.amount1,
        decimals: router.token1_decimals,
        metadata: activity.tokens?.[router.token1]
      },
      token2: {
        amount: router.amount2,
        decimals: router.token2_decimals,
        metadata: activity.tokens?.[router.token2]
      }
    };
  };

  const formatTokenAmount = (amount: number | string, decimals = 9) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (!numAmount || isNaN(numAmount)) return '0';
    return (numAmount / Math.pow(10, decimals)).toFixed(decimals > 6 ? 6 : decimals);
  };

  if (!watcher) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-zinc-800 rounded-lg w-full max-w-2xl h-[100vh] sm:h-auto sm:max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-zinc-700">
          <div className="flex-1 space-y-1">
            {isEditing ? (
              <div className="flex-1 pr-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`Wallet ${watcher.walletAddress.slice(0, 4)}...${watcher.walletAddress.slice(-4)}`}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-lg"
                />
              </div>
            ) : (
              <div className="flex items-center">
                <h2 className="text-lg sm:text-xl font-semibold text-white mr-2">
                  {watcher.name || `Wallet ${watcher.walletAddress.slice(0, 4)}...${watcher.walletAddress.slice(-4)}`}
                </h2>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-zinc-400 hover:text-indigo-300 transition-colors p-1"
                  title="Edit name and tags"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
            <p className="text-xs sm:text-sm text-zinc-400 font-mono truncate">
              {watcher.walletAddress}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-2"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Editing Mode for Tags */}
          {isEditing && (
            <div className="bg-zinc-700 bg-opacity-40 p-4 rounded-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Tags
                </label>
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
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    onKeyDown={handleTagInput}
                    onBlur={addTag}
                    placeholder="Add tags (comma or enter to separate)"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-500 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 space-x-3">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setName(watcher.name || '');
                    setTags(watcher.tags || []);
                  }}
                  className="px-3 py-1 text-zinc-300 hover:text-white transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <span className="flex items-center">
                      <Loader2 size={14} className="animate-spin mr-1" />
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Save size={14} className="mr-1" />
                      Save
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tags display (when not editing) */}
          {!isEditing && watcher.tags && watcher.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {watcher.tags.map(tag => (
                <span 
                  key={tag}
                  className="text-xs bg-indigo-900/40 text-indigo-200 px-2 py-1 rounded-md flex items-center"
                >
                  <TagIcon size={12} className="mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4">
            {/* Status and Last Updated */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                <div className="text-sm text-zinc-400">Last Updated</div>
                <div className="text-sm sm:text-base text-white mt-1">
                  {watcher.lastChecked
                    ? new Date(watcher.lastChecked).toLocaleString()
                    : 'Never'
                  }
                </div>
              </div>

              <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                <div className="text-sm text-zinc-400">Status</div>
                <div className={`mt-1 flex items-center gap-2 ${
                  watcher.isActive ? 'text-green-400' : 'text-red-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    watcher.isActive ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  {watcher.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {watcher.filters && (
              <div className="bg-zinc-900 p-3 sm:p-4 rounded-lg">
                <div className="text-sm text-zinc-400 mb-2">Active Filters</div>
                <div className="space-y-2">
                  {watcher.filters.minAmount != null && watcher.filters.minAmount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">Min Amount:</span>
                      <span className="text-xs text-white">${watcher.filters.minAmount}</span>
                    </div>
                  )}
                  {watcher.filters.specificToken && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">Specific Token:</span>
                      <span className="text-xs text-white font-mono">
                        {`${watcher.filters.specificToken.slice(0, 4)}...${watcher.filters.specificToken.slice(-4)}`}
                      </span>
                    </div>
                  )}
                  {watcher.filters.activityTypes && watcher.filters.activityTypes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-zinc-400">Activity Types:</span>
                      <div className="flex flex-wrap gap-1">
                        {watcher.filters.activityTypes.map(type => (
                          <span 
                            key={type}
                            className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded"
                          >
                            {type.replace('ACTIVITY_', '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {watcher.filters.platform && watcher.filters.platform.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-zinc-400">Platforms:</span>
                      <div className="flex flex-wrap gap-1">
                        {watcher.filters.platform.map(p => (
                          <span 
                            key={p}
                            className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {!watcher.filters.minAmount && 
                   !watcher.filters.specificToken && 
                   (!watcher.filters.activityTypes || watcher.filters.activityTypes.length === 0) &&
                   (!watcher.filters.platform || watcher.filters.platform.length === 0) && (
                    <span className="text-xs text-zinc-500">No active filters</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Activities */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Activities</h3>
            <div className="space-y-3">
              {activities.map((activity) => {
                // Add null checks
                if (!activity) return null;
                const tokenDetails = formatTokenDetails(activity);
                if (!tokenDetails) return null;

                return (
                  <div 
                    key={activity.transactionId || activity.trans_id}
                    className="border border-zinc-700 p-4 bg-zinc-900 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-zinc-300">
                        {formatActivityType(activity.type)}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {new Date(activity.timestamp || activity.time).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                        {/* Token 1 */}
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center">
                            {tokenDetails.token1.metadata?.token_icon ? (
                              <img 
                                src={tokenDetails.token1.metadata.token_icon} 
                                alt={tokenDetails.token1.metadata.token_symbol || 'token'} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs">?</span>
                            )}
                          </div>
                          <span className="text-sm text-zinc-100">
                            {formatTokenAmount(tokenDetails.token1.amount, tokenDetails.token1.decimals)}{' '}
                            {tokenDetails.token1.metadata?.token_symbol || 'Unknown'}
                          </span>
                        </div>

                        <span className="text-zinc-500">→</span>

                        {/* Token 2 */}
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center">
                            {tokenDetails.token2.metadata?.token_icon ? (
                              <img 
                                src={tokenDetails.token2.metadata.token_icon} 
                                alt={tokenDetails.token2.metadata.token_symbol || 'token'} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs">?</span>
                            )}
                          </div>
                          <span className="text-sm text-zinc-100">
                            {formatTokenAmount(tokenDetails.token2.amount, tokenDetails.token2.decimals)}{' '}
                            {tokenDetails.token2.metadata?.token_symbol || 'Unknown'}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm text-zinc-400">
                        ${(activity.value || 0).toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="mt-3 space-y-1 text-xs">
                      {activity.platform && (
                        <div className="text-xs text-zinc-500 flex items-center gap-2">
                          <span className="text-zinc-400">Platform:</span>
                          <span className="truncate">
                            {Array.isArray(activity.platform) ? activity.platform.join(', ') : activity.platform}
                          </span>
                        </div>
                      )}
                      <div className="text-xs text-zinc-500 flex items-center gap-2">
                        <span className="text-zinc-400">Tx:</span>
                        <a 
                          href={`https://solscan.io/tx/${activity.transactionId || activity.trans_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-indigo-400 transition-colors"
                        >
                          View Transaction
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Load More Button */}
              {hasMore && !isLoading && (
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="w-full py-2 px-4 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors text-sm"
                >
                  Load More
                </button>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              )}

              {/* No Activities State */}
              {!isLoading && activities.length === 0 && (
                <div className="text-center text-zinc-400 py-8">
                  No activities found
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="text-center text-red-400 py-4">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletDetailsModal;