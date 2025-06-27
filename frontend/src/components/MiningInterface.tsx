import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';

// Types based on your backend API structure
interface MiningStats {
  user: {
    email: string;
    role: string;
    blocksMinedByUser: number;
    totalRewardsEarned: number;
    currentBalance: number;
  };
  network: {
    totalBlocks: number;
    totalTransactions: number;
    pendingTransactions: number;
    networkEnabled: boolean;
    connectedNodes: number;
    serverPort: number | null;
    peerNodes: any[];
  };
  pending: {
    valid: number;
    invalid: number;
    total: number;
    readyForMining: boolean;
  };
  mining: {
    currentDifficulty: number;
    blockReward: number;
    targetBlockTime: number;
  };
}

interface MiningResult {
  block: any;
  blockIndex: number;
  miner: {
    email: string;
    walletAddress: string;
    reward: number;
  };
  stats: {
    transactionsProcessed: number;
    chainLength: number;
    pendingTransactions: number;
  };
  network: {
    enabled: boolean;
    broadcastSent: boolean;
    connectedNodes: number;
  };
}

interface MiningInterfaceProps {
  onClose?: () => void;
}

const MiningInterface: React.FC<MiningInterfaceProps> = () => {
  const { refreshUserData } = useAuth();

  // State management
  const [miningStats, setMiningStats] = useState<MiningStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMining, setIsMining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMiningResult, setLastMiningResult] = useState<MiningResult | null>(
    null
  );
  const [miningHistory, setMiningHistory] = useState<MiningResult[]>([]);

  // Fetch mining statistics
  const fetchMiningStats = async () => {
    try {
      setError(null);
      console.log('⛏️ Fetching mining statistics...');

      const response = await apiService.getMiningStats();
      console.log('📊 Mining stats received:', response.data);

      if (response.success && response.data) {
        setMiningStats(response.data);
        console.log('✅ Mining stats loaded successfully');
      } else {
        throw new Error('Invalid mining stats response');
      }
    } catch (err) {
      console.error('❌ Failed to fetch mining stats:', err);
      setError('Failed to load mining statistics. Please try again.');
    } finally {
      if (!isMining) {
        setIsLoading(false);
      }
    }
  };

  // Mine pending transactions
  const startMining = async () => {
    try {
      setIsMining(true);
      setError(null);
      console.log('⛏️ Starting mining process...');

      const response = await apiService.mineTransactions();
      console.log('🎉 Mining completed:', response.data);

      if (response.success && response.data) {
        setLastMiningResult(response.data);
        setMiningHistory((prev) => [response.data, ...prev.slice(0, 4)]); // Keep last 5 results

        // Refresh stats and user balance
        await Promise.all([fetchMiningStats(), refreshUserData()]);

        console.log('✅ Mining successful! Block mined and data refreshed.');
      } else {
        throw new Error(response.message || 'Mining failed');
      }
    } catch (err: any) {
      console.error('❌ Mining failed:', err);

      let errorMessage = 'Mining failed. Please try again.';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsMining(false);
    }
  };

  // Setup auto-refresh - REMOVED CONFUSING AUTO-REFRESH
  useEffect(() => {
    fetchMiningStats();
  }, []);

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Helper function to get mining status color
  const getMiningStatusColor = () => {
    if (!miningStats) return 'gray';
    if (isMining) return 'orange';
    if (miningStats.pending.readyForMining) return 'green';
    return 'gray';
  };

  // Helper function to get mining status text
  const getMiningStatusText = () => {
    if (!miningStats) return 'Loading...';
    if (isMining) return 'Mining in Progress...';
    if (miningStats.pending.readyForMining) return 'Ready to Mine';
    return 'No Valid Transactions';
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className='card'>
        <div className='flex justify-center items-center p-8'>
          <div className='text-center'>
            <div className='text-4xl mb-4'>⛏️</div>
            <p>Loading mining interface...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (!miningStats && error) {
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
          <button onClick={fetchMiningStats} className='btn btn-primary'>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='card'>
      {/* Header */}
      <div className='flex justify-between items-center p-4 border-b'>
        <div className='flex items-center gap-4'>
          <div
            className={`px-3 py-1 rounded text-sm font-medium ${
              getMiningStatusColor() === 'green'
                ? 'bg-green-100 text-green-800'
                : getMiningStatusColor() === 'orange'
                ? 'bg-orange-100 text-orange-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
            {getMiningStatusText()}
          </div>
        </div>
        <div className='flex gap-2'>
          <button
            onClick={fetchMiningStats}
            className='btn btn-secondary text-sm'
            disabled={isMining}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className='p-4 space-y-6'
        style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Mining Action Section */}
        <div className='card bg-gradient-to-r from-blue-50 to-indigo-50'>
          <h3 className='text-lg font-bold mb-4'>🚀 Mine New Block</h3>

          {/* Mining Statistics */}
          {miningStats && (
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
              <div className='text-center p-3 bg-white rounded border'>
                <div className='text-xl font-bold text-blue-600'>
                  {miningStats.pending.valid}
                </div>
                <div className='text-xs text-gray-600'>Valid Transactions</div>
              </div>
              <div className='text-center p-3 bg-white rounded border'>
                <div className='text-xl font-bold text-red-600'>
                  {miningStats.pending.invalid}
                </div>
                <div className='text-xs text-gray-600'>
                  Invalid Transactions
                </div>
              </div>
              <div className='text-center p-3 bg-white rounded border'>
                <div className='text-xl font-bold text-green-600'>
                  {miningStats.mining.blockReward}
                </div>
                <div className='text-xs text-gray-600'>Block Reward</div>
              </div>
              <div className='text-center p-3 bg-white rounded border'>
                <div className='text-xl font-bold text-purple-600'>
                  {miningStats.mining.currentDifficulty}
                </div>
                <div className='text-xs text-gray-600'>Current Difficulty</div>
              </div>
            </div>
          )}

          {/* Mining Button */}
          <div className='text-center'>
            <button
              onClick={startMining}
              disabled={isMining || !miningStats?.pending.readyForMining}
              className={`btn text-lg px-8 py-3 ${
                isMining
                  ? 'bg-orange-500 text-white cursor-not-allowed'
                  : miningStats?.pending.readyForMining
                  ? 'btn-primary'
                  : 'btn-secondary cursor-not-allowed'
              }`}
              style={{
                opacity:
                  isMining || !miningStats?.pending.readyForMining ? 0.7 : 1,
              }}>
              {isMining ? (
                <span className='flex items-center justify-center gap-2'>
                  🔄 Mining Block...
                  <span className='animate-spin'>⚙️</span>
                </span>
              ) : miningStats?.pending.readyForMining ? (
                <span className='flex items-center justify-center gap-2'>
                  ⛏️ Mine {miningStats.pending.valid} Transactions
                </span>
              ) : (
                <span className='flex items-center justify-center gap-2'>
                  ⏸️ No Transactions to Mine
                </span>
              )}
            </button>

            {!miningStats?.pending.readyForMining && (
              <p className='text-sm text-gray-500 mt-2'>
                💡 Wait for users to create transactions, then mine them into
                blocks!
              </p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className='mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700'>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* User Mining Stats */}
        {miningStats && (
          <div className='card'>
            <h3 className='text-lg font-bold mb-4'>
              👤 Your Mining Statistics
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div className='text-center p-4 bg-gray-50 rounded'>
                <div className='text-2xl font-bold text-blue-600'>
                  {miningStats.user.blocksMinedByUser}
                </div>
                <div className='text-sm text-gray-600'>Blocks Mined</div>
              </div>
              <div className='text-center p-4 bg-gray-50 rounded'>
                <div className='text-2xl font-bold text-green-600'>
                  {miningStats.user.totalRewardsEarned}
                </div>
                <div className='text-sm text-gray-600'>Total Rewards</div>
              </div>
              <div className='text-center p-4 bg-gray-50 rounded'>
                <div className='text-2xl font-bold text-purple-600'>
                  {miningStats.user.currentBalance}
                </div>
                <div className='text-sm text-gray-600'>Current Balance</div>
              </div>
            </div>
          </div>
        )}

        {/* Network Status */}
        {miningStats && (
          <div className='card'>
            <h3 className='text-lg font-bold mb-4'>🌐 Network Status</h3>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div className='text-center p-3 bg-gray-50 rounded'>
                <div className='text-xl font-bold text-blue-600'>
                  {miningStats.network.totalBlocks}
                </div>
                <div className='text-xs text-gray-600'>Total Blocks</div>
              </div>
              <div className='text-center p-3 bg-gray-50 rounded'>
                <div className='text-xl font-bold text-green-600'>
                  {miningStats.network.totalTransactions}
                </div>
                <div className='text-xs text-gray-600'>Total Transactions</div>
              </div>
              <div className='text-center p-3 bg-gray-50 rounded'>
                <div className='text-xl font-bold text-orange-600'>
                  {miningStats.network.pendingTransactions}
                </div>
                <div className='text-xs text-gray-600'>
                  Pending Transactions
                </div>
              </div>
              <div className='text-center p-3 bg-gray-50 rounded'>
                <div className='text-xl font-bold text-purple-600'>
                  {miningStats.network.connectedNodes}
                </div>
                <div className='text-xs text-gray-600'>Connected Nodes</div>
              </div>
            </div>

            <div className='mt-4 flex justify-center'>
              <div
                className={`px-3 py-1 rounded text-sm ${
                  miningStats.network.networkEnabled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                {miningStats.network.networkEnabled
                  ? '🟢 Network Enabled'
                  : '🔴 Network Disabled'}
              </div>
            </div>
          </div>
        )}

        {/* Recent Mining Results */}
        {miningHistory.length > 0 && (
          <div className='card'>
            <h3 className='text-lg font-bold mb-4'>🏆 Recent Mining Results</h3>
            <div className='space-y-3'>
              {miningHistory.map((result, index) => (
                <div
                  key={`${result.blockIndex}-${index}`}
                  className='bg-gray-50 p-4 rounded border'>
                  <div className='flex justify-between items-center mb-2'>
                    <span className='font-bold'>
                      Block #{result.blockIndex}
                    </span>
                    <span className='text-sm text-green-600 font-medium'>
                      +{result.miner.reward} SandiCoins
                    </span>
                  </div>
                  <div className='text-sm text-gray-600 space-y-1'>
                    <div>
                      📦 Processed: {result.stats.transactionsProcessed}{' '}
                      transactions
                    </div>
                    <div>
                      ⛓️ Chain Length: {result.stats.chainLength} blocks
                    </div>
                    <div>
                      📡 Network:{' '}
                      {result.network.broadcastSent
                        ? 'Broadcasted'
                        : 'Local only'}
                    </div>
                    {result.block?.hash && (
                      <div className='font-mono text-xs mt-2'>
                        Hash: {result.block.hash.substring(0, 32)}...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mining Information */}
        <div className='card bg-blue-50'>
          <h3 className='text-lg font-bold mb-4'>💡 Mining Information</h3>
          <div className='text-sm space-y-2'>
            <div>
              • <strong>Block Reward:</strong>{' '}
              {miningStats?.mining.blockReward || 50} SandiCoins per mined block
            </div>
            <div>
              • <strong>Target Time:</strong>{' '}
              {miningStats?.mining.targetBlockTime || 1000}ms average block time
            </div>
            <div>
              • <strong>Difficulty:</strong> Automatically adjusts to maintain
              target block time
            </div>
            <div>
              • <strong>Process:</strong> Collect valid transactions → Add
              mining reward → Solve proof-of-work → Broadcast to network
            </div>
            <div>
              • <strong>Requirements:</strong> Valid pending transactions in the
              pool
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiningInterface;
