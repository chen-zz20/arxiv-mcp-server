export class ArxivServerError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ArxivServerError';
  }
}

export class NetworkError extends ArxivServerError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', 503, details);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends ArxivServerError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ArxivServerError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ArxivServerError {
  constructor(message: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT', 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class StorageError extends ArxivServerError {
  constructor(message: string, details?: any) {
    super(message, 'STORAGE_ERROR', 500, details);
    this.name = 'StorageError';
  }
}

export class PdfParseError extends ArxivServerError {
  constructor(message: string, details?: any) {
    super(message, 'PDF_PARSE_ERROR', 422, details);
    this.name = 'PdfParseError';
  }
}

export function isRetryableError(error: any): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof RateLimitError) return true;
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
  if (error.response?.status >= 500) return true;
  return false;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!isRetryableError(error) || attempt === maxRetries - 1) {
        throw error;
      }
      
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
