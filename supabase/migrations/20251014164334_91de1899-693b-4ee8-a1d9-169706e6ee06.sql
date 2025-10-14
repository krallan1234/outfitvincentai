-- Fix: Missing Unique Constraints Enable Duplicate Abuse
-- Add unique constraints to prevent duplicate likes and follows

-- Add unique constraint to outfit_likes to prevent duplicate likes
ALTER TABLE outfit_likes 
ADD CONSTRAINT outfit_likes_user_outfit_unique 
UNIQUE (user_id, outfit_id);

-- Add unique constraint to comment_likes to prevent duplicate likes
ALTER TABLE comment_likes 
ADD CONSTRAINT comment_likes_user_comment_unique 
UNIQUE (user_id, comment_id);

-- Add unique constraint to user_follows to prevent duplicate follows
ALTER TABLE user_follows 
ADD CONSTRAINT user_follows_follower_following_unique 
UNIQUE (follower_id, following_id);

-- Prevent users from following themselves
ALTER TABLE user_follows 
ADD CONSTRAINT user_follows_no_self_follow 
CHECK (follower_id != following_id);