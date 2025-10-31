import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get signed URLs for private storage buckets
 * Automatically refreshes URLs before they expire
 */
export const useSignedUrl = (bucket: string, path: string | null, expiresIn: number = 86400) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!path) {
      setSignedUrl(null);
      return;
    }

    const getSignedUrl = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Extract storage path from full URL if needed (backward compatibility)
        const storagePath = extractStoragePath(path);
        
        // If it's already a full public URL, use it directly (for old images)
        if (path.startsWith('http') && path.includes('/storage/v1/object/public/')) {
          setSignedUrl(path);
          setLoading(false);
          return;
        }
        
        // Use edge function to get signed URL (requires service role key)
        const { data, error: signError } = await supabase.functions.invoke('get-signed-urls', {
          body: { 
            urls: [storagePath],
            expiresIn 
          }
        });

        if (signError) throw signError;
        if (data?.signedUrls?.[storagePath]) {
          setSignedUrl(data.signedUrls[storagePath]);
        } else {
          throw new Error('No signed URL returned');
        }
      } catch (err) {
        console.error('Failed to get signed URL:', err);
        setError(err instanceof Error ? err : new Error('Failed to get signed URL'));
        setSignedUrl(null);
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();

    // Refresh URL before it expires (90% of expiry time)
    const refreshInterval = setInterval(getSignedUrl, expiresIn * 0.9 * 1000);

    return () => clearInterval(refreshInterval);
  }, [bucket, path, expiresIn]);

  return { signedUrl, loading, error };
};

/**
 * Cache key helper for localStorage
 */
const getCacheKey = (bucket: string, path: string) => `signed_url_${bucket}_${path}`;

/**
 * Clear all cached signed URLs for a bucket
 * Used when new items are added to invalidate cache
 */
export const clearSignedUrlCache = (bucket: string) => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`signed_url_${bucket}_`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`[useSignedUrl] Cleared ${keysToRemove.length} cached URLs for bucket: ${bucket}`);
  } catch (err) {
    console.warn('[useSignedUrl] Failed to clear cache:', err);
  }
};

/**
 * Get cached signed URL from localStorage
 */
const getCachedUrl = (bucket: string, path: string): string | null => {
  try {
    const cached = localStorage.getItem(getCacheKey(bucket, path));
    if (!cached) return null;
    
    const { url, expiresAt } = JSON.parse(cached);
    // Return if still valid (with 5 min buffer)
    if (Date.now() < expiresAt - 300000) return url;
    
    // Remove expired cache
    localStorage.removeItem(getCacheKey(bucket, path));
    return null;
  } catch {
    return null;
  }
};

/**
 * Cache signed URL in localStorage
 */
const setCachedUrl = (bucket: string, path: string, url: string, expiresIn: number) => {
  try {
    const expiresAt = Date.now() + (expiresIn * 1000);
    localStorage.setItem(getCacheKey(bucket, path), JSON.stringify({ url, expiresAt }));
  } catch (err) {
    console.warn('Failed to cache signed URL:', err);
  }
};

/**
 * Batch version for multiple URLs with localStorage caching
 */
export const useSignedUrls = (bucket: string, paths: string[], expiresIn: number = 86400) => {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>(() => {
    // Initialize with cached URLs
    const cached: Record<string, string> = {};
    paths.forEach(path => {
      const cachedUrl = getCachedUrl(bucket, path);
      if (cachedUrl) cached[path] = cachedUrl;
    });
    return cached;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (paths.length === 0) {
      setSignedUrls({});
      return;
    }

    const getSignedUrls = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check cache first
        const cached: Record<string, string> = {};
        const pathsToFetch: string[] = [];
        
        paths.forEach(path => {
          const cachedUrl = getCachedUrl(bucket, path);
          if (cachedUrl) {
            cached[path] = cachedUrl;
          } else {
            pathsToFetch.push(path);
          }
        });
        
        // If all URLs are cached, use cache
        if (pathsToFetch.length === 0) {
          setSignedUrls(cached);
          setLoading(false);
          return;
        }
        
        // Set cached URLs immediately for faster perceived performance
        if (Object.keys(cached).length > 0) {
          setSignedUrls(prev => ({ ...prev, ...cached }));
        }
        
        // Fetch missing URLs
        const { data, error: signError } = await supabase.functions.invoke('get-signed-urls', {
          body: { 
            urls: pathsToFetch,
            expiresIn 
          }
        });

        if (signError) throw signError;
        if (data?.signedUrls) {
          // Cache the new URLs
          Object.entries(data.signedUrls).forEach(([path, url]) => {
            setCachedUrl(bucket, path, url as string, expiresIn);
          });
          
          // Merge with cached URLs
          setSignedUrls(prev => ({ ...prev, ...data.signedUrls }));
        }
      } catch (err) {
        console.error('Failed to get signed URLs:', err);
        setError(err instanceof Error ? err : new Error('Failed to get signed URLs'));
      } finally {
        setLoading(false);
      }
    };

    getSignedUrls();

    // Refresh URLs before they expire (90% of expiry time)
    const refreshInterval = setInterval(getSignedUrls, expiresIn * 0.9 * 1000);

    return () => clearInterval(refreshInterval);
  }, [bucket, paths.join(','), expiresIn]);

  return { signedUrls, loading, error };
};

/**
 * Prefetch signed URLs in the background (call on login)
 */
export const prefetchSignedUrls = async (bucket: string, paths: string[], expiresIn: number = 86400) => {
  try {
    const pathsToFetch = paths.filter(path => !getCachedUrl(bucket, path));
    if (pathsToFetch.length === 0) return;
    
    const { data } = await supabase.functions.invoke('get-signed-urls', {
      body: { urls: pathsToFetch, expiresIn }
    });
    
    if (data?.signedUrls) {
      Object.entries(data.signedUrls).forEach(([path, url]) => {
        setCachedUrl(bucket, path, url as string, expiresIn);
      });
    }
  } catch (err) {
    console.warn('Failed to prefetch signed URLs:', err);
  }
};

/**
 * Utility function to extract path from full URL or return path as-is
 */
export const extractStoragePath = (url: string): string => {
  if (!url) return '';
  
  // If it's already a path (doesn't start with http), return as-is
  if (!url.startsWith('http')) return url;
  
  // Extract path from public URL format
  // Format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
  const match = url.match(/\/storage\/v1\/object\/public\/[^\/]+\/(.+)$/);
  return match ? match[1] : url;
};
