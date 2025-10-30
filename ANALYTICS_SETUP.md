# Analytics & Features Setup Guide

## PostHog Analytics Integration

### Setup Instructions
1. **Create PostHog Account**: Go to https://posthog.com/ and sign up
2. **Get Your Project API Key**: 
   - After creating your project, go to Project Settings
   - Copy your Project API Key (starts with `phc_`)
3. **Add Key to index.html**:
   - Open `index.html`
   - Find line with `const posthogKey = 'phc_YOUR_PROJECT_KEY';`
   - Replace with your actual key

### Tracked Events
The app automatically tracks:
- `outfit_generated` - When user generates a new outfit
- `outfit_liked` - When user favorites an outfit
- `outfit_shared` - When user shares an outfit
- `page_viewed` - Page navigation tracking
- `clothing_uploaded` - When user uploads clothing items
- `search_performed` - Search queries
- `load_more_history` - Infinite scroll pagination

### Usage in Code
```typescript
import { analytics } from '@/lib/analytics';

// Track custom events
analytics.track('custom_event', { key: 'value' });

// Track user
analytics.identify(userId, { 
  display_name: 'John Doe',
  email: 'john@example.com' 
});

// Convenience methods
analytics.trackOutfitGenerated({ mood: 'casual', items: 5 });
analytics.trackPageView('dashboard');
```

## Favorites Feature

### How It Works
- Heart button appears on outfit cards
- Data stored in `outfit_likes` table in Supabase
- Real-time sync across devices
- Likes count updates automatically via RLS triggers

### Usage
```typescript
import { useFavorites } from '@/hooks/useFavorites';

const { toggleFavorite, isFavorited } = useFavorites();

// Check if outfit is favorited
const isLiked = isFavorited(outfitId);

// Toggle favorite status
await toggleFavorite(outfitId);
```

## Realtime Collaboration

### Features
- Live updates when outfits are created/updated/deleted
- Instant notifications via toast messages
- Automatic query invalidation and re-fetch
- Uses Supabase Realtime with PostgreSQL changes

### How It Works
The `useRealtimeOutfits` hook subscribes to database changes:
```typescript
import { useRealtimeOutfits } from '@/hooks/useRealtimeOutfits';

// Enable realtime in your component
useRealtimeOutfits(userId);
```

### Realtime Events
- `INSERT` - New outfit created → "🎉 New outfit generated!"
- `UPDATE` - Outfit modified → Automatic refresh
- `DELETE` - Outfit removed → "Outfit removed" notification

## Database Configuration

### Required Supabase Setup
The following is already configured in your database:

1. **outfit_likes table** - Stores favorite relationships
   - `user_id` (UUID, references auth.users)
   - `outfit_id` (UUID, references outfits)
   - RLS policies for user access

2. **RLS Policies**:
   ```sql
   -- Users can view all likes
   CREATE POLICY "Users can view all outfit likes" ON outfit_likes FOR SELECT USING (true);
   
   -- Users can create their own likes
   CREATE POLICY "Users can create their own likes" ON outfit_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
   
   -- Users can delete their own likes
   CREATE POLICY "Users can delete their own likes" ON outfit_likes FOR DELETE USING (auth.uid() = user_id);
   ```

3. **Triggers** - Auto-update likes_count on outfits table

## Testing

### Test Favorites
1. Navigate to /community or /history
2. Click heart button on any outfit
3. Check /favorites page to see saved outfits
4. Click heart again to remove

### Test Realtime
1. Open app in two browser tabs
2. Generate outfit in Tab 1
3. Watch Tab 2 automatically update with toast notification

### Test Analytics
1. Perform actions (generate outfit, like, etc.)
2. Open browser console to see tracked events
3. Check PostHog dashboard for event data

## Performance Notes
- Favorites load instantly from indexed database
- Realtime has minimal overhead (~1KB/message)
- Analytics batches events for efficiency
- All queries cached via React Query (5min stale time)
