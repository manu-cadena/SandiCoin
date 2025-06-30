import React, { createContext, useContext, useState, type ReactNode } from 'react';
import ErrorToast from '../components/ErrorToast';

interface ErrorMessage {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  duration?: number;
}

interface ErrorContextType {
  showError: (message: string, type?: 'error' | 'warning' | 'info', duration?: number) => void;
  clearErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<ErrorMessage[]>([]);

  const showError = (message: string, type: 'error' | 'warning' | 'info' = 'error', duration = 5000) => {
    const id = Date.now().toString();
    const newError: ErrorMessage = { id, message, type, duration };
    
    setErrors(prev => [...prev, newError]);
  };

  const removeError = (id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  const contextValue: ErrorContextType = {
    showError,
    clearErrors,
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
      
      {/* Render error toasts */}
      <div className="error-toast-container">
        {errors.map((error, index) => (
          <div
            key={error.id}
            style={{
              position: 'fixed',
              top: `${20 + index * 80}px`,
              right: '20px',
              zIndex: 1000 + index,
            }}>
            <ErrorToast
              message={error.message}
              type={error.type}
              duration={error.duration}
              onClose={() => removeError(error.id)}
            />
          </div>
        ))}
      </div>
    </ErrorContext.Provider>
  );
};

export const useErrorHandler = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useErrorHandler must be used within an ErrorProvider');
  }
  return context;
};