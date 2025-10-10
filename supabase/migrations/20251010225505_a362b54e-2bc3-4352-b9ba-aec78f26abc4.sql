-- Add personalization fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS body_type text,
ADD COLUMN IF NOT EXISTS style_preferences jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS favorite_colors jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS location text;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.body_type IS 'User body type for better outfit fit suggestions (e.g., athletic, curvy, petite, tall)';
COMMENT ON COLUMN public.profiles.style_preferences IS 'Array of preferred style tags (e.g., ["casual", "sporty", "elegant"])';
COMMENT ON COLUMN public.profiles.favorite_colors IS 'Array of favorite colors for outfit suggestions';
COMMENT ON COLUMN public.profiles.location IS 'User location for weather-based outfit suggestions';