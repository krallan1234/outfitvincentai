# Outfit Generation Caching

## Overview

The outfit generation system implements intelligent caching to reduce AI costs and improve response times. When a user generates an outfit with the same prompt and mood, the system returns the cached result instead of making a new AI call.

## How It Works

### Cache Key Generation
- Cache keys are SHA-256 hashes of: `prompt + user_id + mood`
- Each user's cache is isolated (prompt "summer outfit" for user A ≠ prompt "summer outfit" for user B)
- Mood variations create different cache entries

### Cache Behavior
- **Cache Duration**: 24 hours from creation
- **Cache Skip Conditions**: When user selects specific clothing items to build around
- **Cache Hit Tracking**: Increments `hit_count` each time a cached result is reused

### Rate Limiting
- **Limit**: 5 outfit generations per minute per user
- **Purpose**: Prevent abuse and control costs
- **Error**: Returns 429 status with user-friendly message

## Cache Table Schema

```sql
CREATE TABLE outfit_generation_cache (
  id UUID PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  mood TEXT,
  outfit_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER DEFAULT 0
);
```

## Cache Cleanup

### Manual Cleanup
Call the `cleanup-outfit-cache` edge function to remove expired entries:

```bash
curl -X POST https://bichfpvapfibrpplrtcr.supabase.co/functions/v1/cleanup-outfit-cache
```

### Automatic Cleanup (Recommended)
Set up a cron job using Supabase's pg_cron extension:

```sql
-- Run cleanup daily at 3 AM
SELECT cron.schedule(
  'cleanup-outfit-cache',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bichfpvapfibrpplrtcr.supabase.co/functions/v1/cleanup-outfit-cache',
    headers := '{"Content-Type": "application/json"}'::jsonb
  )
  $$
);
```

### Cleanup Logic
1. **Expired entries**: Removes all entries where `expires_at < NOW()`
2. **Old unused entries**: Removes entries older than 7 days with `hit_count = 0`

## User Experience

### Cache Hit Indicators
- **Toast Notification**: "⚡ Instant Result - This outfit was retrieved from cache - no AI cost incurred!"
- **Response Metadata**: `fromCache: true` in API response
- **Performance**: ~100ms response time vs ~5-10s for AI generation

### Benefits
- ✅ **Faster responses** for repeat queries
- ✅ **Reduced AI costs** (saves ~$0.02-0.05 per cached hit)
- ✅ **Better UX** with instant results
- ✅ **Environmentally friendly** (reduced compute)

## Monitoring Cache Performance

Query cache statistics:

```sql
-- Cache hit rate
SELECT 
  COUNT(*) as total_entries,
  SUM(hit_count) as total_hits,
  AVG(hit_count) as avg_hits_per_entry,
  COUNT(*) FILTER (WHERE hit_count > 0) as entries_with_hits
FROM outfit_generation_cache;

-- Most popular cached prompts
SELECT 
  prompt,
  mood,
  hit_count,
  created_at,
  expires_at
FROM outfit_generation_cache
ORDER BY hit_count DESC
LIMIT 10;

-- Cache age distribution
SELECT 
  EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as age_hours,
  hit_count,
  prompt
FROM outfit_generation_cache
ORDER BY created_at DESC
LIMIT 20;
```

## Security

- **RLS Enabled**: Users can only access their own cache entries
- **Policies**: Full CRUD policies restrict access to `auth.uid() = user_id`
- **Isolation**: Cache keys include user_id, preventing cross-user data leakage

## Cost Savings Example

Assuming:
- AI cost per generation: ~$0.03
- Average cache hit rate: 30%
- 1000 generations per day

**Savings per day**: 1000 × 0.30 × $0.03 = **$9/day** = **$270/month**

## Future Improvements

- [ ] Implement smart cache invalidation when user's wardrobe changes
- [ ] Add cache warming for popular prompts
- [ ] Implement tiered caching (hot/warm/cold)
- [ ] Add analytics dashboard for cache performance
- [ ] Implement cache sharing for similar prompts (with privacy controls)
