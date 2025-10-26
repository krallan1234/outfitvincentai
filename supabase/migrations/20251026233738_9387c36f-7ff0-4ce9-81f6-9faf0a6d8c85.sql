-- Add gender and skin_tone to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS skin_tone text;

COMMENT ON COLUMN public.profiles.gender IS 'User gender for personalized outfit recommendations';
COMMENT ON COLUMN public.profiles.skin_tone IS 'User skin tone for color matching recommendations';