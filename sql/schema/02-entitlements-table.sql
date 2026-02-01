-- Entitlements Table Schema
-- Tracks which courses/content users have access to

CREATE TABLE IF NOT EXISTS public.entitlements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  course_slug text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_slug)
);

-- Enable Row Level Security
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own entitlements
CREATE POLICY "entitlements_select_own"
  ON public.entitlements FOR SELECT
  USING (user_id = auth.uid());

-- Only admins should be able to insert/update/delete entitlements
-- These policies would need to be adjusted based on your admin setup