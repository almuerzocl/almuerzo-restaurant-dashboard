-- EMERGENCY FIX: Database Schema and Function Overloading
-- Date: 2026-03-01

BEGIN;

-- 1. Fix reservations table schema
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

-- 2. Clean up get_my_available_discounts overloading
-- Drop all possible previous signatures to ensure only the latest exists
DROP FUNCTION IF EXISTS public.get_my_available_discounts(uuid, text);
DROP FUNCTION IF EXISTS public.get_my_available_discounts(uuid, text, date);

-- 3. Re-create the latest version of get_my_available_discounts
CREATE OR REPLACE FUNCTION public.get_my_available_discounts(
    p_restaurant_id uuid,
    p_service_type text DEFAULT 'takeaway',
    p_date date DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    label text,
    description text,
    type text,
    discount_percentage numeric,
    service_scope text[],
    institution_id uuid,
    logo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_date date;
BEGIN
    -- Use Santiago time for default
    v_date := COALESCE(p_date, (current_timestamp AT TIME ZONE 'America/Santiago')::date);

    RETURN QUERY
    SELECT 
        dad.discount_id as id,
        dad.label,
        dad.description,
        dad.type,
        dad.discount_percentage,
        dad.service_scope,
        dad.institution_id,
        i.logo_url
    FROM public.daily_active_discounts dad
    LEFT JOIN public.institutions i ON i.id = dad.institution_id
    WHERE 
        dad.restaurant_id = p_restaurant_id
        AND dad.valid_date = v_date
        AND (dad.service_scope IS NULL OR p_service_type = ANY(dad.service_scope))
        AND (
            dad.institution_id IS NULL 
            OR 
            EXISTS (
                SELECT 1 FROM public.user_institutions ui 
                WHERE ui.user_id = auth.uid() 
                AND ui.institution_id = dad.institution_id
            )
        );
END;
$$;

-- 4. Force a refresh of daily discounts just in case they are empty
-- Check if refresh_daily_discounts function exists first
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'refresh_daily_discounts') THEN
        PERFORM public.refresh_daily_discounts();
    END IF;
END $$;

COMMIT;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
