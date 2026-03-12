-- ============================================================================
-- ALMUERZO.CL V5 - CONSOLIDATED ARCHITECTURE MASTER FILE
-- ============================================================================
-- Description: This script establishes the definitive V5 standard for the 
-- database. It consolidates all previous patches into a single source of truth.
-- Includes: Standardized statuses, Inventory Control, Auto-approval rules,
-- and Analytics RPCs.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. DATABASE CONSTRAINTS & STANDARDIZATION (STATUSES)
-- ----------------------------------------------------------------------------

-- Standardize existing statuses to Uppercase
UPDATE public.takeaway_orders
SET status = CASE 
    WHEN status ILIKE 'new' OR status ILIKE 'pending' THEN 'PENDIENTE'
    WHEN status ILIKE 'preparing' THEN 'PREPARANDO'
    WHEN status ILIKE 'ready' THEN 'LISTO'
    WHEN status ILIKE 'completed' OR status ILIKE 'delivered' THEN 'ENTREGADO'
    WHEN status ILIKE 'cancelled' THEN 'CANCELADO'
    WHEN status ILIKE 'rejected' THEN 'RECHAZADA'
    ELSE UPPER(status)
END;

ALTER TABLE public.takeaway_orders DROP CONSTRAINT IF EXISTS takeaway_orders_status_check;
ALTER TABLE public.takeaway_orders ADD CONSTRAINT takeaway_orders_status_check 
CHECK (status IN ('CREADA', 'PENDIENTE', 'APROBADA', 'PREPARANDO', 'LISTO', 'ENTREGADO', 'CANCELADO', 'RECHAZADA', 'NO SHOW', 'COMPLETADO', 'ANULADO'));

-- Standardize Reservations
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_status_check 
CHECK (status IN ('CREADA', 'PENDIENTE', 'CONFIRMADA', 'CHECK-IN CLIENTE', 'COMPLETADA', 'CANCELADA', 'RECHAZADA', 'NO SHOW'));

-- ----------------------------------------------------------------------------
-- 2. INVENTORY CONTROL LOGIC (TRIGGER)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_takeaway_inventory()
RETURNS TRIGGER AS $$
DECLARE
    v_item jsonb;
    v_menu_item_id uuid;
    v_quantity integer;
BEGIN
    -- DEDUCT STOCK ON APPROVAL
    IF (TG_OP = 'INSERT' AND NEW.status = 'APROBADA') OR 
       (TG_OP = 'UPDATE' AND OLD.status != 'APROBADA' AND NEW.status = 'APROBADA') THEN
        IF NEW.items IS NOT NULL AND jsonb_typeof(NEW.items) = 'array' THEN
            FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
                v_menu_item_id := COALESCE((v_item->>'id')::uuid, (v_item->>'menu_item_id')::uuid);
                v_quantity := COALESCE((v_item->>'quantity')::integer, 1);
                IF v_menu_item_id IS NOT NULL THEN
                    UPDATE public.menu_items
                    SET current_stock = GREATEST(0, current_stock - v_quantity),
                        is_available = CASE WHEN (current_stock - v_quantity) <= 0 THEN false ELSE is_available END
                    WHERE id = v_menu_item_id AND stock_managed = true;
                END IF;
            END LOOP;
        END IF;
    END IF;

    -- RETURN STOCK ON REJECTION/CANCELLATION
    IF TG_OP = 'UPDATE' AND OLD.status = 'APROBADA' AND 
       (NEW.status IN ('RECHAZADA', 'CANCELADO', 'ANULADO')) THEN
        IF NEW.items IS NOT NULL AND jsonb_typeof(NEW.items) = 'array' THEN
            FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
                v_menu_item_id := COALESCE((v_item->>'id')::uuid, (v_item->>'menu_item_id')::uuid);
                v_quantity := COALESCE((v_item->>'quantity')::integer, 1);
                IF v_menu_item_id IS NOT NULL THEN
                    UPDATE public.menu_items
                    SET current_stock = current_stock + v_quantity,
                        updated_at = now()
                    WHERE id = v_menu_item_id AND stock_managed = true;
                END IF;
            END LOOP;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_handle_takeaway_inventory ON public.takeaway_orders;
CREATE TRIGGER tr_handle_takeaway_inventory AFTER INSERT OR UPDATE ON public.takeaway_orders
FOR EACH ROW EXECUTE FUNCTION public.handle_takeaway_inventory();

-- ----------------------------------------------------------------------------
-- 3. AUTO-APPROVE BUSINESS RULES (TRIGGER)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_approve_takeaway_order()
RETURNS TRIGGER AS $$
DECLARE
    v_settings jsonb;
    v_max_amount numeric;
    v_min_reputation integer;
    v_user_reputation integer;
BEGIN
    SELECT takeaway_settings INTO v_settings FROM public.restaurants WHERE id = NEW.restaurant_id;
    IF v_settings IS NULL THEN RETURN NEW; END IF;

    v_max_amount := COALESCE((v_settings->>'max_order_amount')::numeric, 150000);
    v_min_reputation := COALESCE((v_settings->>'min_reputation')::integer, 80);

    IF NEW.user_id IS NOT NULL THEN
        SELECT COALESCE(reservation_reputation, 100) INTO v_user_reputation FROM public.profiles WHERE id = NEW.user_id;
    ELSE
        v_user_reputation := 0; 
    END IF;

    IF (NEW.status IN ('PENDIENTE', 'CREADA')) AND NEW.total_amount <= v_max_amount AND v_user_reputation >= v_min_reputation THEN
        NEW.status := 'APROBADA';
        NEW.approved_at := now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_auto_approve_takeaway_order ON public.takeaway_orders;
