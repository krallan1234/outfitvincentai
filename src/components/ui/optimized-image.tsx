import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  blurDataURL?: string;
  sizes?: string;
  priority?: boolean;
}

/**
 * Optimized Image Component with:
 * - WebP/AVIF support with fallbacks
 * - Blur placeholder (LQIP)
 * - Responsive srcset
 * - Lazy loading (unless priority)
 * - Progressive loading states
 */
export const OptimizedImage = ({
  src,
  alt,
  className,
  blurDataURL,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  ...props
}: OptimizedImageProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>(src);

  // Generate responsive image URLs for different sizes
  // Note: This assumes Supabase Storage transform API or CDN support
  const generateSrcSet = (baseSrc: string) => {
    // If it's a Supabase URL, we can use transformation params
    if (baseSrc.includes('supabase.co/storage')) {
      const sizes = [320, 640, 768, 1024, 1280, 1536];
      return sizes
        .map(size => {
          // Add width transformation parameter
          const url = new URL(baseSrc);
          url.searchParams.set('width', size.toString());
          url.searchParams.set('quality', '80');
          return `${url.toString()} ${size}w`;
        })
        .join(', ');
    }
    return undefined;
  };

  // Generate WebP version of the image
  const generateWebPSrc = (baseSrc: string) => {
    if (baseSrc.includes('supabase.co/storage')) {
      const url = new URL(baseSrc);
      url.searchParams.set('format', 'webp');
      url.searchParams.set('quality', '85');
      return url.toString();
    }
    return baseSrc;
  };

  // Generate AVIF version (most modern format)
  const generateAVIFSrc = (baseSrc: string) => {
    if (baseSrc.includes('supabase.co/storage')) {
      const url = new URL(baseSrc);
      url.searchParams.set('format', 'avif');
      url.searchParams.set('quality', '80');
      return url.toString();
    }
    return baseSrc;
  };

  useEffect(() => {
    setCurrentSrc(src);
    setImageLoaded(false);
    setImageError(false);
  }, [src]);

  const handleLoad = () => {
    setImageLoaded(true);
  };

  const handleError = () => {
    setImageError(true);
  };

  if (imageError) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-muted text-muted-foreground',
          className
        )}
        role="img"
        aria-label="Image failed to load"
      >
        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="text-xs text-center">Image unavailable</span>
      </div>
    );
  }

  const srcSet = generateSrcSet(currentSrc);
  const webpSrc = generateWebPSrc(currentSrc);
  const avifSrc = generateAVIFSrc(currentSrc);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Blur placeholder */}
      {!imageLoaded && blurDataURL && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-lg scale-110 transition-opacity duration-300"
          style={{ backgroundImage: `url(${blurDataURL})` }}
          aria-hidden="true"
        />
      )}

      {/* Loading skeleton */}
      {!imageLoaded && !blurDataURL && (
        <div className="absolute inset-0 bg-muted animate-pulse" aria-hidden="true" />
      )}

      {/* Modern browser support: AVIF > WebP > original */}
      <picture>
        {/* AVIF format (best compression, modern browsers) */}
        {avifSrc !== currentSrc && (
          <source type="image/avif" srcSet={avifSrc} sizes={sizes} />
        )}

        {/* WebP format (good compression, wide support) */}
        {webpSrc !== currentSrc && (
          <source type="image/webp" srcSet={webpSrc} sizes={sizes} />
        )}

        {/* Original format (fallback) */}
        <img
          src={currentSrc}
          alt={alt}
          srcSet={srcSet}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            imageLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          {...props}
        />
      </picture>

      {/* Loading indicator */}
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};
