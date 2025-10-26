# Build & Bundle Optimization Guide

## Bundle Analysis

To analyze your bundle size and identify optimization opportunities:

```bash
npm run build -- --mode=analyze
```

This will:
- Generate `bundle-analysis.html` in your project root
- Show a visual tree map of your bundle
- Display gzip and brotli compressed sizes
- Highlight the largest dependencies

## Optimizations Applied

### 1. Image Optimization
- **OptimizedImage Component**: Automatic WebP/AVIF format selection
- **Blur Placeholders**: LQIP for smooth loading experience
- **Lazy Loading**: All images load only when visible
- **Responsive Images**: srcset for different screen sizes

### 2. Code Splitting
Chunks created:
- `react-vendor`: React core libraries
- `ui-vendor`: Radix UI components
- `chart-vendor`: Recharts
- `supabase-vendor`: Supabase client

### 3. Build Optimization
- Tree-shaking enabled
- Minification
- Chunk size warnings at 1000kb
- Modern ES modules

## Usage

Replace regular `<img>` tags with `<OptimizedImage>`:

```tsx
import { OptimizedImage } from '@/components/ui/optimized-image';

<OptimizedImage
  src={imageUrl}
  alt="Description"
  sizes="(max-width: 640px) 100vw, 50vw"
  blurDataURL={blurPlaceholder}
/>
```

## Performance Monitoring

After deploying:
1. Run Lighthouse audit
2. Check Core Web Vitals
3. Monitor bundle size trends
4. Review network waterfall

Expected improvements:
- 40-60% faster initial load
- 30-50% better LCP
- Reduced memory usage
