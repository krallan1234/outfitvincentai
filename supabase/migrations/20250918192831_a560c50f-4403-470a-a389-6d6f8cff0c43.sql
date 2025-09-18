-- Create storage bucket for clothes images
INSERT INTO storage.buckets (id, name, public) VALUES ('clothes', 'clothes', true);

-- Create clothes table
CREATE TABLE public.clothes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  color TEXT,
  style TEXT,
  brand TEXT,
  description TEXT,
  ai_detected_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clothes ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own clothes" 
ON public.clothes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clothes" 
ON public.clothes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clothes" 
ON public.clothes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clothes" 
ON public.clothes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage policies for clothes bucket
CREATE POLICY "Users can view their own clothes images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'clothes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own clothes images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'clothes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own clothes images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'clothes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own clothes images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'clothes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_clothes_updated_at
BEFORE UPDATE ON public.clothes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();