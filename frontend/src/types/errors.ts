// Enhanced error types for better error handling

export class ApiError extends Error {
  public status?: number;
  public code?: string;
  public details?: unknown;

  constructor(
    message: string,
    status?: number,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network connection failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error {
  public field?: string;
  public validationCode?: string;

  constructor(
    message: string,
    field?: string,
    validationCode?: string
  ) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.validationCode = validationCode;
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export type AppError = 
  | ApiError 
  | NetworkError 
  | ValidationError 
  | AuthenticationError 
  | AuthorizationError 
  | Error;

// Error handling utility functions
export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};

export const isNetworkError = (error: unknown): error is NetworkError => {
  return error instanceof NetworkError || 
         (error instanceof Error && error.message.includes('Network'));
};

export const isValidationError = (error: unknown): error is ValidationError => {
  return error instanceof ValidationError;
};

export const isAuthError = (error: unknown): error is AuthenticationError => {
  return error instanceof AuthenticationError;
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  
  return 'An unknown error occurred';
};

export const handleApiError = (error: unknown): AppError => {
  // Handle Axios errors
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: {
          message?: string;
          code?: string;
          details?: { field?: string; code?: string };
        };
      };
      message?: string;
    };

    if (axiosError.response) {
      const status = axiosError.response.status || 500;
      const message = axiosError.response.data?.message || axiosError.message || 'API request failed';
      const code = axiosError.response.data?.code;
      const details = axiosError.response.data?.details;

      switch (status) {
        case 401:
          return new AuthenticationError(message);
        case 403:
          return new AuthorizationError(message);
        case 422:
          return new ValidationError(message, details?.field, details?.code);
        default:
          return new ApiError(message, status, code, details);
      }
    }
  }

  // Handle network errors
  if (typeof error === 'object' && error !== null && ('request' in error || 'code' in error)) {
    const networkError = error as { message?: string; code?: string };
    if (networkError.code === 'NETWORK_ERROR') {
      return new NetworkError(networkError.message || 'Network connection failed');
    }
  }

  // Return as generic error
  return error instanceof Error ? error : new Error(getErrorMessage(error));
};