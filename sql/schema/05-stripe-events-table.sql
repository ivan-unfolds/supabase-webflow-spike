-- Stripe Events Table Schema
-- Stores processed Stripe webhook events for idempotency

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text NOT NULL,
  type text NOT NULL,
  created timestamp with time zone,
  payload jsonb NOT NULL,
  processed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stripe_events_pkey PRIMARY KEY (id)
);

-- Note: No RLS policies needed as this table should only be accessible by backend/webhook handlers
-- You may want to add policies based on your specific admin/backend setup