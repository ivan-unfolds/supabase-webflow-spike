-- Entitlements Table Schema
-- Tracks which courses/content users have access to

CREATE TABLE IF NOT EXISTS public.entitlements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_slug text NOT NULL,
  access_level text NOT NULL DEFAULT 'member'::text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  source text,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT entitlements_pkey PRIMARY KEY (id),
  CONSTRAINT entitlements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own entitlements
CREATE POLICY "entitlements_select_own"
  ON public.entitlements FOR SELECT
  USING (user_id = auth.uid());

-- Only admins should be able to insert/update/delete entitlements
-- These policies would need to be adjusted based on your admin setup