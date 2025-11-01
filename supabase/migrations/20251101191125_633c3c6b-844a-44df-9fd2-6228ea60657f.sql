-- Create outfit_item_usage table to track item usage frequency
CREATE TABLE IF NOT EXISTS public.outfit_item_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_id UUID NOT NULL,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usage_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- Enable RLS
ALTER TABLE public.outfit_item_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own item usage"
  ON public.outfit_item_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own item usage"
  ON public.outfit_item_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own item usage"
  ON public.outfit_item_usage
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_outfit_item_usage_user_id ON public.outfit_item_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_item_usage_item_id ON public.outfit_item_usage(item_id);
CREATE INDEX IF NOT EXISTS idx_outfit_item_usage_last_used ON public.outfit_item_usage(last_used_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_outfit_item_usage_updated_at
  BEFORE UPDATE ON public.outfit_item_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.outfit_item_usage IS 'Tracks how often each clothing item is used in outfit generations to promote variety';