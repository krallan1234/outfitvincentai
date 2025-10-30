import { logger } from './logger';

/**
 * Measures and logs performance metrics
 */
export const measurePerformance = (metricName: string, callback: () => void): void => {
  const start = performance.now();
  callback();
  const end = performance.now();
  const duration = end - start;

  logger.debug('Performance metric', {
    metric: metricName,
    duration: `${duration.toFixed(2)}ms`,
  });
};

/**
 * Reports Web Vitals to analytics
 */
export const reportWebVitals = (metric: {
  name: string;
  value: number;
  delta: number;
}): void => {
  logger.info('Web Vital', {
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
  });

  // You can send to analytics service here
  // Example: analytics.track('web-vital', metric);
};

/**
 * Prefetch a URL for faster navigation
 */
export const prefetchRoute = (url: string): void => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
};

/**
 * Lazy load images with Intersection Observer
 */
export const lazyLoadImage = (img: HTMLImageElement): void => {
  if ('loading' in HTMLImageElement.prototype) {
    img.loading = 'lazy';
  } else {
    // Fallback for browsers that don't support native lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const lazyImg = entry.target as HTMLImageElement;
            const src = lazyImg.dataset.src;
            if (src) {
              lazyImg.src = src;
              lazyImg.classList.remove('lazy');
              observer.unobserve(lazyImg);
            }
          }
        });
      },
      {
        rootMargin: '50px',
      }
    );

    observer.observe(img);
  }
};

/**
 * Debounce function for performance optimization
 */
export const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function for performance optimization
 */
export const throttle = <T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};
