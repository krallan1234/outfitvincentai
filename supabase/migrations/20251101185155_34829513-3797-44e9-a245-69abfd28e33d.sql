-- Create outfit_feedback table for user feedback on generated outfits
CREATE TABLE IF NOT EXISTS public.outfit_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  outfit_id UUID NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('like', 'dislike')),
  confidence_score DECIMAL(3,2),
  style_context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, outfit_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_outfit_feedback_user ON public.outfit_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_feedback_outfit ON public.outfit_feedback(outfit_id);

-- Enable RLS
ALTER TABLE public.outfit_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for outfit_feedback
CREATE POLICY "Users can view their own feedback"
  ON public.outfit_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
  ON public.outfit_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback"
  ON public.outfit_feedback FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback"
  ON public.outfit_feedback FOR DELETE
  USING (auth.uid() = user_id);

-- Add new columns to outfits table
ALTER TABLE public.outfits 
  ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 8.5,
  ADD COLUMN IF NOT EXISTS trend_relevance DECIMAL(3,2) DEFAULT 8.0,
  ADD COLUMN IF NOT EXISTS weather_score DECIMAL(3,2) DEFAULT 8.5,
  ADD COLUMN IF NOT EXISTS styling_tips JSONB DEFAULT '[]'::jsonb;