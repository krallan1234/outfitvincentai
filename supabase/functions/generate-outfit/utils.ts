// Logging utility with structured logs
export class Logger {
  constructor(private context: string) {}

  info(message: string, meta?: Record<string, any>) {
    console.log(JSON.stringify({
      level: 'INFO',
      context: this.context,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  }

  warn(message: string, meta?: Record<string, any>) {
    console.warn(JSON.stringify({
      level: 'WARN',
      context: this.context,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, any>) {
    console.error(JSON.stringify({
      level: 'ERROR',
      context: this.context,
      message,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  }
}

// Exponential backoff retry utility
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    retryableStatuses?: number[];
    logger?: Logger;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    retryableStatuses = [408, 429, 500, 502, 503, 504],
    logger,
  } = options;

  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      const isRetryable = error instanceof Response 
        ? retryableStatuses.includes(error.status)
        : true;

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt),
        maxDelayMs
      );

      logger?.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
        attempt: attempt + 1,
        maxRetries,
        delayMs: delay,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// HTTP error response helper
export function errorResponse(
  status: number,
  message: string,
  code?: string,
  details?: Record<string, any>,
  headers?: Record<string, string>
) {
  return new Response(
    JSON.stringify({
      error: {
        message,
        code: code || `ERROR_${status}`,
        details,
      },
      success: false,
    }),
    {
      status,
      headers: { 
        'Content-Type': 'application/json',
        ...headers,
      },
    }
  );
}

// Success response helper
export function successResponse<T>(
  data: T, 
  meta?: Record<string, any>,
  headers?: Record<string, string>
) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      meta,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        ...headers,
      },
    }
  );
}

// Validate authentication from JWT
export function getAuthUserId(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;

  try {
    // Extract JWT from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');
    
    // Decode JWT (basic decode, Supabase validates it)
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}
