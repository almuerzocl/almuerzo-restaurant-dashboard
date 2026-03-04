-- Update Restaurants with V5 Advanced Capacity Fields
ALTER TABLE IF EXISTS public.restaurants 
ADD COLUMN IF NOT EXISTS operating_hours jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS slot_duration integer DEFAULT 90, -- in minutes
ADD COLUMN IF NOT EXISTS space_capacities jsonb DEFAULT '{"principal": 50}'::jsonb;

-- Capacity Blocks Table
CREATE TABLE IF NOT EXISTS public.reservation_blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    blocked_slots integer DEFAULT 0,
    reason text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Blocks
ALTER TABLE public.reservation_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blocks are viewable by restaurant staff." ON public.reservation_blocks
    FOR SELECT USING (true); -- Simplified for now, should be tied to profile.role in more detail

-- RPC: Get Realtime Metrics for Dashboard
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
    -- We assume a reservation is active if status is 'CHECK-IN CLIENTE' and it hasn't exceeded its duration
    SELECT COALESCE(SUM(party_size), 0) INTO v_current_occupancy
    FROM public.reservations
    WHERE restaurant_id = p_restaurant_id
    AND status = 'CHECK-IN CLIENTE'
    AND date_time > p_current_time - (v_slot_duration || ' minutes')::interval;

    -- 3. Pending check-in for today (CONFIRMADA/PENDIENTE/CREADA but not yet checked in)
    -- Within the current day window - let's say +/- 4 hours from now
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
        SELECT COUNT(*) FILTER (WHERE status = 'PENDIENTE') INTO v_takeaway_new FROM public.takeaway_orders WHERE restaurant_id = p_restaurant_id AND created_at >= date_trunc('day', p_current_time);
        SELECT COUNT(*) FILTER (WHERE status = 'PREPARANDO') INTO v_takeaway_preparing FROM public.takeaway_orders WHERE restaurant_id = p_restaurant_id AND created_at >= date_trunc('day', p_current_time);
        SELECT COUNT(*) FILTER (WHERE status = 'LISTO') INTO v_takeaway_ready FROM public.takeaway_ready FROM public.takeaway_orders WHERE restaurant_id = p_restaurant_id AND created_at >= date_trunc('day', p_current_time);
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
                'new', v_takeaway_new,
                'preparing', v_takeaway_preparing,
                'ready', v_takeaway_ready,
                'completedToday', v_takeaway_completed_today
            )
        );
    END;
END;
$$ LANGUAGE plpgsql STABLE;

