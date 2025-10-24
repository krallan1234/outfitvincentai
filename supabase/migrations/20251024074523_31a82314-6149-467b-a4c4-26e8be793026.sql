-- Add texture_maps column to clothes table for storing AI-generated texture maps
ALTER TABLE public.clothes 
ADD COLUMN IF NOT EXISTS texture_maps JSONB DEFAULT NULL;

-- Add comment to document the structure
COMMENT ON COLUMN public.clothes.texture_maps IS 'AI-generated texture maps: {diffuse_url, normal_url, roughness_url, alpha_url, metadata}';
