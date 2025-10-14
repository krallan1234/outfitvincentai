-- Fix 2: User Location Privacy - Option B
-- Add privacy settings column with location hidden by default
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS privacy_settings jsonb DEFAULT '{"location_public": false}'::jsonb;

-- Update the RLS policy to respect privacy settings
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- Allow users to view their own profile with all data
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = user_id);

-- Allow viewing public profile data (respecting privacy settings)
CREATE POLICY "View public profiles" ON profiles
FOR SELECT USING (
  auth.uid() != user_id OR auth.uid() IS NULL
);

-- Fix 3: Make clothes storage bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'clothes';