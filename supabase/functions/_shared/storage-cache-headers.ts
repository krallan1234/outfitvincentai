/**
 * Optimal cache headers for Supabase Storage assets
 * 
 * These headers ensure efficient CDN caching and reduced load times.
 * Apply these when creating signed URLs or handling storage responses.
 */

export const STORAGE_CACHE_HEADERS = {
  // Cache images for 1 year (immutable content)
  IMAGE_LONG_CACHE: {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'CDN-Cache-Control': 'public, max-age=31536000',
  },
  
  // Cache images for 1 day (semi-dynamic content)
  IMAGE_SHORT_CACHE: {
    'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    'CDN-Cache-Control': 'public, max-age=86400',
  },
  
  // No cache for user-uploaded content that might change
  NO_CACHE: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'CDN-Cache-Control': 'no-store',
  },
};

/**
 * Get appropriate cache headers based on file type and usage
 */
export function getCacheHeaders(fileName: string, isUserGenerated: boolean = false): Record<string, string> {
  // No cache for user-generated content
  if (isUserGenerated) {
    return STORAGE_CACHE_HEADERS.NO_CACHE;
  }
  
  // Long cache for static assets (logos, icons, etc.)
  if (fileName.includes('/static/') || fileName.includes('/assets/')) {
    return STORAGE_CACHE_HEADERS.IMAGE_LONG_CACHE;
  }
  
  // Short cache for everything else
  return STORAGE_CACHE_HEADERS.IMAGE_SHORT_CACHE;
}

/**
 * Apply cache headers to a Response object
 */
export function withCacheHeaders(response: Response, headers: Record<string, string>): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(headers).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
