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
 * Batch version for multiple URLs
 */
export const useSignedUrls = (bucket: string, paths: string[], expiresIn: number = 86400) => {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
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
        
        // Use edge function to get signed URLs (requires service role key)
        const { data, error: signError } = await supabase.functions.invoke('get-signed-urls', {
          body: { 
            urls: paths,
            expiresIn 
          }
        });

        if (signError) throw signError;
        if (data?.signedUrls) {
          setSignedUrls(data.signedUrls);
        } else {
          throw new Error('No signed URLs returned');
        }
      } catch (err) {
        console.error('Failed to get signed URLs:', err);
        setError(err instanceof Error ? err : new Error('Failed to get signed URLs'));
        setSignedUrls({});
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
