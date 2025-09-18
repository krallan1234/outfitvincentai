-- Add is_public column to outfits table (default true for shareability)
ALTER TABLE public.outfits 
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN likes_count INTEGER NOT NULL DEFAULT 0;

-- Create outfit_likes table for the liking system
CREATE TABLE public.outfit_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_id UUID NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, outfit_id)
);

-- Enable Row Level Security
ALTER TABLE public.outfit_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for outfit_likes
CREATE POLICY "Users can view all outfit likes" 
ON public.outfit_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own likes" 
ON public.outfit_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" 
ON public.outfit_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update outfits policies to allow viewing public outfits
DROP POLICY "Users can view their own outfits" ON public.outfits;

CREATE POLICY "Users can view public outfits and their own outfits" 
ON public.outfits 
FOR SELECT 
USING (is_public = true OR auth.uid() = user_id);

-- Function to update likes count
CREATE OR REPLACE FUNCTION public.update_outfit_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.outfits 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.outfit_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.outfits 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.outfit_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers to automatically update likes count
CREATE TRIGGER outfit_like_insert_trigger
  AFTER INSERT ON public.outfit_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_outfit_likes_count();

CREATE TRIGGER outfit_like_delete_trigger
  AFTER DELETE ON public.outfit_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_outfit_likes_count();

-- Create index for better performance
CREATE INDEX idx_outfit_likes_user_id ON public.outfit_likes(user_id);
CREATE INDEX idx_outfit_likes_outfit_id ON public.outfit_likes(outfit_id);
CREATE INDEX idx_outfits_public ON public.outfits(is_public, created_at DESC) WHERE is_public = true;