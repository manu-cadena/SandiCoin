import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginForm from './components/LoginForm';
import SendTransactionForm from './components/SendTransactionForm';
import TransactionHistory from './components/TransactionHistory';
import './App.css';

// Main App Content (authenticated vs non-authenticated)
const AppContent: React.FC = () => {
  const { user, wallet, isAuthenticated, isLoading, logout, refreshUserData } =
    useAuth();

  // Modal state
  const [showSendModal, setShowSendModal] = useState(false);
  const [showTransactionHistoryModal, setShowTransactionHistoryModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    amount: number;
    recipient: string;
    recipientType: 'email' | 'address';
    transactionId: string;
    status: string;
  } | null>(null);

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
        <LoginForm />
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
                  onClick={() => {
                    console.log('🔄 Refreshing balance...');
                    refreshUserData();
                  }}
                  className='btn'
                  style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--sandicoin-primary)',
                    color: 'var(--sandicoin-primary)',
                    borderRadius: '4px',
                  }}
                  title='Refresh Balance'>
                  🔄
                </button>
              </div>
              <small style={{ color: 'var(--sandicoin-secondary)' }}>
                Wallet Balance
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
                  <strong>Address:</strong> {wallet?.publicKey?.slice(0, 10)}...
                </p>
                <p>
                  <strong>Status:</strong> Active
                </p>
              </div>
            </div>

          </div>

          {/* Quick Actions */}
          <div className='card'>
            <h2 className='text-xl font-bold mb-4'>⚡ Quick Actions</h2>
            <div className='flex gap-4'>
              <button
                className='btn btn-primary'
                onClick={() => setShowSendModal(true)}>
                💸 Send Coins
              </button>
              <button 
                className='btn btn-outline'
                onClick={() => setShowTransactionHistoryModal(true)}>
                📊 View Transactions
              </button>
              <button className='btn btn-outline'>⛓️ Explore Blockchain</button>
              <button className='btn btn-outline'>⛏️ Mine Block</button>
            </div>
          </div>

          {/* System Status */}
          <div className='card'>
            <h2 className='text-xl font-bold mb-4'>🌐 System Status</h2>
            <div className='flex gap-4'>
              <div style={{ color: '#166534' }}>✅ Backend Connected</div>
              <div style={{ color: '#166534' }}>✅ Wallet Active</div>
              <div style={{ color: '#166534' }}>✅ Authentication Valid</div>
            </div>
          </div>
        </div>
      </main>

      {/* Transaction History Modal */}
      {showTransactionHistoryModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) {
              setShowTransactionHistoryModal(false);
            }
          }}>
          <div
            style={{
              backgroundColor: 'var(--sandicoin-card)',
              borderRadius: '12px',
              padding: 0,
              maxWidth: '90vw',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow:
                '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}>
            <TransactionHistory onClose={() => setShowTransactionHistoryModal(false)} />
          </div>
        </div>
      )}

      {/* Send Transaction Modal */}
      {showSendModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) {
              setShowSendModal(false);
            }
          }}>
          <div
            style={{
              backgroundColor: 'var(--sandicoin-card)',
              borderRadius: '12px',
              padding: 0,
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow:
                '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}>
            <SendTransactionForm
              onTransactionCreated={(data) => {
                setShowSendModal(false);
                setSuccessData(data || null);
              }}
              onCancel={() => setShowSendModal(false)}
            />
          </div>
        </div>
      )}

      {/* Success Popup */}
      {successData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSuccessData(null);
            }
          }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '3px solid #16a34a',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              animation: 'slideIn 0.3s ease-out',
            }}>
            <div className='flex justify-between items-start mb-4'>
              <div className='flex items-center gap-3'>
                <span style={{ fontSize: '28px' }}>🎉</span>
                <h3
                  className='text-xl font-bold'
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

            <div
              style={{ fontSize: '15px', lineHeight: '1.6', color: '#374151' }}>
              <div className='mb-2'>
                <strong style={{ color: '#166534' }}>Amount:</strong>{' '}
                {successData.amount} SandiCoins
              </div>
              <div className='mb-2'>
                <strong style={{ color: '#166534' }}>To:</strong>{' '}
                {successData.recipient}
              </div>
              <div className='mb-2'>
                <strong style={{ color: '#166534' }}>Type:</strong>{' '}
                {successData.recipientType === 'email'
                  ? 'Email Address'
                  : 'Wallet Address'}
              </div>
              <div className='mb-2'>
                <strong style={{ color: '#166534' }}>Transaction ID:</strong>{' '}
                {successData.transactionId}...
              </div>
              <div className='mb-4'>
                <strong style={{ color: '#166534' }}>Status:</strong>{' '}
                <span style={{ color: '#b45309', fontWeight: 'bold' }}>
                  ⏳ Pending (awaiting mining)
                </span>
              </div>

              <button
                onClick={() => setSuccessData(null)}
                className='btn btn-primary'
                style={{ width: '100%' }}>
                ✅ Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App Component with Provider
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
