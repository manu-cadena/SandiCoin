import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';

// API transaction structure (what the backend returns)
interface ApiTransaction {
  id: string;
  sender: string;
  recipient: string;
  amount: number;
  timestamp: string;
  signature: string;
  status: 'pending' | 'confirmed';
  blockIndex?: number;
  blockHash?: string;
}

// Enhanced transaction for display (what we use in the UI)
interface Transaction extends ApiTransaction {
  userRole: 'sender' | 'recipient';
  actualAmount: number;
  amountType: string;
}

interface TransactionApiResponse {
  confirmed: ApiTransaction[];
  pending: ApiTransaction[];
  total: number;
}

interface TransactionHistoryProps {
  onClose?: () => void;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ onClose }) => {
  const { user, wallet } = useAuth();

  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Helper function to enhance API transaction for display
  const enhanceTransaction = (apiTx: ApiTransaction): Transaction => {
    const userEmail = user?.email || '';
    const userWalletAddress = wallet?.publicKey || '';
    
    // Extract sender and recipient from the complex transaction structure
    let sender = '';
    let recipient = '';
    let actualAmount = 0;
    let userRole: 'sender' | 'recipient' = 'recipient';

    // Check if transaction has the complex structure with input/outputMap
    if ('input' in apiTx && 'outputMap' in apiTx) {
      const txInput = (apiTx as any).input;
      const txOutputMap = (apiTx as any).outputMap;
      
      // Extract sender from input.address
      sender = txInput?.address || '';
      
      // For outputMap, find which addresses are recipients and amounts
      const outputAddresses = Object.keys(txOutputMap || {});
      const outputAmounts = Object.values(txOutputMap || {});
      
      // Determine user role based on input address
      if (sender === userWalletAddress || sender === userEmail) {
        userRole = 'sender';
        // For sender, calculate total amount sent (exclude change back to sender)
        actualAmount = (apiTx as any).actualAmount || 0;
        // Find the main recipient (usually the first non-sender address)
        recipient = outputAddresses.find(addr => addr !== sender) || outputAddresses[0] || '';
      } else {
        userRole = 'recipient';
        // For recipient, get the amount sent to this user's address
        actualAmount = txOutputMap[userWalletAddress] || (apiTx as any).actualAmount || 0;
        recipient = userWalletAddress;
      }
    } else {
      // Fallback for simple transaction structure
      sender = apiTx.sender || '';
      recipient = apiTx.recipient || '';
      actualAmount = apiTx.amount || 0;
      
      userRole = (sender === userEmail || sender === userWalletAddress) ? 'sender' : 'recipient';
    }

    const amountType = userRole === 'sender' ? 'sent' : 'received';

    // Ensure we have a timestamp - use input.timestamp as fallback
    let finalTimestamp = apiTx.timestamp;
    if (!finalTimestamp && 'input' in apiTx && (apiTx as any).input?.timestamp) {
      finalTimestamp = (apiTx as any).input.timestamp;
    }

    // Create enhanced transaction with extracted fields
    const enhanced: Transaction = {
      ...apiTx,
      sender,
      recipient,
      amount: actualAmount,
      timestamp: finalTimestamp,
      userRole,
      actualAmount,
      amountType,
    };

    return enhanced;
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('📊 Fetching transaction history...');

      const response = await apiService.getUserTransactions();

      // 🧪 COMPREHENSIVE API RESPONSE DEBUGGING
      console.log('🌐 COMPLETE API RESPONSE DEBUG:');
      console.log('  - Response success:', response.success);
      console.log('  - Response keys:', Object.keys(response));
      console.log('  - Response.data type:', typeof response.data);
      console.log('  - Response.data is array?', Array.isArray(response.data));
      console.log('  - Raw response.data:', JSON.stringify(response.data, null, 2));
      
      if (response.data && typeof response.data === 'object') {
        console.log('  - Response.data keys:', Object.keys(response.data));
        console.log('  - Response.data values preview:', Object.values(response.data));
      }

      if (response.success && response.data) {

        let allTransactions: Transaction[] = [];

        // Type guard: check if response has confirmed/pending structure
        const hasTransactionGroups = (
          data: unknown
        ): data is TransactionApiResponse => {
          return (
            typeof data === 'object' &&
            data !== null &&
            'confirmed' in data &&
            'pending' in data
          );
        };

        if (hasTransactionGroups(response.data)) {
          console.log('📊 Found confirmed/pending structure');
          console.log('Confirmed transactions:', response.data.confirmed);
          console.log('Pending transactions:', response.data.pending);

          // Response has confirmed/pending structure
          allTransactions = [
            ...response.data.confirmed.map((apiTx: ApiTransaction) => ({
              ...enhanceTransaction(apiTx),
              status: 'confirmed' as const,
            })),
            ...response.data.pending.map((apiTx: ApiTransaction) => ({
              ...enhanceTransaction(apiTx),
              status: 'pending' as const,
            })),
          ];
        } else if (Array.isArray(response.data)) {
          console.log('📊 Found array structure');
          console.log('Transaction array:', response.data);

          // Response is a simple array of transactions
          allTransactions = response.data.map((apiTx: ApiTransaction) =>
            enhanceTransaction(apiTx)
          );
        }

        // Sort by timestamp (newest first)
        allTransactions.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setTransactions(allTransactions);
        console.log(`✅ Loaded ${allTransactions.length} transactions`);
        
        // 🧪 DEBUG: Show final processed transactions
        console.log('🎯 FINAL PROCESSED TRANSACTIONS:');
        allTransactions.forEach((tx, index) => {
          console.log(`Transaction ${index + 1}:`, {
            id: tx.id.substring(0, 8) + '...',
            userRole: tx.userRole,
            sender: tx.sender.substring(0, 20) + '...',
            recipient: tx.recipient.substring(0, 20) + '...',
            actualAmount: tx.actualAmount,
            status: tx.status,
            timestamp: tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'Invalid'
          });
        });
      }
    } catch (err: unknown) {
      console.error('❌ Failed to fetch transactions:', err);

      let errorMessage = 'Failed to load transaction history';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as {
          response?: { data?: { message?: string } };
        };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Load transactions on component mount
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    // Filter by status
    if (filter !== 'all' && tx.status !== filter) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        tx.recipient.toLowerCase().includes(searchLower) ||
        tx.sender.toLowerCase().includes(searchLower) ||
        tx.actualAmount.toString().includes(searchLower) ||
        tx.id.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Format date with better error handling
  const formatDate = (timestamp: string | number) => {
    try {
      let date: Date;

      // Handle undefined, null, or empty timestamp
      if (!timestamp) {
        return 'Pending (no timestamp)';
      }

      // Convert to number if it's a string number
      if (typeof timestamp === 'string') {
        const numTimestamp = parseInt(timestamp);
        if (!isNaN(numTimestamp)) {
          timestamp = numTimestamp;
        }
      }

      // Create date object
      date = new Date(timestamp);

      // Verify date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date format';
      }

      return date.toLocaleString();
    } catch (error) {
      console.error(
        'Date formatting error:',
        error,
        'for timestamp:',
        timestamp
      );
      return 'Date error';
    }
  };

  // Format amount with direction
  const formatAmount = (tx: Transaction) => {
    const isOutgoing = tx.userRole === 'sender';
    const prefix = isOutgoing ? '-' : '+';
    const color = isOutgoing ? '#991b1b' : '#166534';

    // Ensure we have a valid amount
    const amount = tx.actualAmount || 0;

    return (
      <span style={{ color, fontWeight: 'bold' }}>
        {prefix}
        {amount} SandiCoins
      </span>
    );
  };

  // Get status indicator
  const getStatusIndicator = (status: string) => {
    if (status === 'confirmed') {
      return <span style={{ color: '#166534' }}>✅ Confirmed</span>;
    } else {
      return <span style={{ color: '#b45309' }}>⏳ Pending</span>;
    }
  };

  return (
    <div className='w-full p-6 bg-white rounded-lg'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-2xl font-bold text-gray-800'>
          📊 Transaction History
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700 text-2xl font-bold px-3 py-1 rounded hover:bg-gray-100 transition-colors'>
            ✕
          </button>
        )}
      </div>

      {/* Controls */}
      <div className='flex flex-col sm:flex-row gap-4 mb-6'>
        {/* Filter Buttons */}
        <div className='flex gap-2'>
          {(['all', 'pending', 'confirmed'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                filter === filterOption
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}>
              {filterOption === 'all'
                ? '📋 All'
                : filterOption === 'pending'
                ? '⏳ Pending'
                : '✅ Confirmed'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className='flex-1 max-w-md'>
          <input
            type='text'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500'
            placeholder='Search transactions...'
          />
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchTransactions}
          className='px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors'
          disabled={isLoading}>
          🔄 Refresh
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className='text-center py-12'>
          <div className='text-4xl mb-4'>🔄</div>
          <p className='text-gray-600'>Loading transaction history...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6'>
          <div className='flex items-center'>
            <span className='text-red-600 text-xl mr-2'>❌</span>
            <div>
              <strong className='text-red-800'>Error:</strong>
              <span className='text-red-700 ml-2'>{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredTransactions.length === 0 && (
        <div className='text-center py-12'>
          <div className='text-6xl mb-4'>📭</div>
          <h3 className='text-xl font-bold text-gray-800 mb-2'>
            No Transactions Found
          </h3>
          <p className='text-gray-600'>
            {filter === 'all'
              ? "You haven't made any transactions yet. Start by sending some SandiCoins!"
              : `No ${filter} transactions found.`}
          </p>
        </div>
      )}

      {/* Transactions List */}
      {!isLoading && !error && filteredTransactions.length > 0 && (
        <div>
          <div className='flex justify-between items-center mb-4'>
            <p className='text-gray-600'>
              Showing {filteredTransactions.length} of {transactions.length}{' '}
              transactions
            </p>
          </div>

          <div className='space-y-4'>
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
                <div className='flex items-start justify-between'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-3 mb-2'>
                      <span className='text-2xl'>
                        {tx.userRole === 'sender' ? '📤' : '📥'}
                      </span>
                      <div>
                        <strong className='text-gray-800'>
                          {tx.userRole === 'sender'
                            ? 'Sent to'
                            : 'Received from'}
                        </strong>
                        <span className='text-gray-600 ml-2 break-all'>
                          {tx.userRole === 'sender' 
                            ? tx.recipient
                            : (tx.sender === '*authorized-reward*' ? 'Mining Reward' : tx.sender)
                          }
                        </span>
                      </div>
                    </div>

                    <div className='flex flex-wrap items-center gap-6 text-sm'>
                      <div>
                        <strong>Amount:</strong> {formatAmount(tx)}
                      </div>
                      <div>
                        <strong>Status:</strong> {getStatusIndicator(tx.status)}
                      </div>
                      <div className='text-gray-600'>
                        {formatDate(tx.timestamp)}
                      </div>
                    </div>

                    <div className='mt-3 text-sm text-gray-500'>
                      <div className='mb-1'>
                        <strong>TX ID:</strong> 
                        <span className='ml-2 font-mono break-all'>{tx.id}</span>
                      </div>
                      {tx.blockHash && (
                        <div>
                          <strong>Block:</strong> #{tx.blockIndex}
                          <span className='ml-2'>
                            • <strong>Hash:</strong> 
                            <span className='ml-2 font-mono break-all'>{tx.blockHash}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {!isLoading && !error && transactions.length > 0 && (
        <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6'>
          <h3 className='font-bold text-blue-800 mb-2'>📈 Summary</h3>
          <div className='flex flex-wrap gap-6 text-sm text-blue-700'>
            <div>
              <strong>Total Transactions:</strong> {transactions.length}
            </div>
            <div>
              <strong>Pending:</strong>{' '}
              {transactions.filter((tx) => tx.status === 'pending').length}
            </div>
            <div>
              <strong>Confirmed:</strong>{' '}
              {transactions.filter((tx) => tx.status === 'confirmed').length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
