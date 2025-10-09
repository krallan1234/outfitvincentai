-- Add refresh token and expiration tracking to pinterest_boards table
ALTER TABLE pinterest_boards
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for token expiration queries
CREATE INDEX IF NOT EXISTS idx_pinterest_boards_token_expires 
ON pinterest_boards(token_expires_at);

-- Update existing records to have a default expiration (30 days from now)
UPDATE pinterest_boards 
SET token_expires_at = NOW() + INTERVAL '30 days'
WHERE token_expires_at IS NULL;