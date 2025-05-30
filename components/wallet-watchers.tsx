'use client';

import React, { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { AlertCircleIcon, PlusIcon } from '@/components/icons';
import LoadingIndicator from '@/components/loading-indicator';
import WalletDetailsModal from './watch-wallet-modal';
import { toast } from 'sonner';
import DeleteConfirmationModal from './delete-confirmation-modal';
import AddWatcherModal from '@/components/add-watcher-modal';
import { WatcherData, WatchersResponse, WatcherCardProps, LastActivityWrapper } from '../types/watcher';

const WalletWatchers = () => {
  const { getAccessToken, user, ready } = usePrivy();
  const [watchers, setWatchers] = useState<WatcherData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWatcher, setSelectedWatcher] = useState<WatcherData | null>(null);
  const [isWatchModalOpen, setIsWatchModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [watcherToDelete, setWatcherToDelete] = useState<WatcherData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter function for search
// Updated filter function
const filterWatchers = (watcher: WatcherData) => {
  if (!searchQuery) return true;
  
  const query = searchQuery.toLowerCase();
  
  // Search in wallet address
  if (watcher.walletAddress.toLowerCase().includes(query)) {
    return true;
  }
  
  // Search in name if it exists
  if (watcher.name && watcher.name.toLowerCase().includes(query)) {
    return true;
  }
  
  // Search in tags if they exist
  if (watcher.tags && watcher.tags.some(tag => tag.toLowerCase().includes(query))) {
    return true;
  }
  
  return false;
};

const handleWatcherUpdate = (updatedWatcher: WatcherData) => {
  // Update the watcher in the watchers array
  setWatchers(prevWatchers => 
    prevWatchers.map(watcher => 
      watcher.walletAddress === updatedWatcher.walletAddress ? 
        { ...watcher, ...updatedWatcher } : 
        watcher
    )
  );
  
  // Also update the selected watcher
  setSelectedWatcher(updatedWatcher);
};


  const sortWatchers = (a: WatcherData, b: WatcherData) => {
    // Handle null/undefined cases
    if (!a.lastChecked && !b.lastChecked) return 0;
    if (!a.lastChecked) return 1;
    if (!b.lastChecked) return -1;
  
    // Convert ISO strings to timestamps for comparison
    const timeA = new Date(a.lastChecked).getTime();
    const timeB = new Date(b.lastChecked).getTime();
    
    return sortDirection === 'desc' ? timeB - timeA : timeA - timeB;
  };
  
  // Add debug log to see the full watcher objects  
  const filteredAndSortedWatchers = React.useMemo(() => {
    const sorted = [...watchers]
      .filter(filterWatchers)
      .sort(sortWatchers);
    
    return sorted;
  }, [watchers, searchQuery, sortDirection]);
  

  const handleDeleteWatcher = async (watcher: WatcherData) => {
    setIsDeleting(true);
    try {
      const token = await getAccessToken();
  
      // Convert watcher filters to match the expected format
      const filters = {
        activityTypes: watcher.filters?.activityTypes || ['ACTIVITY_TOKEN_SWAP', 'ACTIVITY_AGG_TOKEN_SWAP'],
        platform: '',  // Add if you have platform data
        specificToken: watcher.filters?.specificToken || null,
        minAmount: watcher.filters?.minAmount || 0,
      };

      // Create the query string
      const queryString = Object.keys(filters)
        .map((key) => `${key}=${(filters as any)[key]}`)
        .join('&');
  
      const response = await fetch(
        `/api/watchers?userId=${encodeURIComponent(user?.id || '')}&walletAddress=${watcher.walletAddress}&queryString=${encodeURIComponent(queryString)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
  
      if (!response.ok) {
        throw new Error('Failed to delete watcher');
      }
  
      await fetchWatchers(); // Refresh the list
      toast.success('Wallet watcher deleted successfully');
      setSelectedWatcher(null);
      setIsDeleteModalOpen(false);
      setWatcherToDelete(null);
    } catch (error) {
      toast.error('Failed to delete watcher');
      console.error('Error deleting watcher:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch watchers with read status data
  const fetchWatchers = async () => {
    try {
      if (!ready) return;
      if (!user && ready) throw new Error('User not found');
      const token = await getAccessToken();
      
      // Fetch watchers
      const response = await fetch(`/api/watchers?userId=${encodeURIComponent(user?.id || '')}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch watchers');
      const responseData: WatchersResponse = await response.json();
      
      // Fetch read status information
      const unreadResponse = await fetch(`/api/watchers/unread-counts?userId=${encodeURIComponent(user?.id || '')}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (unreadResponse.ok) {
        const unreadData = await unreadResponse.json();
        
        // Merge read status with watcher data
        const watchersWithReadStatus = responseData.watchers.map(watcher => {
          // Extract queryString from the watcher's sk
          const watcherParts = watcher.sk.split('#');
          const walletAddress = watcherParts[1];
          const queryString = watcherParts.slice(2).join('#');
          
          // Find matching read status
          const readStatus = unreadData.watcherDetails.find(
            (detail: { walletAddress: string; queryString: string }) => detail.walletAddress === walletAddress && detail.queryString === queryString
          );
          
          return {
            ...watcher,
            lastReadTimestamp: readStatus?.lastReadTimestamp || 0,
            hasUnreadActivities: readStatus?.hasUnread || false
          };
        });
        
        setWatchers(watchersWithReadStatus);
      } else {
        setWatchers(responseData.watchers);
      }
    } catch (error) {
      setError('Failed to load wallet watchers');
      console.error('Error fetching watchers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark a watcher as read when viewed
  const markWatcherAsRead = async (watcher: WatcherData) => {
    try {
      if (!user?.id) return;
      
      const token = await getAccessToken();
      
      // Extract queryString from the watcher's sk
      const watcherParts = watcher.sk.split('#');
      const walletAddress = watcherParts[1];
      const queryString = watcherParts.slice(2).join('#');
      
      const response = await fetch('/api/watchers/mark-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          walletAddress,
          queryString
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update watcher in state to reflect read status
        setWatchers(prevWatchers => 
          prevWatchers.map(w => 
            w.walletAddress === watcher.walletAddress &&
            w.sk === watcher.sk ? 
            {
              ...w,
              lastReadTimestamp: data.timestamp,
              hasUnreadActivities: false
            } : 
            w
          )
        );
        
        // Also update selected watcher if it's the same one
        if (selectedWatcher && selectedWatcher.sk === watcher.sk) {
          setSelectedWatcher({
            ...selectedWatcher,
            lastReadTimestamp: data.timestamp,
            hasUnreadActivities: false
          });
        }
      }
    } catch (error) {
      console.error('Error marking watcher as read:', error);
    }
  };

  const handleWatcherSelect = (watcher: WatcherData) => {
    setSelectedWatcher(watcher);
    markWatcherAsRead(watcher);
  };  

  useEffect(() => {
    if (user?.id)
      fetchWatchers();
  }, [user]);

  // mobile-friendly card component for the watchers
  // Updated WatcherCard component for mobile view
const WatcherCard = ({ watcher, onDelete, onClick }: WatcherCardProps) => (
  <div 
    onClick={onClick}
    className={`bg-zinc-800 rounded-lg p-4 space-y-3 hover:bg-zinc-700 transition-colors cursor-pointer ${
      watcher.hasUnreadActivities ? 'border-l-4 border-indigo-500' : ''
    }`}
  >
    <div className="flex justify-between items-start">
      <div>
        {watcher.name ? (
          <div className="font-medium text-white hover:text-indigo-300 transition-colors flex items-center">
            {watcher.name}         
          </div>
        ) : (
          <div className="font-medium text-white hover:text-indigo-300 transition-colors">
            {`${watcher.walletAddress.slice(0, 4)}...${watcher.walletAddress.slice(-4)}`}          
          </div>
        )}
        
        {/* Show address as secondary line if name exists */}
        {watcher.name && (
          <div className="text-xs text-zinc-400 mt-0.5">
            {`${watcher.walletAddress.slice(0, 4)}...${watcher.walletAddress.slice(-4)}`}
          </div>
        )}
      </div>
      <div 
        className={`inline-flex text-xs px-2 py-0.5 rounded-full ${
          watcher.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
        }`}
      >
        {watcher.isActive ? 'Active' : 'Inactive'}
      </div>
    </div>

    {/* Tags display */}
    {watcher.tags && watcher.tags.length > 0 && (
      <div className="flex flex-wrap gap-1">
        {watcher.tags.map(tag => (
          <span 
            key={tag}
            className="text-xs bg-indigo-900/30 text-indigo-200 px-2 py-0.5 rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>
    )}

    <div className="text-xs text-zinc-300">
      Last Updated: {watcher.lastChecked ? 
        new Date(watcher.lastChecked).toLocaleString() : 
        'Never'
      }
    </div>

    <div className="flex flex-wrap gap-1">
      {(watcher.filters?.minAmount && watcher.filters.minAmount > 0) ? (
        <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">
          Min: ${watcher.filters.minAmount}
        </span>
      ) : null}
      {watcher.filters?.specificToken && (
        <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">
          Token: {`${watcher.filters.specificToken.slice(0, 4)}...${watcher.filters.specificToken.slice(-4)}`}
        </span>
      )}
      {watcher.filters?.activityTypes?.map(type => (
        <span 
          key={type}
          className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full"
        >
          {type.replace('ACTIVITY_', '')}
        </span>
      ))}
    </div>

    <div className="flex justify-end">
      <button
        onClick={onDelete}
        className="text-sm text-red-400 hover:text-red-300 transition-colors"
      >
        Delete
      </button>
    </div>
  </div>
);

  const Header = () => {
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center w-full">
        <h1 className="text-2xl font-bold text-white">Wallet Watchers</h1>
        <button
          onClick={() => setIsWatchModalOpen(true)}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg transition-colors w-full sm:w-auto mt-4 sm:mt-0"
        >
          <div className="flex items-center gap-2 bg-indigo-500 rounded-lg w-full sm:w-auto justify-center sm:justify-start">
            <span className="ml-2">Add Watcher</span>
            <PlusIcon />
          </div>
        </button>
      </div>
    );
  };
  

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingIndicator />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-zinc-800 rounded-lg mt-4">
        <div className="text-zinc-400 flex items-center gap-2 justify-center">
          <AlertCircleIcon />
          {error}
        </div>
      </div>
    );
  }

  if (watchers.length === 0) {
    return (
      <div className="p-6">
        <Header />
        <div className="p-4 bg-zinc-800 rounded-lg mt-4">
          <div className="text-zinc-400 flex items-center gap-2">
            <span>No watchers found. Add a new watcher to get started.</span>
          </div>
        </div>
          <AddWatcherModal
          isOpen={isWatchModalOpen}
          onClose={() => setIsWatchModalOpen(false)}
          onSuccess={fetchWatchers}
        />
      </div>
    );
  }

  const SortableHeader = () => (
    <th 
        onClick={(e) => {
          e.stopPropagation(); 
          setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')
        }
      }
      className="p-4 text-sm font-medium text-zinc-400 cursor-pointer hover:text-white transition-colors"
    >
      <div className="flex items-center gap-2">
        Last Updated
        <span className="text-zinc-500">
          {sortDirection === 'desc' ? '↓' : '↑'}
        </span>
      </div>
    </th>
  );


  return (
    <div className="p-4 sm:p-6 w-full overflow-x-hidden">
      <Header />
      <div className="relative w-full">
        <input
          type="text"
          placeholder="Search by name, address, or tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full my-4 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors relative z-10"
        />
      </div>      
      <div className="hidden md:block overflow-x-auto w-full">
        <table className="w-full bg-zinc-800 rounded-lg">
          <thead>
            <tr className="text-left border-b border-zinc-700 sticky top-0 bg-zinc-800 z-20">
              <th className="p-4 text-sm font-medium text-zinc-400">Name/Address</th>
              <th className="p-4 text-sm font-medium text-zinc-400">Status</th>
              <SortableHeader />
              <th className="p-4 text-sm font-medium text-zinc-400">Tags</th>
              <th className="p-4 text-sm font-medium text-zinc-400">Filters</th>
              <th className="p-4 text-sm font-medium text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedWatchers.map((watcher) => (
              <tr 
                onClick={() => handleWatcherSelect(watcher)}
                key={watcher.walletAddress + watcher.createdAt}
                className={`border-b border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer ${
                  watcher.hasUnreadActivities ? 'border-l-4 border-l-indigo-500' : ''
                }`}
              >
                <td className="p-4">
                  {watcher.name ? (
                    <div>
                      <div className="font-medium text-white hover:text-indigo-300 transition-colors">
                        {watcher.name}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {`${watcher.walletAddress.slice(0, 4)}...${watcher.walletAddress.slice(-4)}`}
                      </div>
                    </div>
                  ) : (
                    <div className="font-medium text-white hover:text-indigo-300 transition-colors">
                      {`${watcher.walletAddress.slice(0, 4)}...${watcher.walletAddress.slice(-4)}`}
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <div 
                    className={`inline-flex text-xs px-2 py-0.5 rounded-full ${
                      watcher.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}
                  >
                    {watcher.isActive ? 'Active' : 'Inactive'}
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-xs text-zinc-300">
                    {watcher.lastChecked ? (
                      new Date(watcher.lastChecked).toLocaleString()
                    ) : (
                      'Never'
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {watcher.tags && watcher.tags.length > 0 ? (
                      watcher.tags.map(tag => (
                        <span 
                          key={tag}
                          className="text-xs bg-indigo-900/30 text-indigo-200 px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-500">None</span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {(watcher.filters?.minAmount && watcher.filters.minAmount > 0) ? (
                      <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">
                        Min: ${watcher.filters.minAmount}
                      </span>
                    ) : null}
                    {watcher.filters?.specificToken && (
                      <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">
                        Token: {`${watcher.filters.specificToken.slice(0, 4)}...${watcher.filters.specificToken.slice(-4)}`}
                      </span>
                    )}
                    {watcher.filters?.activityTypes?.map(type => (
                      <span 
                        key={type}
                        className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full"
                      >
                        {type.replace('ACTIVITY_', '')}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setWatcherToDelete(watcher);
                        setIsDeleteModalOpen(true);
                      }}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedWatchers.length === 0 && searchQuery && (
          <div className="text-center py-8 text-zinc-400">
            No wallets found matching &ldquo;{searchQuery}&ldquo;
          </div>
        )}      

      {/* Mobile Cards */}
      <div className="md:hidden w-full">
        <div className="grid grid-cols-1 gap-4 w-full">
          {filteredAndSortedWatchers.map((watcher) => (
            <WatcherCard
              key={watcher.walletAddress + watcher.createdAt}
              watcher={watcher}
              onDelete={(e) => {
                e.stopPropagation();
                setWatcherToDelete(watcher);
                setIsDeleteModalOpen(true);
              }}
              onClick={() => handleWatcherSelect(watcher)}
            />
          ))}
        </div>
      </div>      

      {selectedWatcher && (
        <WalletDetailsModal
          watcher={selectedWatcher}
          onClose={() => setSelectedWatcher(null)}
          onUpdate={handleWatcherUpdate}
        />
      )}

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setWatcherToDelete(null);
        }}
        message="Are you sure you want to delete this watcher? This action can not be undone."
        title="Delete Watcher"
        onConfirm={() => watcherToDelete && handleDeleteWatcher(watcherToDelete)}
        loading={isDeleting}
      />

      <AddWatcherModal
        isOpen={isWatchModalOpen}
        onClose={() => setIsWatchModalOpen(false)}
        onSuccess={fetchWatchers}
      />
    </div>
  );
};

export default WalletWatchers;