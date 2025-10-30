# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/2c95fd08-586c-4e21-9ff9-bea6ea888afc

## Code Structure

This project follows a modular architecture with strict TypeScript typing:

### Type Definitions (`src/types/`)
- `outfit.ts` - Outfit and clothing item types with Zod validation
- `generator.ts` - Outfit generation parameters and state types

### Custom Hooks (`src/hooks/`)
- `useOutfitGeneration.ts` - Main outfit generation logic and API calls
- `useUserPreferences.ts` - User preferences management
- `usePurchaseLinks.ts` - Purchase links state management
- `useClothes.ts` - Clothing items data management
- `useWeather.ts` - Weather data integration

### Components (`src/components/`)
- `OutfitGenerator.tsx` - Main outfit generator container
- `outfit-generator/` - Modular sub-components:
  - `PromptEditor.tsx` - Outfit prompt input
  - `QuickPrompts.tsx` - Quick prompt selection
  - `ContextSelectors.tsx` - Mood/occasion/Pinterest selectors
  - `ResultPreview.tsx` - Generated outfit preview modal
  - `ResultControls.tsx` - Generation and regeneration controls

## Code Quality & Linting

### ESLint Configuration
The project uses strict TypeScript ESLint rules:
- No implicit `any` types
- Explicit function return types where needed
- React hooks rules enforcement
- Unused variables detection

Run linting:
```bash
npm run lint
```

### Prettier Configuration
Code formatting is enforced with Prettier:
- Single quotes
- 2 space indentation
- 90 character line width
- Trailing commas

Format code:
```bash
npm run format
```

### Pre-commit Hooks (Setup Required)

To enable automatic linting and formatting before commits:

```bash
# Install husky
npm install -D husky

# Initialize husky
npx husky init

# Create pre-commit hook
echo "npm run lint && npm run format" > .husky/pre-commit
chmod +x .husky/pre-commit
```

Add these scripts to `package.json`:
```json
{
  "scripts": {
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,css}\"",
    "type-check": "tsc --noEmit"
  }
}
```

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/2c95fd08-586c-4e21-9ff9-bea6ea888afc) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- React Query (@tanstack/react-query)
- Zustand (state management)
- Zod (validation)

## Performance Optimizations

### Bundle Analysis
Run bundle analysis to inspect chunk sizes:
```bash
npm run build -- --mode analyze
```
This generates `bundle-analysis.html` with detailed bundle breakdown.

### PWA Support
- **Service Worker**: Automatic caching for offline functionality
- **Image Caching**: Workbox strategies for optimal image loading
- **API Caching**: NetworkFirst strategy for Supabase calls
- **Installable**: Add to home screen on mobile devices
- **Manifest**: Full PWA manifest with shortcuts

### Code Splitting Strategy
Optimized bundle chunks:
- `react-vendor`: React, React DOM, React Router
- `query-vendor`: TanStack React Query
- `ui-vendor`: Radix UI components
- `supabase-vendor`: Supabase client
- `utils-vendor`: Lodash, Zod, date-fns
- `chart-vendor`: Recharts

### Image Optimization
- **OptimizedImage Component**: Lazy loading with blur placeholders
- **Responsive Sizes**: Automatic srcset generation
- **WebP/AVIF**: Modern format support
- **Loading Strategy**: Native lazy loading + intersection observer fallback

### React Query Caching
- **5-minute stale time** for user data
- **Automatic refetching** on window focus
- **Optimistic updates** for instant UI feedback
- **Query invalidation** for data consistency
- **Retry logic**: 2-3 retries with exponential backoff

### Infinite Scroll
History page uses infinite scroll via `useInfiniteQuery` for efficient large dataset handling.

### Performance Utilities
`src/lib/performance.ts` provides:
- `measurePerformance()` - Measure operation timing
- `reportWebVitals()` - Track Core Web Vitals
- `prefetchRoute()` - Prefetch routes for faster navigation
- `debounce()` / `throttle()` - Rate limiting helpers

### Lighthouse Performance Goals
**Target: 100/100 Performance Score**

Metrics:
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Total Blocking Time: < 200ms
- Cumulative Layout Shift: < 0.1
- Speed Index: < 3.4s

**Production Optimizations:**
- Terser minification with console removal
- CSS code splitting
- Gzip/Brotli compression
- 1000kb chunk size limit

## Security & Configuration

### Edge Functions Best Practices

All Supabase Edge Functions follow production-ready practices:

#### 1. Request Validation
- **Zod schemas** for strict input validation
- Type-safe request/response handling
- Validation error responses with field-level details

#### 2. Authentication & Authorization
- JWT validation enforced via `verify_jwt = true` in `supabase/config.toml`
- User authorization checks (authenticated user must match requested user)
- Proper 401/403 status codes for auth failures

#### 3. Error Handling
- Proper HTTP status codes (4xx client errors, 5xx server errors)
- Structured error responses with error codes
- Specific handling for rate limits, auth errors, validation errors

#### 4. Retry Logic
- Exponential backoff for transient failures
- Configurable retry parameters (max 3 retries)
- Smart retry on specific status codes (408, 429, 500, 502, 503, 504)

#### 5. Structured Logging
- JSON-formatted logs for easy parsing
- Log levels: INFO, WARN, ERROR
- Request tracing with processing time metrics

**Example Edge Function**: See `supabase/functions/generate-outfit/README.md` for detailed implementation.

### Environment Variables

This project uses hardcoded Supabase configuration in the client code (`src/integrations/supabase/client.ts`). The following are public and safe to commit:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon/public key

**Never commit private keys or secrets to the repository.**

### Secrets Management

Private API keys and secrets should be stored as **Supabase Secrets** and accessed only from Edge Functions:

1. Navigate to your Supabase project dashboard
2. Go to Settings → Edge Functions
3. Add your secrets (e.g., `OPENAI_API_KEY`, `PINTEREST_API_KEY`)
4. Access them in Edge Functions via `Deno.env.get('SECRET_NAME')`

**Example Edge Function with secrets:**

```typescript
const apiKey = Deno.env.get('OPENAI_API_KEY');
if (!apiKey) {
  throw new Error('API key not configured');
}
```

### CORS Configuration

Edge Functions are configured to accept requests from your production domain. If you need to allow additional domains, update the `corsHeaders` in each Edge Function:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### Rate Limiting

Edge Functions include basic rate limiting to prevent abuse. If you need to adjust limits, modify the rate limiting logic in individual functions.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/2c95fd08-586c-4e21-9ff9-bea6ea888afc) and click on Share → Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
