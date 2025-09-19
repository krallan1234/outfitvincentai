-- Make all existing outfits public and remove the privacy feature
UPDATE public.outfits SET is_public = true WHERE is_public = false;