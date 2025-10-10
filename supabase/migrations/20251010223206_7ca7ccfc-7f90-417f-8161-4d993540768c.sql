-- Add purchase_links column to outfits table
ALTER TABLE public.outfits 
ADD COLUMN IF NOT EXISTS purchase_links jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.outfits.purchase_links IS 'Array of purchase link objects with store_name, price, and url fields';