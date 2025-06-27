import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import webSocketService from '../services/websocket';

// Types for notifications
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
  autoHide?: boolean;
}

// Connection status type
type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Return type for the hook
interface UseRealtimeReturn {
  // Connection status
  connectionStatus: ConnectionStatus;
  isConnected: boolean;

  // Notifications
  notifications: Notification[];
  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp'>
  ) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Real-time events
  onBalanceUpdate: (callback: () => void) => () => void;
  onTransactionConfirmed: (
    callback: (transactionId: string) => void
  ) => () => void;
  onNewBlockMined: (callback: (block: any) => void) => () => void;
  onNetworkStatsUpdate: (callback: (stats: any) => void) => () => void;

  // Manual controls
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

export const useRealtime = (): UseRealtimeReturn => {
  const { user, wallet, isAuthenticated } = useAuth();

  // State
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Computed values
  const isConnected = connectionStatus === 'connected';

  // Generate unique notification ID
  const generateNotificationId = () =>
    `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add notification
  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp'>) => {
      const newNotification: Notification = {
        ...notification,
        id: generateNotificationId(),
        timestamp: Date.now(),
        autoHide: notification.autoHide !== false, // Default to auto-hide unless explicitly set to false
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 10)); // Keep only latest 10

      // Auto-hide notification after 5 seconds for non-error notifications
      if (newNotification.autoHide && notification.type !== 'error') {
        setTimeout(() => {
          removeNotification(newNotification.id);
        }, 5000);
      }
    },
    []
  );

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (isAuthenticated && user && wallet) {
      console.log('🔌 Connecting to real-time updates...');
      webSocketService.connect(user, wallet.publicKey);
    }
  }, [isAuthenticated, user, wallet]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from real-time updates...');
    webSocketService.disconnect();
  }, []);

  // Reconnect to WebSocket
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000); // Wait 1 second before reconnecting
  }, [connect, disconnect]);

  // Event subscription helpers
  const onBalanceUpdate = useCallback((callback: () => void) => {
    webSocketService.on('balance-update', callback);
    return () => webSocketService.off('balance-update', callback);
  }, []);

  const onTransactionConfirmed = useCallback(
    (callback: (transactionId: string) => void) => {
      webSocketService.on('transaction-confirmed', callback);
      return () => webSocketService.off('transaction-confirmed', callback);
    },
    []
  );

  const onNewBlockMined = useCallback((callback: (block: any) => void) => {
    webSocketService.on('new-block-mined', callback);
    return () => webSocketService.off('new-block-mined', callback);
  }, []);

  const onNetworkStatsUpdate = useCallback((callback: (stats: any) => void) => {
    webSocketService.on('network-stats-update', callback);
    return () => webSocketService.off('network-stats-update', callback);
  }, []);

  // Setup WebSocket event listeners
  useEffect(() => {
    // Connection status listener
    const handleConnectionStatus = (status: ConnectionStatus) => {
      setConnectionStatus(status);

      // Add connection status notifications
      switch (status) {
        case 'connected':
          console.log('✅ Real-time connection established');
          break;
        case 'connecting':
          console.log('🔄 Establishing real-time connection...');
          break;
        case 'error':
          console.log('❌ Real-time connection error');
          break;
        case 'disconnected':
          console.log('🔌 Real-time connection closed');
          break;
      }
    };

    // Notification listener
    const handleNotification = (notification: {
      type: 'info' | 'success' | 'warning' | 'error';
      message: string;
    }) => {
      addNotification(notification);
    };

    // Subscribe to WebSocket events
    webSocketService.on('connection-status', handleConnectionStatus);
    webSocketService.on('notification', handleNotification);

    // Cleanup function
    return () => {
      webSocketService.off('connection-status', handleConnectionStatus);
      webSocketService.off('notification', handleNotification);
    };
  }, [addNotification]);

  // Auto-connect when user logs in
  useEffect(() => {
    if (isAuthenticated && user && wallet) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount or logout
    return () => {
      disconnect();
    };
  }, [isAuthenticated, user, wallet, connect, disconnect]);

  // Return hook interface
  return {
    // Connection status
    connectionStatus,
    isConnected,

    // Notifications
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,

    // Event subscriptions
    onBalanceUpdate,
    onTransactionConfirmed,
    onNewBlockMined,
    onNetworkStatsUpdate,

    // Manual controls
    connect,
    disconnect,
    reconnect,
  };
};
