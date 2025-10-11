-- Create outfit schedules table
CREATE TABLE public.outfit_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_id UUID REFERENCES public.outfits(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  occasion TEXT,
  notes TEXT,
  is_worn BOOLEAN DEFAULT FALSE,
  worn_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create packing lists table
CREATE TABLE public.packing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_name TEXT NOT NULL,
  destination TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  occasion TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  ai_suggestions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.outfit_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_lists ENABLE ROW LEVEL SECURITY;

-- RLS policies for outfit_schedules
CREATE POLICY "Users can view their own schedules"
  ON public.outfit_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own schedules"
  ON public.outfit_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedules"
  ON public.outfit_schedules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedules"
  ON public.outfit_schedules FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for packing_lists
CREATE POLICY "Users can view their own packing lists"
  ON public.packing_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own packing lists"
  ON public.packing_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own packing lists"
  ON public.packing_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own packing lists"
  ON public.packing_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_outfit_schedules_user_date ON public.outfit_schedules(user_id, scheduled_date);
CREATE INDEX idx_packing_lists_user_dates ON public.packing_lists(user_id, start_date, end_date);

-- Trigger for updated_at
CREATE TRIGGER update_outfit_schedules_updated_at
  BEFORE UPDATE ON public.outfit_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_packing_lists_updated_at
  BEFORE UPDATE ON public.packing_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();