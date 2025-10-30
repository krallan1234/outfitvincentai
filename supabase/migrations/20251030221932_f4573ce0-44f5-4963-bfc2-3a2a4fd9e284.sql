-- Enable realtime for outfits table
ALTER TABLE public.outfits REPLICA IDENTITY FULL;

-- Add outfits table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.outfits;

-- Enable realtime for outfit_likes table
ALTER TABLE public.outfit_likes REPLICA IDENTITY FULL;

-- Add outfit_likes table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.outfit_likes;