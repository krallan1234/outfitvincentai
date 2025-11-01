-- Add new columns to profiles table for enhanced style profiling
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS size_information JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS occasion_preferences JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.size_information IS 'User size information: {top, bottom, shoes, dress}';
COMMENT ON COLUMN public.profiles.occasion_preferences IS 'User occasion preferences: [work, date, party, casual, etc.]';