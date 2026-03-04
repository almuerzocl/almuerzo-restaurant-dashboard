-- 1. CREAR TABLA PARA TRACKING DE EVENTOS DE ANALYTICS
CREATE TABLE IF NOT EXISTS public.restaurant_analytics_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type text NOT NULL, -- 'view_home', 'view_menu', 'reservation_start', 'takeaway_start'
    metadata jsonb DEFAULT '{}'::jsonb
);

-- 2. HABILITAR RLS (Seguridad)
ALTER TABLE public.restaurant_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role to manage events" ON public.restaurant_analytics_events
    USING (true) WITH CHECK (true);

-- 3. FUNCIÓN RPC PARA EL REPORTE DE ANALYTICS
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
BEGIN
    -- DATOS DEL LOCAL ESPECÍFICO
    SELECT jsonb_build_object(
        'funnel', jsonb_build_object(
            'home_views', (SELECT count(*) FROM public.restaurant_analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'view_home' AND created_at BETWEEN p_start_time AND p_end_time),
            'menu_views', (SELECT count(*) FROM public.restaurant_analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'view_menu' AND created_at BETWEEN p_start_time AND p_end_time),
            'reservation_starts', (SELECT count(*) FROM public.restaurant_analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'reservation_start' AND created_at BETWEEN p_start_time AND p_end_time),
            'reservation_completes', (SELECT count(*) FROM public.reservations WHERE restaurant_id = p_restaurant_id AND status = 'confirmed' AND created_at BETWEEN p_start_time AND p_end_time),
            'takeaway_starts', (SELECT count(*) FROM public.restaurant_analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'takeaway_start' AND created_at BETWEEN p_start_time AND p_end_time),
            'takeaway_completes', (SELECT count(*) FROM public.takeaway_orders WHERE restaurant_id = p_restaurant_id AND status = 'completed' AND created_at BETWEEN p_start_time AND p_end_time)
        ),
        'current', jsonb_build_object(
            'favorites', (SELECT count(*) FROM public.restaurant_favorites WHERE restaurant_id = p_restaurant_id),
            'subscriptions', (SELECT count(*) FROM public.user_institutions ui JOIN public.daily_active_discounts dad ON dad.institution_id = ui.institution_id WHERE dad.restaurant_id = p_restaurant_id)
        )
    ) INTO v_local_data;

    -- PROMEDIOS DE LA PLATAFORMA (Para comparar)
    SELECT jsonb_build_object(
        'funnel', jsonb_build_object(
            'home_views', (SELECT count(*) / NULLIF((SELECT count(*) FROM public.restaurants), 0) FROM public.restaurant_analytics_events WHERE event_type = 'view_home' AND created_at BETWEEN p_start_time AND p_end_time),
            'menu_views', (SELECT count(*) / NULLIF((SELECT count(*) FROM public.restaurants), 0) FROM public.restaurant_analytics_events WHERE event_type = 'view_menu' AND created_at BETWEEN p_start_time AND p_end_time),
            'reservation_starts', (SELECT count(*) / NULLIF((SELECT count(*) FROM public.restaurants), 0) FROM public.restaurant_analytics_events WHERE event_type = 'reservation_start' AND created_at BETWEEN p_start_time AND p_end_time),
            'reservation_completes', (SELECT count(*) / NULLIF((SELECT count(*) FROM public.restaurants), 0) FROM public.reservations WHERE status = 'confirmed' AND created_at BETWEEN p_start_time AND p_end_time),
            'takeaway_starts', (SELECT count(*) / NULLIF((SELECT count(*) FROM public.restaurants), 0) FROM public.restaurant_analytics_events WHERE event_type = 'takeaway_start' AND created_at BETWEEN p_start_time AND p_end_time),
            'takeaway_completes', (SELECT count(*) / NULLIF((SELECT count(*) FROM public.restaurants), 0) FROM public.takeaway_orders WHERE status = 'completed' AND created_at BETWEEN p_start_time AND p_end_time)
        ),
        'current', jsonb_build_object(
            'favorites', (SELECT count(*) / NULLIF((SELECT count(*) FROM public.restaurants), 0) FROM public.restaurant_favorites),
            'subscriptions', (SELECT count(*) / NULLIF((SELECT count(*) FROM public.restaurants), 0) FROM public.user_institutions)
        )
    ) INTO v_platform_avg;

    v_result := jsonb_build_object(
        'local', v_local_data,
        'platform_avg', v_platform_avg
    );

    RETURN v_result;
END; $$;
