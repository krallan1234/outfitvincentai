-- Create Pinterest trends cache table for persistent caching
CREATE TABLE public.pinterest_trends_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL UNIQUE,
  query TEXT NOT NULL,
  pins_data JSONB NOT NULL,
  ai_context TEXT,
  dominant_colors TEXT[],
  trending_keywords TEXT[],
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  fetch_count INTEGER DEFAULT 1
);

-- Create indexes for performance
CREATE INDEX idx_pinterest_cache_query ON pinterest_trends_cache(query_hash);
CREATE INDEX idx_pinterest_cache_expires ON pinterest_trends_cache(expires_at);

-- Enable RLS (no policies needed - edge functions will use service role)
ALTER TABLE public.pinterest_trends_cache ENABLE ROW LEVEL SECURITY;

-- Function to clean old cache entries
CREATE OR REPLACE FUNCTION public.clean_old_pinterest_cache()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.pinterest_trends_cache
  WHERE expires_at < NOW() - INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to automatically clean old cache entries
CREATE TRIGGER trigger_clean_pinterest_cache
AFTER INSERT ON public.pinterest_trends_cache
FOR EACH ROW
EXECUTE FUNCTION public.clean_old_pinterest_cache();