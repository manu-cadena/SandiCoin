import React from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginForm from './components/LoginForm';
import './App.css';

// Main App Content (authenticated vs non-authenticated)
const AppContent: React.FC = () => {
  const { user, wallet, isAuthenticated, isLoading, logout, refreshUserData } =
    useAuth();

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
              <div
                className='text-lg font-bold'
                style={{ color: 'var(--sandicoin-success)' }}>
                💰 {wallet?.balance || 0} SandiCoins
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

            <div className='flex gap-4'>
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
              <button className='btn btn-primary'>💸 Send Coins</button>
              <button className='btn btn-outline'>📊 View Transactions</button>
              <button className='btn btn-outline'>⛓️ Explore Blockchain</button>
              <button className='btn btn-outline'>⛏️ Mine Block</button>
            </div>
          </div>

          {/* System Status */}
          <div className='card'>
            <h2 className='text-xl font-bold mb-4'>🌐 System Status</h2>
            <div className='flex gap-4'>
              <div style={{ color: 'var(--sandicoin-success)' }}>
                ✅ Backend Connected
              </div>
              <div style={{ color: 'var(--sandicoin-success)' }}>
                ✅ Wallet Active
              </div>
              <div style={{ color: 'var(--sandicoin-success)' }}>
                ✅ Authentication Valid
              </div>
            </div>
          </div>
        </div>
      </main>
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
