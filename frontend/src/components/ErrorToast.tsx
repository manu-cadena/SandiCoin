import React, { useEffect, useState } from 'react';

interface ErrorToastProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

const ErrorToast: React.FC<ErrorToastProps> = ({ 
  message, 
  type = 'error', 
  duration = 5000,
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300); // Allow fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const getStyles = () => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: '⚠️'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'ℹ️'
        };
      default:
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: '❌'
        };
    }
  };

  const styles = getStyles();

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md p-4 ${styles.bg} ${styles.border} border rounded-lg shadow-lg transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{styles.icon}</span>
        <div className="flex-1">
          <p className={`text-sm ${styles.text}`}>{message}</p>
        </div>
        <button
          onClick={handleClose}
          className={`${styles.text} hover:opacity-70 flex-shrink-0`}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          ✕
        </button>
      </div>
    </div>
  );
};

export default ErrorToast;