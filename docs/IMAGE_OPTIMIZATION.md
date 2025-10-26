# Image Optimization Guide

This document describes the image optimization strategies implemented in the application.

## Features Implemented

### 1. Modern Image Formats (WebP/AVIF)

The `OptimizedImage` component automatically serves images in modern formats:
- **AVIF**: Best compression, supported by modern browsers
- **WebP**: Good compression, wide browser support
- **Fallback**: Original format for older browsers

```tsx
<OptimizedImage
  src="/path/to/image.jpg"
  alt="Description"
  sizes="(max-width: 640px) 100vw, 50vw"
/>
```

### 2. Responsive Images (srcset)

Images are served in multiple sizes based on device width:
- 320px, 640px, 768px, 1024px, 1280px, 1536px
- Automatic selection based on viewport size
- Reduces bandwidth on mobile devices

### 3. Blur Placeholders (LQIP)

Low-Quality Image Placeholders provide smooth loading experience:
- Tiny placeholder shown immediately
- Blurred effect during image load
- Smooth transition to full image

### 4. Virtualization (react-window)

For large galleries (>20 items):
- Only renders visible items
- Dramatically reduces DOM nodes
- Smooth scrolling performance
- Memory efficient

Usage:
```tsx
<VirtualizedClothesGallery
  selectionMode={false}
  onSelectItem={handleSelect}
/>
```

### 5. Lazy Loading

All non-critical images use lazy loading:
- Only loads when entering viewport
- Reduces initial page load
- Saves bandwidth for off-screen images

### 6. CDN Caching

Optimal cache headers for Supabase Storage:
```typescript
// Long cache (1 year) for static assets
'Cache-Control': 'public, max-age=31536000, immutable'

// Short cache (1 day) for dynamic content
'Cache-Control': 'public, max-age=86400, s-maxage=86400'
```

## Supabase Storage Configuration

### Transform API

Supabase Storage supports on-the-fly image transformation:

```typescript
// Get WebP version
const url = new URL(imageUrl);
url.searchParams.set('format', 'webp');
url.searchParams.set('quality', '85');

// Get specific size
url.searchParams.set('width', '640');
url.searchParams.set('height', '640');
```

### Recommended Bucket Settings

For the `clothes` bucket:
```sql
-- Enable public access for better CDN caching
UPDATE storage.buckets 
SET public = true 
WHERE id = 'clothes';

-- Add cache-control header
UPDATE storage.buckets 
SET file_size_limit = 10485760, -- 10MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
WHERE id = 'clothes';
```

## Bundle Size Optimization

### Analyze Bundle

Run bundle analysis:
```bash
npm run build -- --mode=analyze
```

This generates `bundle-analysis.html` showing:
- Chunk sizes
- Dependencies
- Potential optimizations

### Code Splitting

The build configuration splits code into optimized chunks:
- `react-vendor`: React core (shared across app)
- `ui-vendor`: UI components (Radix UI)
- `chart-vendor`: Chart libraries
- `supabase-vendor`: Supabase client

### Tree Shaking

Unused code is automatically removed during build:
- Import only what you use
- Use named imports: `import { Button } from '@/components/ui/button'`
- Avoid `import * as` patterns

## Performance Metrics

Expected improvements:
- **Initial Load**: 40-60% faster
- **Largest Contentful Paint (LCP)**: 30-50% improvement
- **Cumulative Layout Shift (CLS)**: Minimized by placeholders
- **Memory Usage**: 70-80% reduction in large galleries

## Best Practices

### Uploading Images

1. **Optimize before upload**:
   - Compress images to 80-85% quality
   - Resize to max 2048px width
   - Convert to WebP if possible

2. **Generate thumbnails**:
   ```typescript
   // Generate thumbnail on upload
   const thumbnail = await generateThumbnail(imageFile, 320, 320);
   await uploadToStorage('clothes', `${id}_thumb.webp`, thumbnail);
   ```

3. **Store blur placeholder**:
   ```typescript
   // Generate 10x10 blur placeholder
   const blurData = await generateBlurDataURL(imageFile);
   // Store in database metadata
   ```

### Using Images in Components

```tsx
// ✅ Good - optimized
<OptimizedImage
  src={signedUrl}
  alt="Clothing item"
  blurDataURL={item.blur_placeholder}
  sizes="(max-width: 640px) 50vw, 33vw"
/>

// ❌ Bad - unoptimized
<img src={url} alt="Item" />
```

### Gallery Performance

```tsx
// ✅ Good - virtualized for large lists
{items.length > 20 ? (
  <VirtualizedClothesGallery items={items} />
) : (
  <ClothesGallery items={items} />
)}

// ❌ Bad - render all items
{items.map(item => <Card key={item.id} />)}
```

## Monitoring

Track image performance:
1. **Lighthouse**: Run in Chrome DevTools
2. **Web Vitals**: Monitor LCP, CLS, FID
3. **Bundle Analysis**: Regular checks on bundle size
4. **Network Tab**: Check image sizes and formats served

## Future Improvements

1. **Server-side thumbnail generation**:
   - Generate WebP/AVIF on upload
   - Multiple sizes (small, medium, large)
   - Store in separate bucket

2. **Smart blur placeholders**:
   - Generate blurhash on upload
   - Store in database
   - Decode on client

3. **Image CDN integration**:
   - CloudFlare Images
   - Imgix
   - Cloudinary

4. **Progressive JPEGs**:
   - Enable progressive rendering
   - Better perceived performance
