import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ErrorProvider } from './hooks/useErrorHandler';
import AuthForm from './components/AuthForm';
import SendTransactionForm from './components/SendTransactionForm';
import TransactionHistory from './components/TransactionHistory';
import BlockchainExplorer from './components/BlockchainExplorer';
import MiningInterface from './components/MiningInterface';
import Modal from './components/Modal';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// Main App Content (authenticated vs non-authenticated)
const AppContent: React.FC = () => {
  const { user, wallet, isAuthenticated, isLoading, logout, refreshUserData } =
    useAuth();

  // Modal state - ADD THE MISSING STATE HERE
  const [showSendModal, setShowSendModal] = useState(false);
  const [showTransactionHistoryModal, setShowTransactionHistoryModal] =
    useState(false);
  const [showBlockchainExplorer, setShowBlockchainExplorer] = useState(false);
  const [showMiningInterface, setShowMiningInterface] = useState(false); // <-- THIS WAS MISSING!
  const [successData, setSuccessData] = useState<{
    amount: number;
    recipient: string;
    recipientType: 'email' | 'address';
    transactionId: string;
    status: string;
  } | null>(null);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);

  // Enhanced refresh function with loading state
  const refreshBalanceWithLoading = async () => {
    setIsRefreshingBalance(true);
    try {
      await refreshUserData();
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  // Auto-refresh balance to detect incoming transactions
  useEffect(() => {
    if (!isAuthenticated) return;

    // Auto-refresh balance every 15 seconds to catch incoming transactions
    const balanceRefreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing balance for incoming transactions...');
      refreshUserData();
    }, 15000);

    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        console.log('👁️ Tab became visible, refreshing balance...');
        refreshUserData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(balanceRefreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, refreshUserData]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='text-2xl mb-4'>🔄</div>
          <p className='text-lg'>Loading SandiCoin...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div
        className='min-h-screen flex items-center justify-center'
        style={{ backgroundColor: 'var(--sandicoin-bg)' }}>
        <AuthForm /> {/* <- Change this line */}
      </div>
    );
  }

  // Show dashboard if authenticated
  return (
    <div
      className='min-h-screen'
      style={{ backgroundColor: 'var(--sandicoin-bg)' }}>
      {/* Header */}
      <header
        className='card'
        style={{
          margin: 0,
          borderRadius: 0,
          borderBottom: '1px solid var(--sandicoin-border)',
        }}>
        <div className='container flex justify-between items-center'>
          <div className='flex items-center gap-4'>
            <h1
              className='text-2xl font-bold'
              style={{ color: 'var(--sandicoin-primary)' }}>
              🪙 SandiCoin
            </h1>
            <span style={{ color: 'var(--sandicoin-secondary)' }}>
              Welcome, {user?.firstName}!
            </span>
          </div>

          <div className='flex items-center gap-4'>
            <div className='text-center'>
              <div className='flex items-center justify-center gap-2 mb-2'>
                <div
                  className='text-lg font-bold'
                  style={{ color: 'var(--sandicoin-success)' }}>
                  💰 {wallet?.balance || 0} SandiCoins
                </div>
                <button
                  onClick={refreshBalanceWithLoading}
                  disabled={isRefreshingBalance}
                  className={`text-xs opacity-60 hover:opacity-100 transition-opacity ${
                    isRefreshingBalance ? 'animate-spin' : ''
                  }`}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--sandicoin-secondary)',
                    cursor: isRefreshingBalance ? 'not-allowed' : 'pointer',
                    padding: '2px'
                  }}
                  title="Refresh balance manually">
                  🔄
                </button>
              </div>
              <small style={{ color: 'var(--sandicoin-secondary)' }}>
                Wallet Balance (auto-updates)
              </small>
            </div>

            <button onClick={logout} className='btn btn-secondary'>
              👋 Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='container p-4'>
        <div className='flex flex-col gap-6'>
          {/* Welcome Section */}
          <div className='card'>
            <h2 className='text-xl font-bold mb-4'>🎉 Welcome to SandiCoin!</h2>
            <p className='mb-4'>
              You have successfully logged into your cryptocurrency wallet. Your
              account is secured and ready for transactions.
            </p>

            <div className='flex gap-4 mb-6'>
              <div
                className='card'
                style={{ flex: 1, backgroundColor: '#f0f9ff' }}>
                <h3 className='font-bold mb-2'>👤 Account Info</h3>
                <p>
                  <strong>Name:</strong> {user?.firstName} {user?.lastName}
                </p>
                <p>
                  <strong>Email:</strong> {user?.email}
                </p>
                <p>
                  <strong>Role:</strong> {user?.role}
                </p>
              </div>

              <div
                className='card'
                style={{ flex: 1, backgroundColor: '#f0fdf4' }}>
                <h3 className='font-bold mb-2'>🔑 Wallet Info</h3>
                <p>
                  <strong>Balance:</strong> {wallet?.balance} SandiCoins
                </p>
                <p>
                  <strong>Address:</strong> {wallet?.publicKey}
                </p>
                <p>
                  <strong>Status:</strong> Active
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className='card'>
            <h2 className='text-xl font-bold mb-4 text-center'>⚡ Quick Actions</h2>
            <div className='flex gap-4 justify-center'>
              <button
                className='btn btn-outline'
                onClick={() => setShowSendModal(true)}>
                💸 Send Coins
              </button>
              <button
                className='btn btn-outline'
                onClick={() => setShowTransactionHistoryModal(true)}>
                📊 View Transactions
              </button>
              <button
                onClick={() => setShowBlockchainExplorer(true)}
                className='btn btn-outline'>
                🔗 Explore Blockchain
              </button>
              <button
                onClick={() => setShowMiningInterface(true)}
                className='btn btn-outline'>
                ⛏️ Mine Block
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className='card'>
            <h2 className='text-xl font-bold mb-4 text-center'>🌐 System Status</h2>
            <div className='flex gap-4 justify-center'>
              <div style={{ color: '#166534' }}>✅ Backend Connected</div>
              <div style={{ color: '#166534' }}>✅ Wallet Active</div>
              <div style={{ color: '#166534' }}>✅ Authentication Valid</div>
            </div>
          </div>
        </div>
      </main>

      {/* Transaction History Modal */}
      <Modal
        isOpen={showTransactionHistoryModal}
        onClose={() => setShowTransactionHistoryModal(false)}
        title="📊 Transaction History"
        maxWidth="90vw">
        <TransactionHistory />
      </Modal>

      {/* Send Transaction Modal */}
      <Modal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        title="💸 Send SandiCoins"
        maxWidth="500px"
        disableBackdropClose={true}>
        <SendTransactionForm
          onTransactionCreated={(data) => {
            setSuccessData(data || null);
          }}
          onCancel={() => setShowSendModal(false)}
        />
      </Modal>

      {/* Blockchain Explorer Modal */}
      <Modal
        isOpen={showBlockchainExplorer}
        onClose={() => setShowBlockchainExplorer(false)}
        title="🔗 Blockchain Explorer"
        maxWidth="95vw">
        <BlockchainExplorer />
      </Modal>

      {/* Mining Interface Modal */}
      <Modal
        isOpen={showMiningInterface}
        onClose={() => setShowMiningInterface(false)}
        title="⛏️ Mining Interface"
        maxWidth="95vw">
        <MiningInterface />
      </Modal>

      {/* Success Popup */}
      <Modal
        isOpen={!!successData}
        onClose={() => setSuccessData(null)}
        maxWidth="400px"
        backgroundColor="#ffffff"
        showCloseButton={false}>
        {successData && (
          <div style={{ border: '3px solid #16a34a', borderRadius: '16px', padding: '24px' }}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '28px' }}>🎉</span>
                <h3
                  className="text-xl font-bold"
                  style={{ color: '#166534', margin: 0 }}>
                  Transaction Sent Successfully!
                </h3>
              </div>
              <button
                onClick={() => setSuccessData(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#166534',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '0 4px',
                }}>
                ✕
              </button>
            </div>

            <div style={{ fontSize: '15px', lineHeight: '1.6', color: '#374151' }}>
              <div className="mb-2">
                <strong style={{ color: '#166534' }}>Amount:</strong>{' '}
                {successData.amount} SandiCoins
              </div>
              <div className="mb-2">
                <strong style={{ color: '#166534' }}>To:</strong>{' '}
                {successData.recipient}
              </div>
              <div className="mb-2">
                <strong style={{ color: '#166534' }}>Type:</strong>{' '}
                {successData.recipientType === 'email'
                  ? 'Email Address'
                  : 'Wallet Address'}
              </div>
              <div className="mb-2">
                <strong style={{ color: '#166534' }}>Transaction ID:</strong>{' '}
                {successData.transactionId}
              </div>
              <div className="mb-4">
                <strong style={{ color: '#166534' }}>Status:</strong>{' '}
                <span style={{ color: '#b45309', fontWeight: 'bold' }}>
                  ⏳ Pending (awaiting mining)
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSuccessData(null);
                    setShowSendModal(false);
                  }}
                  className="btn btn-primary"
                  style={{ flex: 1 }}>
                  ✅ Close & Done
                </button>
                <button
                  onClick={() => setSuccessData(null)}
                  className="btn btn-outline"
                  style={{ flex: 1 }}>
                  📝 Send Another
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// Main App Component with Provider
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ErrorProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ErrorProvider>
    </ErrorBoundary>
  );
};

export default App;
