import { useEffect } from 'react';
import { useClothes } from './useClothes';
import { prefetchSignedUrls } from './useSignedUrl';

/**
 * Prefetch clothing images on mount for faster loading
 * Call this hook in a top-level component after user logs in
 */
export const usePrefetchImages = () => {
  const { clothes } = useClothes();

  useEffect(() => {
    if (clothes.length === 0) return;

    // Prefetch signed URLs in background
    const imagePaths = clothes.map(item => item.image_url);
    prefetchSignedUrls('clothes', imagePaths, 86400); // 24h expiry
  }, [clothes]);
};
