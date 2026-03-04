-- Add detailed settings for Reservations and Takeaway to Restaurants
ALTER TABLE IF EXISTS public.restaurants 
ADD COLUMN IF NOT EXISTS reservation_settings jsonb DEFAULT '{"max_party_size": 10, "min_reputation": 80}'::jsonb,
ADD COLUMN IF NOT EXISTS takeaway_settings jsonb DEFAULT '{"max_items": 15, "max_order_amount": 150000, "min_reputation": 80, "opening_offset": 30, "closing_offset": 30}'::jsonb,
ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'BASICO' CHECK (subscription_plan IN ('BASICO', 'ESTANDAR', 'ILIMITADO')),
ADD COLUMN IF NOT EXISTS next_billing_date timestamp with time zone;

-- Subscription Payments Table
CREATE TABLE IF NOT EXISTS public.restaurant_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
    amount integer NOT NULL,
    status text DEFAULT 'PAID' CHECK (status IN ('PAID', 'PENDING', 'FAILED')),
    plan_name text NOT NULL,
    billing_period_start timestamp with time zone,
    billing_period_end timestamp with time zone,
    payment_method jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure profiles can be linked to restaurants (if not already handled by a many-to-many)
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurants(id);

-- Ensure we have a default category for menu items if not specified
ALTER TABLE IF EXISTS public.menu_items
ALTER COLUMN category SET DEFAULT 'General';
 