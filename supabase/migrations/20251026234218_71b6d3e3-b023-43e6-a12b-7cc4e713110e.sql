-- Create outfit generation cache table
CREATE TABLE IF NOT EXISTS public.outfit_generation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  mood TEXT,
  outfit_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.outfit_generation_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own cache"
  ON public.outfit_generation_cache
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cache"
  ON public.outfit_generation_cache
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cache"
  ON public.outfit_generation_cache
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cache"
  ON public.outfit_generation_cache
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_outfit_cache_key ON public.outfit_generation_cache(cache_key);
CREATE INDEX idx_outfit_cache_user_created ON public.outfit_generation_cache(user_id, created_at DESC);
CREATE INDEX idx_outfit_cache_expires ON public.outfit_generation_cache(expires_at);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_outfit_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.outfit_generation_cache
  WHERE expires_at < NOW();
END;
$$;

COMMENT ON TABLE public.outfit_generation_cache IS 'Caches generated outfits to avoid redundant AI calls';
COMMENT ON COLUMN public.outfit_generation_cache.cache_key IS 'SHA-256 hash of prompt + user_id + mood';
COMMENT ON COLUMN public.outfit_generation_cache.expires_at IS 'Cache expiry time (24 hours from creation)';
COMMENT ON COLUMN public.outfit_generation_cache.hit_count IS 'Number of times this cache entry was used';