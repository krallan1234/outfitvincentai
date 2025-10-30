import { Redis } from 'https://esm.sh/@upstash/redis@1.28.2';
import { Ratelimit } from 'https://esm.sh/@upstash/ratelimit@1.0.1';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL') || '',
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '',
});

// Create rate limiter: 10 requests per minute
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'),
  analytics: true,
});

export const checkRateLimit = async (
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> => {
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    return {
      success,
      remaining,
      reset: reset,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if rate limiting is unavailable
    return { success: true, remaining: 10, reset: Date.now() + 60000 };
  }
};

export const rateLimitHeaders = (
  remaining: number,
  reset: number
): Record<string, string> => {
  return {
    'X-RateLimit-Limit': '10',
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(reset).toISOString(),
  };
};
