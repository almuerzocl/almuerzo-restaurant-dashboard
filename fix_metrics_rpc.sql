-- FIX typo in dashboard metrics function
CREATE OR REPLACE FUNCTION public.get_restaurant_dashboard_metrics(
    p_restaurant_id uuid,
    p_current_time timestamp with time zone DEFAULT now()
)
RETURNS jsonb AS $$
DECLARE
    v_total_capacity integer;
    v_current_occupancy integer;
    v_pending_checkin integer;
    v_blocked_seats integer;
    v_completed integer;
    v_slot_duration integer;
BEGIN
    -- 1. Get restaurant capacity and duration
    SELECT capacity, slot_duration INTO v_total_capacity, v_slot_duration
    FROM public.restaurants
    WHERE id = p_restaurant_id;

    -- 2. Current occupancy (Active Check-ins)
    SELECT COALESCE(SUM(party_size), 0) INTO v_current_occupancy
    FROM public.reservations
    WHERE restaurant_id = p_restaurant_id
    AND status = 'CHECK-IN CLIENTE'
    AND date_time > p_current_time - (v_slot_duration || ' minutes')::interval;

    -- 3. Pending check-in for today (CONFIRMADA/PENDIENTE/CREADA)
    SELECT COUNT(*) INTO v_pending_checkin
    FROM public.reservations
    WHERE restaurant_id = p_restaurant_id
    AND status IN ('CONFIRMADA', 'PENDIENTE', 'CREADA')
    AND date_time >= date_trunc('day', p_current_time)
    AND date_time <= date_trunc('day', p_current_time) + interval '1 day'
    AND date_time > p_current_time;

    -- 4. Blocked seats currently
    SELECT COALESCE(SUM(blocked_slots), 0) INTO v_blocked_seats
    FROM public.reservation_blocks
    WHERE restaurant_id = p_restaurant_id
    AND is_active = true
    AND start_time <= p_current_time
    AND end_time > p_current_time;

    -- 5. Completed today (Reservations)
    SELECT COUNT(*) INTO v_completed
    FROM public.reservations
    WHERE restaurant_id = p_restaurant_id
    AND status = 'COMPLETADA'
    AND date_time >= date_trunc('day', p_current_time)
    AND date_time <= date_trunc('day', p_current_time) + interval '1 day';

    -- Takeaway Stats
    DECLARE
        v_takeaway_new integer;
        v_takeaway_preparing integer;
        v_takeaway_ready integer;
        v_takeaway_completed_today integer;
    BEGIN
        SELECT COUNT(*) FILTER (WHERE status = 'CREADA' OR status = 'PENDIENTE') INTO v_takeaway_new FROM public.takeaway_orders WHERE restaurant_id = p_restaurant_id AND created_at >= date_trunc('day', p_current_time);
        SELECT COUNT(*) FILTER (WHERE status = 'PREPARANDO') INTO v_takeaway_preparing FROM public.takeaway_orders WHERE restaurant_id = p_restaurant_id AND created_at >= date_trunc('day', p_current_time);
        SELECT COUNT(*) FILTER (WHERE status = 'LISTO') INTO v_takeaway_ready FROM public.takeaway_orders WHERE restaurant_id = p_restaurant_id AND created_at >= date_trunc('day', p_current_time);
        SELECT COUNT(*) FILTER (WHERE status = 'COMPLETADO') INTO v_takeaway_completed_today FROM public.takeaway_orders WHERE restaurant_id = p_restaurant_id AND created_at >= date_trunc('day', p_current_time);

        RETURN jsonb_build_object(
            'reservations', jsonb_build_object(
                'totalCapacity', v_total_capacity,
                'currentOccupancy', v_current_occupancy,
                'pendingCheckin', v_pending_checkin,
                'blockedSeats', v_blocked_seats,
                'completedToday', v_completed
            ),
            'takeaway', jsonb_build_object(
                'p_new', v_takeaway_new, -- renamed 'new' to 'p_new' for safer JSON keys if needed, but original used 'new'
                'preparing', v_takeaway_preparing,
                'ready', v_takeaway_ready,
                'completedToday', v_takeaway_completed_today
            )
        );
    END;
END;
$$ LANGUAGE plpgsql STABLE;