-- RPC: Advanced Availability Heuristic (Overlaps)
CREATE OR REPLACE FUNCTION public.check_advanced_restaurant_availability(
    p_restaurant_id uuid,
    p_target_time timestamp with time zone,
    p_party_size integer,
    p_custom_duration integer DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_capacity integer;
    v_duration integer;
    v_slot_start timestamp with time zone;
    v_slot_end timestamp with time zone;
    v_max_occupied integer := 0;
    v_blocked integer := 0;
BEGIN
    -- 1. Configuration
    SELECT capacity, slot_duration INTO v_capacity, v_duration
    FROM public.restaurants
    WHERE id = p_restaurant_id;

    IF p_custom_duration IS NOT NULL THEN
        v_duration := p_custom_duration;
    END IF;

    v_slot_start := p_target_time;
    v_slot_end := p_target_time + (v_duration || ' minutes')::interval;

    -- 2. Find internal peak occupancy within [Start, End]
    SELECT COALESCE(SUM(party_size), 0) INTO v_max_occupied
    FROM public.reservations
    WHERE restaurant_id = p_restaurant_id
    AND status IN ('CONFIRMADA', 'CHECK-IN CLIENTE', 'CREADA', 'PENDIENTE')
    AND (
        (date_time, date_time + (v_duration || ' minutes')::interval) OVERLAPS 
        (v_slot_start, v_slot_end)
    );

    -- 3. Check blocks
    SELECT COALESCE(SUM(blocked_slots), 0) INTO v_blocked
    FROM public.reservation_blocks
    WHERE restaurant_id = p_restaurant_id
    AND is_active = true
    AND (
        (start_time, end_time) OVERLAPS (v_slot_start, v_slot_end)
    );

    RETURN jsonb_build_object(
        'is_available', (v_capacity - v_blocked - v_max_occupied) >= p_party_size,
        'remaining_seats', v_capacity - v_blocked - v_max_occupied,
        'total_capacity', v_capacity - v_blocked
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- 11. ANALYTICS EVENTS (Funnel Tracking)
CREATE TABLE IF NOT EXISTS public.restaurant_analytics_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
    event_type text NOT NULL, -- 'view_home', 'view_menu', 'reservation_start', 'takeaway_start'
    user_id uuid REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Analytics
ALTER TABLE public.restaurant_analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Analytics viewable by system." ON public.restaurant_analytics_events FOR SELECT USING (true);
CREATE POLICY "Users can insert analytics." ON public.restaurant_analytics_events FOR INSERT WITH CHECK (true);

-- RPC: Get Restaurant Analytics Report (with Platform Averages)
CREATE OR REPLACE FUNCTION public.get_restaurant_analytics_report(
    p_restaurant_id uuid,
    p_start_time timestamp with time zone,
    p_end_time timestamp with time zone
)
RETURNS jsonb AS $$
DECLARE
    -- Local Stats
    v_favorites_count integer;
    v_subscriptions_count integer;
    v_views_home integer;
    v_views_menu integer;
    v_res_starts integer;
    v_res_completes integer;
    v_take_starts integer;
    v_take_completes integer;
    
    -- Platform Averages (Per Restaurant)
    v_rest_count integer;
    v_avg_favorites numeric;
    v_avg_subscriptions numeric;
    v_avg_views_home numeric;
    v_avg_views_menu numeric;
    v_avg_res_starts numeric;
    v_avg_res_completes numeric;
    v_avg_take_starts numeric;
    v_avg_take_completes numeric;
BEGIN
    -- 0. Prep: Get active restaurant count
    SELECT COUNT(*) INTO v_rest_count FROM public.restaurants WHERE is_active = true;
    IF v_rest_count = 0 THEN v_rest_count := 1; END IF;

    -- 1. LOCAL STATS
    SELECT COUNT(*) INTO v_favorites_count
    FROM public.profiles
    WHERE p_restaurant_id::text = ANY(favorite_restaurant_ids);

    SELECT COUNT(*) INTO v_subscriptions_count
    FROM public.profiles
    WHERE p_restaurant_id::text = ANY(subscribed_daily_menu_ids);

    SELECT COUNT(*) FILTER (WHERE event_type = 'view_home') INTO v_views_home
    FROM public.restaurant_analytics_events
    WHERE restaurant_id = p_restaurant_id AND created_at BETWEEN p_start_time AND p_end_time;

    SELECT COUNT(*) FILTER (WHERE event_type = 'view_menu') INTO v_views_menu
    FROM public.restaurant_analytics_events
    WHERE restaurant_id = p_restaurant_id AND created_at BETWEEN p_start_time AND p_end_time;

    SELECT COUNT(*) FILTER (WHERE event_type = 'reservation_start') INTO v_res_starts
    FROM public.restaurant_analytics_events
    WHERE restaurant_id = p_restaurant_id AND created_at BETWEEN p_start_time AND p_end_time;

    SELECT COUNT(*) FILTER (WHERE event_type = 'takeaway_start') INTO v_take_starts
    FROM public.restaurant_analytics_events
    WHERE restaurant_id = p_restaurant_id AND created_at BETWEEN p_start_time AND p_end_time;

    SELECT COUNT(*) INTO v_res_completes
    FROM public.reservations
    WHERE restaurant_id = p_restaurant_id 
    AND status IN ('CONFIRMADA', 'COMPLETADA', 'CHECK-IN CLIENTE')
    AND created_at BETWEEN p_start_time AND p_end_time;

    SELECT COUNT(*) INTO v_take_completes
    FROM public.takeaway_orders
    WHERE restaurant_id = p_restaurant_id
    AND status NOT IN ('CANCELADO', 'RECHAZADA')
    AND created_at BETWEEN p_start_time AND p_end_time;

    -- 2. PLATFORM AVERAGES
    -- Favorites (Total favs / Rest count)
    SELECT (COUNT(*)::numeric / v_rest_count) INTO v_avg_favorites
    FROM (SELECT unnest(favorite_restaurant_ids) FROM public.profiles) AS all_favs;
    
    -- Subscriptions (Total subs / Rest count)
    SELECT (COUNT(*)::numeric / v_rest_count) INTO v_avg_subscriptions
    FROM (SELECT unnest(subscribed_daily_menu_ids) FROM public.profiles) AS all_subs;

    -- Events (Avg per rest)
    SELECT 
        (COUNT(*) FILTER (WHERE event_type = 'view_home')::numeric / v_rest_count),
        (COUNT(*) FILTER (WHERE event_type = 'view_menu')::numeric / v_rest_count),
        (COUNT(*) FILTER (WHERE event_type = 'reservation_start')::numeric / v_rest_count),
        (COUNT(*) FILTER (WHERE event_type = 'takeaway_start')::numeric / v_rest_count)
    INTO v_avg_views_home, v_avg_views_menu, v_avg_res_starts, v_avg_take_starts
    FROM public.restaurant_analytics_events
    WHERE created_at BETWEEN p_start_time AND p_end_time;

    -- Completions (Avg per rest)
    SELECT (COUNT(*)::numeric / v_rest_count) INTO v_avg_res_completes
    FROM public.reservations
    WHERE status IN ('CONFIRMADA', 'COMPLETADA', 'CHECK-IN CLIENTE')
    AND created_at BETWEEN p_start_time AND p_end_time;

    SELECT (COUNT(*)::numeric / v_rest_count) INTO v_avg_take_completes
    FROM public.takeaway_orders
    WHERE status NOT IN ('CANCELADO', 'RECHAZADA')
    AND created_at BETWEEN p_start_time AND p_end_time;

    RETURN jsonb_build_object(
        'local', jsonb_build_object(
            'current', jsonb_build_object(
                'favorites', v_favorites_count,
                'subscriptions', v_subscriptions_count
            ),
            'funnel', jsonb_build_object(
                'home_views', v_views_home,
                'menu_views', v_views_menu,
                'reservation_starts', v_res_starts,
                'reservation_completes', v_res_completes,
                'takeaway_starts', v_take_starts,
                'takeaway_completes', v_take_completes
            )
        ),
        'platform_avg', jsonb_build_object(
            'current', jsonb_build_object(
                'favorites', ROUND(v_avg_favorites, 1),
                'subscriptions', ROUND(v_avg_subscriptions, 1)
            ),
            'funnel', jsonb_build_object(
                'home_views', ROUND(v_avg_views_home, 1),
                'menu_views', ROUND(v_avg_views_menu, 1),
                'reservation_starts', ROUND(v_avg_res_starts, 1),
                'reservation_completes', ROUND(v_avg_res_completes, 1),
                'takeaway_starts', ROUND(v_avg_take_starts, 1),
                'takeaway_completes', ROUND(v_avg_take_completes, 1)
            )
        )
    );
END;
$$ LANGUAGE plpgsql STABLE;
