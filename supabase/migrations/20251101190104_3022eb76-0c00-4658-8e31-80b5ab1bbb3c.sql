-- Create outfit_favorites table for saving favorite outfits
CREATE TABLE IF NOT EXISTS public.outfit_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  outfit_id UUID NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, outfit_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_outfit_favorites_user ON public.outfit_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_favorites_outfit ON public.outfit_favorites(outfit_id);

-- Enable RLS
ALTER TABLE public.outfit_favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own favorites"
  ON public.outfit_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
  ON public.outfit_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
  ON public.outfit_favorites FOR DELETE
  USING (auth.uid() = user_id);