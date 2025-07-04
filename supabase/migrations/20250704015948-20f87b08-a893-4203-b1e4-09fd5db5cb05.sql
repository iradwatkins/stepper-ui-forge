-- Create follower_promotions table that's being referenced in the code
CREATE TABLE public.follower_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL,
  follower_id UUID NOT NULL,
  promotion_type TEXT NOT NULL DEFAULT 'standard',
  discount_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(organizer_id, follower_id)
);

-- Enable Row Level Security
ALTER TABLE public.follower_promotions ENABLE ROW LEVEL SECURITY;

-- Create policies for follower promotions
CREATE POLICY "Users can view promotions for their events" 
ON public.follower_promotions 
FOR SELECT 
USING (auth.uid() = organizer_id);

CREATE POLICY "Users can create promotions for their events" 
ON public.follower_promotions 
FOR INSERT 
WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Users can update promotions for their events" 
ON public.follower_promotions 
FOR UPDATE 
USING (auth.uid() = organizer_id);

CREATE POLICY "Users can delete promotions for their events" 
ON public.follower_promotions 
FOR DELETE 
USING (auth.uid() = organizer_id);

-- Create updated_at trigger
CREATE TRIGGER update_follower_promotions_updated_at
BEFORE UPDATE ON public.follower_promotions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();