CREATE TRIGGER tr_auto_approve_takeaway_order BEFORE INSERT ON public.takeaway_orders
FOR EACH ROW EXECUTE FUNCTION public.auto_approve_takeaway_order();

-- ----------------------------------------------------------------------------
-- 4. ANALYTICS & DASHBOARD METRICS (RPCS)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_restaurant_analytics_report(
    p_restaurant_id uuid,
    p_start_time timestamp with time zone,
    p_end_time timestamp with time zone
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_result jsonb;
    v_local_data jsonb;
    v_platform_avg jsonb;
    v_rest_count integer;
BEGIN
    SELECT COUNT(*) INTO v_rest_count FROM public.restaurants WHERE is_active = true;
    IF v_rest_count = 0 THEN v_rest_count := 1; END IF;

    SELECT jsonb_build_object(
        'funnel', jsonb_build_object(
            'home_views', (SELECT count(*) FROM public.restaurant_analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'view_home' AND created_at BETWEEN p_start_time AND p_end_time),
            'menu_views', (SELECT count(*) FROM public.restaurant_analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'view_menu' AND created_at BETWEEN p_start_time AND p_end_time),
            'reservation_starts', (SELECT count(*) FROM public.restaurant_analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'reservation_start' AND created_at BETWEEN p_start_time AND p_end_time),
            'reservation_completes', (SELECT count(*) FROM public.reservations WHERE restaurant_id = p_restaurant_id AND status IN ('CONFIRMADA', 'COMPLETADA', 'CHECK-IN CLIENTE') AND created_at BETWEEN p_start_time AND p_end_time),
            'takeaway_starts', (SELECT count(*) FROM public.restaurant_analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'takeaway_start' AND created_at BETWEEN p_start_time AND p_end_time),
            'takeaway_completes', (SELECT count(*) FROM public.takeaway_orders WHERE restaurant_id = p_restaurant_id AND status IN ('ENTREGADO', 'COMPLETADO', 'LISTO', 'APROBADA', 'PREPARANDO') AND created_at BETWEEN p_start_time AND p_end_time)
        ),
        'financial', jsonb_build_object(
            'total_revenue', (SELECT COALESCE(SUM(total_amount), 0) FROM public.takeaway_orders WHERE restaurant_id = p_restaurant_id AND status IN ('ENTREGADO', 'COMPLETADO', 'LISTO', 'APROBADA', 'PREPARANDO') AND created_at BETWEEN p_start_time AND p_end_time),
            'avg_ticket', (SELECT COALESCE(AVG(total_amount), 0) FROM public.takeaway_orders WHERE restaurant_id = p_restaurant_id AND status IN ('ENTREGADO', 'COMPLETADO', 'LISTO', 'APROBADA', 'PREPARANDO') AND created_at BETWEEN p_start_time AND p_end_time)
        ),
        'current', jsonb_build_object(
            'favorites', (SELECT count(*) FROM public.profiles WHERE p_restaurant_id::text = ANY(favorite_restaurant_ids)),
            'subscriptions', (SELECT count(*) FROM public.profiles WHERE p_restaurant_id::text = ANY(subscribed_daily_menu_ids))
        )
    ) INTO v_local_data;

    SELECT jsonb_build_object(
        'funnel', jsonb_build_object(
            'home_views', (SELECT count(*)::numeric / v_rest_count FROM public.restaurant_analytics_events WHERE event_type = 'view_home' AND created_at BETWEEN p_start_time AND p_end_time),
            'menu_views', (SELECT count(*)::numeric / v_rest_count FROM public.restaurant_analytics_events WHERE event_type = 'view_menu' AND created_at BETWEEN p_start_time AND p_end_time),
            'reservation_starts', (SELECT count(*)::numeric / v_rest_count FROM public.restaurant_analytics_events WHERE event_type = 'reservation_start' AND created_at BETWEEN p_start_time AND p_end_time),
            'reservation_completes', (SELECT count(*)::numeric / v_rest_count FROM public.reservations WHERE status IN ('CONFIRMADA', 'COMPLETADA', 'CHECK-IN CLIENTE', 'CREADA') AND created_at BETWEEN p_start_time AND p_end_time),
            'takeaway_starts', (SELECT count(*)::numeric / v_rest_count FROM public.restaurant_analytics_events WHERE event_type = 'takeaway_start' AND created_at BETWEEN p_start_time AND p_end_time),
            'takeaway_completes', (SELECT count(*)::numeric / v_rest_count FROM public.takeaway_orders WHERE status IN ('ENTREGADO', 'COMPLETADO', 'LISTO', 'APROBADA', 'PREPARANDO') AND created_at BETWEEN p_start_time AND p_end_time)
        ),
        'financial', jsonb_build_object(
            'total_revenue', (SELECT SUM(total_amount) / v_rest_count FROM public.takeaway_orders WHERE status IN ('ENTREGADO', 'COMPLETADO', 'LISTO', 'APROBADA', 'PREPARANDO') AND created_at BETWEEN p_start_time AND p_end_time),
            'avg_ticket', (SELECT AVG(total_amount) FROM public.takeaway_orders WHERE status IN ('ENTREGADO', 'COMPLETADO', 'LISTO', 'APROBADA', 'PREPARANDO') AND created_at BETWEEN p_start_time AND p_end_time)
        ),
        'current', jsonb_build_object(
            'favorites', (SELECT COALESCE(AVG(cardinality(favorite_restaurant_ids)), 0) FROM public.profiles),
            'subscriptions', (SELECT COALESCE(AVG(cardinality(subscribed_daily_menu_ids)), 0) FROM public.profiles)
        )
    ) INTO v_platform_avg;

    RETURN jsonb_build_object('local', v_local_data, 'platform_avg', v_platform_avg);
END; $$;

COMMIT;
NOTIFY pgrst, 'reload schema';
