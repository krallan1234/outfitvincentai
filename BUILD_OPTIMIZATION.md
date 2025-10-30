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

## UX Enhancements

### 1. Loading States
- ✅ Skeleton loading in `ResultPreview` component
- ✅ Toast notifications via Sonner ("Generating with AI...")
- ✅ Progressive loading states in `useOutfitGeneration`

### 2. Dark Mode
- ✅ Tailwind dark mode with `dark:` classes
- ✅ localStorage persistence
- ✅ System preference detection
- ✅ Animated theme toggle with toast feedback

### 3. Mobile Responsiveness
- ✅ Responsive breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- ✅ Mobile-first padding: `px-4 sm:px-6 lg:px-8`
- ✅ Touch-friendly button sizes
- ✅ Optimized card layouts for mobile

### 4. Enhanced Quick Prompts
- ✅ 24 categorized prompts across 6 categories:
  - Casual (4 prompts)
  - Business (4 prompts)
  - Evening (4 prompts)
  - Active (4 prompts)
  - Weather (4 prompts)
  - Special (4 prompts)
- ✅ Hover effects with scale transform
- ✅ Organized by category with clear labels

### 5. Weather Integration
- ✅ Real OpenWeather API integration
- ✅ Auto-generated outfit prompts based on weather:
  - Rainy → "Rainy day outfit with waterproof layers"
  - Snowy → "Cozy winter layers"
  - Hot (>25°C) → "Summer light breathable outfit"
  - Cold (<10°C) → "Warm winter outfit with layers"
- ✅ Weather toast notifications with suggestions
- ✅ `suggestedPrompt` return value for UI integration

### 6. Toast Notifications
- ✅ Generation start/success/error toasts
- ✅ Theme toggle feedback
- ✅ Weather data notifications
- ✅ Save/share action confirmations
- ✅ Cache hit notifications

## Google Gemini AI Integration
- ✅ Replaced Lovable AI with Google Gemini 1.5 Flash
- ✅ Structured JSON output with schema validation
- ✅ Rate limiting: 5 generations/minute per user
- ✅ Direct Gemini API calls (no proxy)
