-- Stripe Customers Table Schema
-- Maps Supabase users to Stripe customer IDs

CREATE TABLE IF NOT EXISTS public.stripe_customers (
  user_id uuid NOT NULL,
  stripe_customer_id text NOT NULL UNIQUE,
  email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stripe_customers_pkey PRIMARY KEY (user_id),
  CONSTRAINT stripe_customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own Stripe customer data
CREATE POLICY "stripe_customers_select_own"
  ON public.stripe_customers FOR SELECT
  USING (user_id = auth.uid());

-- Only backend/admin should be able to insert/update/delete stripe customer data
-- These policies would need to be adjusted based on your admin setup