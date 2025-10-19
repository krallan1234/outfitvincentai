-- Create outfit_calendar table for scheduling outfits
CREATE TABLE public.outfit_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  outfit_id UUID NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, scheduled_date)
);

-- Enable RLS
ALTER TABLE public.outfit_calendar ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own calendar entries"
ON public.outfit_calendar
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar entries"
ON public.outfit_calendar
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar entries"
ON public.outfit_calendar
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar entries"
ON public.outfit_calendar
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_outfit_calendar_updated_at
BEFORE UPDATE ON public.outfit_calendar
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better query performance
CREATE INDEX idx_outfit_calendar_user_date ON public.outfit_calendar(user_id, scheduled_date);
CREATE INDEX idx_outfit_calendar_outfit ON public.outfit_calendar(outfit_id);