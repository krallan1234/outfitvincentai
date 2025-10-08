-- Create table for Pinterest board connections
CREATE TABLE IF NOT EXISTS public.pinterest_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  board_id TEXT NOT NULL,
  board_name TEXT NOT NULL,
  board_url TEXT,
  access_token TEXT NOT NULL,
  pins_data JSONB,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, board_id)
);

-- Enable RLS
ALTER TABLE public.pinterest_boards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Pinterest boards"
  ON public.pinterest_boards
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Pinterest boards"
  ON public.pinterest_boards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Pinterest boards"
  ON public.pinterest_boards
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Pinterest boards"
  ON public.pinterest_boards
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_pinterest_boards_updated_at
  BEFORE UPDATE ON public.pinterest_boards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();