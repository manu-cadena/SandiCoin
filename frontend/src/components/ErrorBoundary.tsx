import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Report error to monitoring service if needed
    if (import.meta.env.PROD) {
      // In production, you might want to send errors to a service like Sentry
      console.error('Production error caught by ErrorBoundary:', {
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--sandicoin-bg)' }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
            <div className="text-center mb-6">
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💥</div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--sandicoin-error)' }}>
                Oops! Something went wrong
              </h1>
              <p style={{ color: 'var(--sandicoin-secondary)', marginTop: '0.5rem' }}>
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary"
              >
                🔄 Refresh Page
              </button>
              <button
                onClick={() => window.history.back()}
                className="btn btn-secondary"
              >
                ← Go Back
              </button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6" style={{ marginTop: '2rem' }}>
                <summary 
                  style={{ 
                    cursor: 'pointer', 
                    color: 'var(--sandicoin-secondary)',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                >
                  🔍 Error Details (Development Mode)
                </summary>
                <div 
                  style={{ 
                    marginTop: '1rem',
                    padding: '1rem',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontFamily: 'monospace',
                    color: '#991b1b'
                  }}
                >
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Stack Trace:</strong>
                      <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded" style={{ marginTop: '2rem' }}>
              <h3 className="font-bold text-sm mb-2">💡 What can you do?</h3>
              <ul className="text-sm space-y-1" style={{ color: 'var(--sandicoin-secondary)' }}>
                <li>• Try refreshing the page</li>
                <li>• Check your internet connection</li>
                <li>• Clear your browser cache and cookies</li>
                <li>• Try again in a few minutes</li>
                <li>• Contact support if the problem persists</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;