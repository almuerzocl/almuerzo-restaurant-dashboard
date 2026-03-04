-- Fix missing columns in reservations table for V6/PWA Compatibility
-- Date: 2026-03-01

ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS party_size integer,
ADD COLUMN IF NOT EXISTS user_reputation_snapshot numeric,
ADD COLUMN IF NOT EXISTS user_total_reservations_snapshot integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_data_snapshot jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS applied_discount_id uuid,
ADD COLUMN IF NOT EXISTS account_type_snapshot text,
ADD COLUMN IF NOT EXISTS benefits_snapshot jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS validated_by_user boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS validated_by_restaurant boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS special_requests text,
ADD COLUMN IF NOT EXISTS timestamps jsonb DEFAULT '{}'::jsonb;

-- Ensure constraints and types (referencing institutions or discounts if needed)
-- ALTER TABLE public.reservations ADD CONSTRAINT fk_applied_discount FOREIGN KEY (applied_discount_id) REFERENCES public.discounts(id) ON DELETE SET NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
