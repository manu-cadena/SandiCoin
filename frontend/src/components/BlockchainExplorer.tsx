import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';

// Types based on your backend API structure
interface Block {
  timestamp: number;
  lastHash: string;
  hash: string;
  data: any[];
  nonce: number;
  difficulty: number;
  index?: number;
}

interface BlockchainStats {
  totalBlocks: number;
  totalTransactions: number;
  currentDifficulty: number;
  latestBlockHash: string;
  pendingTransactions: number;
  networkHashRate?: number;
  totalVolume?: number;
  totalRewards?: number;
  avgBlockTime?: number;
  blockReward?: number;
}

interface NetworkStats {
  connectedNodes: number;
  networkType: string;
  syncStatus: string;
  serverPort?: number | null;
  nodeId?: string | null;
}

interface BlockchainExplorerProps {
  onClose?: () => void;
}

const BlockchainExplorer: React.FC<BlockchainExplorerProps> = ({ onClose }) => {
  const { user } = useAuth();

  // State management
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockchainStats, setBlockchainStats] =
    useState<BlockchainStats | null>(null);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState<
    'overview' | 'blocks' | 'block-detail'
  >('overview');

  // Fetch blockchain data
  const fetchBlockchainData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔗 Fetching blockchain data...');

      // Fetch blockchain and stats concurrently using your existing API methods
      const [blockchainResponse, statsResponse, networkResponse] =
        await Promise.allSettled([
          apiService.getBlockchain(),
          apiService.getBlockchainStats(),
          apiService.getNetworkStats(),
        ]);

      console.log('📊 API Responses Debug:');
      console.log('  - Blockchain response:', blockchainResponse);
      console.log('  - Stats response:', statsResponse);
      console.log('  - Network response:', networkResponse);

      // Handle blockchain data
      if (blockchainResponse.status === 'fulfilled') {
        const responseData = blockchainResponse.value.data;
        console.log('⛓️ Blockchain response data received:', responseData);

        // Extract the actual blockchain chain from your backend structure
        let blockchainChain = null;

        if (
          responseData?.blockchain?.chain &&
          Array.isArray(responseData.blockchain.chain)
        ) {
          // Your backend structure: data.blockchain.chain
          blockchainChain = responseData.blockchain.chain;
          console.log(
            '✅ Found blockchain chain in data.blockchain.chain:',
            blockchainChain.length,
            'blocks'
          );
        } else if (Array.isArray(responseData)) {
          // Fallback: direct array
          blockchainChain = responseData;
          console.log(
            '✅ Found blockchain as direct array:',
            blockchainChain.length,
            'blocks'
          );
        } else {
          console.warn(
            '⚠️ Unexpected blockchain data structure:',
            responseData
          );
          console.log('  - Available keys:', Object.keys(responseData || {}));
        }

        if (blockchainChain && blockchainChain.length > 0) {
          setBlocks([...blockchainChain].reverse()); // Show newest blocks first
          console.log(
            '📦 Set blocks:',
            blockchainChain.length,
            'blocks loaded'
          );
        } else {
          console.warn('⚠️ No valid blockchain data found');
          setBlocks([]);
        }
      } else {
        console.error(
          '❌ Blockchain request failed:',
          blockchainResponse.reason
        );
      }

      // Handle stats data - your backend returns nested structure
      if (statsResponse.status === 'fulfilled') {
        const statsData = statsResponse.value.data;
        console.log('📈 Stats data received:', statsData);

        // Extract the stats from your backend structure
        if (statsData?.blockchain && statsData?.network && statsData?.mining) {
          const transformedStats = {
            totalBlocks: statsData.blockchain.totalBlocks || 0,
            totalTransactions: statsData.blockchain.totalTransactions || 0,
            currentDifficulty: statsData.blockchain.currentDifficulty || 0,
            latestBlockHash: statsData.blockchain.latestBlockHash || '',
            pendingTransactions: statsData.network.pendingTransactions || 0,
            networkHashRate: 0, // Not provided by your backend
            totalVolume: statsData.blockchain.totalVolume || 0,
            totalRewards: statsData.blockchain.totalRewards || 0,
            avgBlockTime: statsData.blockchain.avgBlockTimeMs || 0,
            blockReward: statsData.mining.currentReward || 50,
          };
          setBlockchainStats(transformedStats);
          console.log('✅ Stats processed successfully:', transformedStats);
        } else {
          console.warn('⚠️ Unexpected stats data structure:', statsData);
        }
      } else {
        console.error('❌ Stats request failed:', statsResponse.reason);
      }

      // Handle network data - your backend returns direct network stats
      if (networkResponse.status === 'fulfilled') {
        const networkData = networkResponse.value.data;
        console.log('🌐 Network data received:', networkData);

        // Transform your backend network data structure
        if (networkData) {
          const transformedNetworkStats = {
            connectedNodes:
              networkData.connectedPeers || networkData.connectedNodes || 0,
            networkType: networkData.networkType || 'P2P',
            syncStatus: networkData.syncStatus || 'Active',
            serverPort: networkData.serverPort || null,
            nodeId: networkData.nodeId || null,
          };
          setNetworkStats(transformedNetworkStats);
          console.log(
            '✅ Network stats processed successfully:',
            transformedNetworkStats
          );
        } else {
          console.warn('⚠️ No network data received');
        }
      } else {
        console.error('❌ Network request failed:', networkResponse.reason);
      }

      // Check if all requests failed
      const failures = [
        blockchainResponse,
        statsResponse,
        networkResponse,
      ].filter((result) => result.status === 'rejected');

      if (failures.length === 3) {
        setError(
          'Failed to load blockchain data. Please check your backend connection.'
        );
      } else if (failures.length > 0) {
        console.warn(
          `⚠️ ${failures.length} API calls failed, but some data was loaded successfully`
        );
      }
    } catch (err) {
      console.error('💥 Unexpected error fetching blockchain data:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchBlockchainData();
  }, []);

  // Filter blocks based on search
  const filteredBlocks = blocks.filter(
    (block) =>
      block.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      block.lastHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (block.index && block.index.toString().includes(searchTerm))
  );

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Helper function to display full hash with copy functionality
  const displayFullHash = (hash: string, label?: string) => {
    if (!hash) return 'N/A';

    return (
      <div className='bg-gray-50 p-2 rounded border'>
        {label && <div className='text-xs text-gray-500 mb-1'>{label}</div>}
        <div className='font-mono text-xs break-all select-all cursor-text hover:bg-gray-100 transition-colors'>
          {hash}
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(hash);
            // You could add a toast notification here
            console.log(`📋 Copied to clipboard: ${hash}`);
          }}
          className='text-xs text-blue-600 hover:text-blue-800 mt-1'
          title='Copy to clipboard'>
          📋 Copy
        </button>
      </div>
    );
  };

  // Helper function to display full address with copy functionality
  const displayFullAddress = (address: string, label?: string) => {
    if (!address) return 'N/A';

    return (
      <div className='bg-gray-50 p-2 rounded border'>
        {label && <div className='text-xs text-gray-500 mb-1'>{label}</div>}
        <div className='font-mono text-xs break-all select-all cursor-text hover:bg-gray-100 transition-colors'>
          {address}
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(address);
            console.log(`📋 Copied to clipboard: ${address}`);
          }}
          className='text-xs text-blue-600 hover:text-blue-800 mt-1'
          title='Copy to clipboard'>
          📋 Copy
        </button>
      </div>
    );
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className='card'>
        <div className='flex justify-center items-center p-8'>
          <div className='text-center'>
            <div className='text-4xl mb-4'>⛓️</div>
            <p>Loading blockchain data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className='card'>
        <div className='flex justify-between items-center p-4 border-b'>
          <h2 className='text-xl font-bold'>⚠️ Error</h2>
          {onClose && (
            <button onClick={onClose} className='btn btn-secondary'>
              ✕
            </button>
          )}
        </div>
        <div className='p-4 text-center'>
          <p className='text-red-500 mb-4'>{error}</p>
          <button onClick={fetchBlockchainData} className='btn btn-primary'>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // Render overview
  const renderOverview = () => (
    <div className='space-y-6'>
      {/* Blockchain Statistics */}
      <div className='card'>
        <h3 className='text-lg font-bold mb-4'>⛓️ Blockchain Statistics</h3>
        {blockchainStats ? (
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='text-center p-4 bg-gray-50 rounded'>
              <div className='text-2xl font-bold text-blue-600'>
                {blockchainStats.totalBlocks || '0'}
              </div>
              <div className='text-sm text-gray-600'>Total Blocks</div>
            </div>
            <div className='text-center p-4 bg-gray-50 rounded'>
              <div className='text-2xl font-bold text-green-600'>
                {blockchainStats.totalTransactions || '0'}
              </div>
              <div className='text-sm text-gray-600'>Total Transactions</div>
            </div>
            <div className='text-center p-4 bg-gray-50 rounded'>
              <div className='text-2xl font-bold text-purple-600'>
                {blockchainStats.currentDifficulty || '0'}
              </div>
              <div className='text-sm text-gray-600'>Current Difficulty</div>
            </div>
            <div className='text-center p-4 bg-gray-50 rounded'>
              <div className='text-2xl font-bold text-orange-600'>
                {blockchainStats.pendingTransactions || '0'}
              </div>
              <div className='text-sm text-gray-600'>Pending Transactions</div>
            </div>
            {blockchainStats.totalVolume !== undefined && (
              <div className='text-center p-4 bg-gray-50 rounded'>
                <div className='text-2xl font-bold text-indigo-600'>
                  {blockchainStats.totalVolume}
                </div>
                <div className='text-sm text-gray-600'>
                  Total Volume (SandiCoins)
                </div>
              </div>
            )}
            {blockchainStats.totalRewards !== undefined && (
              <div className='text-center p-4 bg-gray-50 rounded'>
                <div className='text-2xl font-bold text-yellow-600'>
                  {blockchainStats.totalRewards}
                </div>
                <div className='text-sm text-gray-600'>Mining Rewards Paid</div>
              </div>
            )}
            {blockchainStats.avgBlockTime !== undefined && (
              <div className='text-center p-4 bg-gray-50 rounded'>
                <div className='text-2xl font-bold text-red-600'>
                  {Math.round(blockchainStats.avgBlockTime / 1000)}s
                </div>
                <div className='text-sm text-gray-600'>Avg Block Time</div>
              </div>
            )}
            {blockchainStats.blockReward !== undefined && (
              <div className='text-center p-4 bg-gray-50 rounded'>
                <div className='text-2xl font-bold text-emerald-600'>
                  {blockchainStats.blockReward}
                </div>
                <div className='text-sm text-gray-600'>Block Reward</div>
              </div>
            )}
          </div>
        ) : (
          <div className='text-center p-4 text-gray-500'>
            <div className='text-2xl mb-2'>📊</div>
            <p>No blockchain statistics available</p>
          </div>
        )}
      </div>

      {/* Network Statistics */}
      <div className='card'>
        <h3 className='text-lg font-bold mb-4'>🌐 Network Statistics</h3>
        {networkStats ? (
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='text-center p-4 bg-gray-50 rounded'>
              <div className='text-2xl font-bold text-blue-600'>
                {networkStats.connectedNodes || '0'}
              </div>
              <div className='text-sm text-gray-600'>Connected Nodes</div>
            </div>
            <div className='text-center p-4 bg-gray-50 rounded'>
              <div className='text-lg font-bold text-green-600'>
                {networkStats.networkType || 'Unknown'}
              </div>
              <div className='text-sm text-gray-600'>Network Type</div>
            </div>
            <div className='text-center p-4 bg-gray-50 rounded'>
              <div className='text-lg font-bold text-purple-600'>
                {networkStats.syncStatus || 'Unknown'}
              </div>
              <div className='text-sm text-gray-600'>Sync Status</div>
            </div>
          </div>
        ) : (
          <div className='text-center p-4 text-gray-500'>
            <div className='text-2xl mb-2'>🌐</div>
            <p>No network statistics available</p>
          </div>
        )}
      </div>

      {/* Recent Blocks Preview */}
      <div className='card'>
        <div className='flex justify-between items-center mb-4'>
          <h3 className='text-lg font-bold'>🆕 Recent Blocks</h3>
          <button
            onClick={() => setCurrentView('blocks')}
            className='btn btn-primary text-sm'>
            View All Blocks ({blocks.length})
          </button>
        </div>
        {blocks.length > 0 ? (
          <div className='space-y-2'>
            {blocks.slice(0, 5).map((block, index) => (
              <div
                key={block.hash}
                className='flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer'
                onClick={() => {
                  setSelectedBlock(block);
                  setCurrentView('block-detail');
                }}>
                <div>
                  <div className='font-mono text-sm'>
                    Block #{blocks.length - index - 1}
                  </div>
                  <div className='text-xs text-gray-500'>
                    {formatTimestamp(block.timestamp)}
                  </div>
                </div>
                <div className='text-right'>
                  <div className='font-mono text-sm'>
                    {block.hash.substring(0, 16)}...
                    {block.hash.substring(block.hash.length - 8)}
                  </div>
                  <div className='text-xs text-gray-500'>
                    {block.data?.length || 0} transactions
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='text-center py-8 text-gray-500'>
            <div className='text-4xl mb-4'>📭</div>
            <p>No blocks found in the blockchain</p>
          </div>
        )}
      </div>
    </div>
  );

  // Render blocks list
  const renderBlocksList = () => (
    <div className='space-y-4'>
      {/* Search */}
      <div>
        <input
          type='text'
          placeholder='Search by block hash, previous hash, or index...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='w-full p-3 border rounded'
        />
      </div>

      {/* Blocks List */}
      {filteredBlocks.length > 0 ? (
        <div className='space-y-3'>
          {filteredBlocks.map((block, index) => (
            <div
              key={block.hash}
              className='card hover:shadow-lg cursor-pointer transition-shadow'
              onClick={() => {
                setSelectedBlock(block);
                setCurrentView('block-detail');
              }}>
              <div className='flex justify-between items-center'>
                <div className='flex-1'>
                  <div className='flex items-center gap-4 mb-2'>
                    <h4 className='font-bold'>
                      Block #{blocks.length - index}
                    </h4>
                    <span className='text-sm text-gray-500'>
                      {formatTimestamp(block.timestamp)}
                    </span>
                  </div>
                  <div className='font-mono text-sm text-gray-600 mb-1'>
                    Hash: {block.hash.substring(0, 20)}...
                    {block.hash.substring(block.hash.length - 12)}
                  </div>
                  <div className='font-mono text-sm text-gray-600'>
                    Previous: {block.lastHash.substring(0, 20)}...
                    {block.lastHash.substring(block.lastHash.length - 12)}
                  </div>
                </div>
                <div className='text-right'>
                  <div className='text-lg font-bold text-blue-600'>
                    {block.data?.length || 0}
                  </div>
                  <div className='text-sm text-gray-500'>Transactions</div>
                  <div className='text-xs text-gray-400 mt-1'>
                    Difficulty: {block.difficulty || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className='text-center py-8 text-gray-500'>
          <div className='text-4xl mb-4'>🔍</div>
          <p>No blocks found matching your search.</p>
        </div>
      )}
    </div>
  );

  // Render block detail
  const renderBlockDetail = () => {
    if (!selectedBlock) return null;

    return (
      <div className='space-y-6'>
        {/* Block Header */}
        <div className='card'>
          <h3 className='text-lg font-bold mb-4'>🧱 Block Details</h3>
          <div className='grid grid-cols-1 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-600 mb-1'>
                Block Hash
              </label>
              {displayFullHash(selectedBlock.hash)}
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-600 mb-1'>
                Previous Hash
              </label>
              {displayFullHash(selectedBlock.lastHash)}
            </div>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-600 mb-1'>
                  Timestamp
                </label>
                <div className='text-sm bg-gray-50 p-2 rounded'>
                  {formatTimestamp(selectedBlock.timestamp)}
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-600 mb-1'>
                  Nonce
                </label>
                <div className='text-sm bg-gray-50 p-2 rounded'>
                  {selectedBlock.nonce || 'N/A'}
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-600 mb-1'>
                  Difficulty
                </label>
                <div className='text-sm bg-gray-50 p-2 rounded'>
                  {selectedBlock.difficulty || 'N/A'}
                </div>
              </div>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-600 mb-1'>
                Transactions Count
              </label>
              <div className='text-lg font-bold bg-gray-50 p-2 rounded text-center'>
                {selectedBlock.data?.length || 0} transactions in this block
              </div>
            </div>
          </div>
        </div>

        {/* Transactions in Block */}
        <div className='card'>
          <h3 className='text-lg font-bold mb-4'>💸 Transactions in Block</h3>
          {!selectedBlock.data || selectedBlock.data.length === 0 ? (
            <div className='text-center py-8 text-gray-500'>
              <div className='text-4xl mb-4'>📭</div>
              <p>No transactions in this block.</p>
            </div>
          ) : (
            <div className='space-y-4'>
              {selectedBlock.data.map((transaction, index) => (
                <div
                  key={transaction.id || index}
                  className='bg-gray-50 p-4 rounded border'>
                  <div className='flex justify-between items-center mb-3'>
                    <span className='font-bold text-lg'>
                      Transaction #{index + 1}
                    </span>
                    <span className='text-sm text-gray-500 bg-blue-100 px-2 py-1 rounded'>
                      {transaction.input?.address === '*authorized-reward*'
                        ? 'Mining Reward'
                        : 'Transfer'}
                    </span>
                  </div>

                  {/* Transaction ID */}
                  {transaction.id && (
                    <div className='mb-3'>
                      <label className='block text-sm font-medium text-gray-600 mb-1'>
                        Transaction ID
                      </label>
                      {displayFullHash(transaction.id)}
                    </div>
                  )}

                  {/* Input (From) */}
                  {transaction.input && (
                    <div className='mb-3'>
                      <label className='block text-sm font-medium text-gray-600 mb-1'>
                        From Address
                      </label>
                      {transaction.input.address === '*authorized-reward*' ? (
                        <div className='bg-yellow-100 p-2 rounded border font-mono text-sm'>
                          🏆 Mining Reward (System Generated)
                        </div>
                      ) : (
                        displayFullAddress(transaction.input.address)
                      )}
                    </div>
                  )}

                  {/* Outputs (To) */}
                  {transaction.outputMap && (
                    <div className='mb-3'>
                      <label className='block text-sm font-medium text-gray-600 mb-2'>
                        To Addresses & Amounts
                      </label>
                      <div className='space-y-2'>
                        {Object.entries(transaction.outputMap).map(
                          ([address, amount], outputIndex) => (
                            <div
                              key={`${address}-${outputIndex}`}
                              className='bg-white p-3 rounded border'>
                              <div className='flex justify-between items-start mb-2'>
                                <span className='text-sm font-medium text-gray-600'>
                                  {transaction.input?.address === address
                                    ? 'Change (Back to Sender)'
                                    : 'Recipient'}
                                </span>
                                <span className='text-lg font-bold text-green-600'>
                                  {amount} SandiCoins
                                </span>
                              </div>
                              {displayFullAddress(address)}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Transaction Signature */}
                  {transaction.input?.signature &&
                    transaction.input.signature !== '*reward-signature*' && (
                      <div className='mb-3'>
                        <label className='block text-sm font-medium text-gray-600 mb-1'>
                          Digital Signature
                        </label>
                        {displayFullHash(transaction.input.signature)}
                      </div>
                    )}

                  {/* Timestamp */}
                  {transaction.input?.timestamp && (
                    <div className='text-sm text-gray-500 text-right'>
                      Created: {formatTimestamp(transaction.input.timestamp)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main render - using your modal structure pattern
  return (
    <div className='card'>
      {/* Header */}
      <div className='flex justify-between items-center p-4 border-b'>
        <div className='flex items-center gap-4'>
          <h2 className='text-xl font-bold'>🔗 Blockchain Explorer</h2>
          {/* Navigation */}
          <div className='flex gap-2'>
            <button
              onClick={() => setCurrentView('overview')}
              className={`btn text-sm ${
                currentView === 'overview' ? 'btn-primary' : 'btn-secondary'
              }`}>
              Overview
            </button>
            <button
              onClick={() => setCurrentView('blocks')}
              className={`btn text-sm ${
                currentView === 'blocks' ? 'btn-primary' : 'btn-secondary'
              }`}>
              All Blocks
            </button>
            {selectedBlock && (
              <button
                onClick={() => setCurrentView('block-detail')}
                className={`btn text-sm ${
                  currentView === 'block-detail'
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}>
                Block Detail
              </button>
            )}
          </div>
        </div>
        <div className='flex gap-2'>
          <button
            onClick={fetchBlockchainData}
            className='btn btn-secondary text-sm'>
            🔄 Refresh
          </button>
          {onClose && (
            <button onClick={onClose} className='btn btn-secondary'>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className='p-4' style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {currentView === 'overview' && renderOverview()}
        {currentView === 'blocks' && renderBlocksList()}
        {currentView === 'block-detail' && renderBlockDetail()}
      </div>
    </div>
  );
};

export default BlockchainExplorer;
