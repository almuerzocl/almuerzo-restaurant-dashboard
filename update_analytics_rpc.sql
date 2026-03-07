-- 1. ACTUALIZAR RPC PARA INCLUIR USUARIOS ÚNICOS Y MÁS MÉTRICAS DE PWA/GA4
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
    v_total_restaurants bigint;
BEGIN
    -- Contar restaurantes activos para los promedios
    SELECT count(*) INTO v_total_restaurants FROM public.restaurants WHERE is_active = true;
    IF v_total_restaurants = 0 THEN v_total_restaurants := 1; END IF;

    -- DATOS DEL LOCAL ESPECÍFICO
    SELECT jsonb_build_object(
        'funnel', jsonb_build_object(
            'home_views', (SELECT count(*) FROM public.restaurant_analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'view_home' AND created_at BETWEEN p_start_time AND p_end_time),
            'menu_views', (SELECT count(*) FROM public.restaurant_analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'view_menu' AND created_at BETWEEN p_start_time AND p_end_time),
            'reservation_starts', (SELECT count(*) FROM public.restaurant_analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'reservation_start' AND created_at BETWEEN p_start_time AND p_end_time),
            'reservation_completes', (SELECT count(*) FROM public.reservations WHERE restaurant_id = p_restaurant_id AND status = 'CONFIRMADA' AND created_at BETWEEN p_start_time AND p_end_time),
            'takeaway_starts', (SELECT count(*) FROM public.restaurant_analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'takeaway_start' AND created_at BETWEEN p_start_time AND p_end_time),
            'takeaway_completes', (SELECT count(*) FROM public.takeaway_orders WHERE restaurant_id = p_restaurant_id AND status = 'COMPLETADO' AND created_at BETWEEN p_start_time AND p_end_time)
        ),
        'financial', jsonb_build_object(
            'total_revenue', COALESCE((SELECT sum(total_amount) FROM public.takeaway_orders WHERE restaurant_id = p_restaurant_id AND status = 'COMPLETADO' AND created_at BETWEEN p_start_time AND p_end_time), 0),
            'avg_ticket', COALESCE((SELECT avg(total_amount) FROM public.takeaway_orders WHERE restaurant_id = p_restaurant_id AND status = 'COMPLETADO' AND created_at BETWEEN p_start_time AND p_end_time), 0)
        ),
        'pwa', jsonb_build_object(
            'unique_users', (SELECT count(distinct user_id) FROM public.restaurant_analytics_events WHERE restaurant_id = p_restaurant_id AND created_at BETWEEN p_start_time AND p_end_time),
            'app_sessions', (SELECT count(*) FROM public.restaurant_analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'view_home' AND created_at BETWEEN p_start_time AND p_end_time)
        ),
        'current', jsonb_build_object(
            'favorites', (SELECT count(*) FROM public.profiles WHERE favorite_restaurant_ids @> ARRAY[p_restaurant_id::text]),
            'subscriptions', (SELECT count(*) FROM public.profiles WHERE subscribed_daily_menu_ids @> ARRAY[p_restaurant_id::text])
        )
    ) INTO v_local_data;

    -- PROMEDIOS DE LA PLATAFORMA (Para comparar)
    SELECT jsonb_build_object(
        'funnel', jsonb_build_object(
            'home_views', (SELECT count(*) / v_total_restaurants FROM public.restaurant_analytics_events WHERE event_type = 'view_home' AND created_at BETWEEN p_start_time AND p_end_time),
            'menu_views', (SELECT count(*) / v_total_restaurants FROM public.restaurant_analytics_events WHERE event_type = 'view_menu' AND created_at BETWEEN p_start_time AND p_end_time),
            'reservation_starts', (SELECT count(*) / v_total_restaurants FROM public.restaurant_analytics_events WHERE event_type = 'reservation_start' AND created_at BETWEEN p_start_time AND p_end_time),
            'reservation_completes', (SELECT count(*) / v_total_restaurants FROM public.reservations WHERE status = 'CONFIRMADA' AND created_at BETWEEN p_start_time AND p_end_time),
            'takeaway_starts', (SELECT count(*) / v_total_restaurants FROM public.restaurant_analytics_events WHERE event_type = 'takeaway_start' AND created_at BETWEEN p_start_time AND p_end_time),
            'takeaway_completes', (SELECT count(*) / v_total_restaurants FROM public.takeaway_orders WHERE status = 'COMPLETADO' AND created_at BETWEEN p_start_time AND p_end_time)
        ),
        'financial', jsonb_build_object(
            'total_revenue', COALESCE((SELECT sum(total_amount) / v_total_restaurants FROM public.takeaway_orders WHERE status = 'COMPLETADO' AND created_at BETWEEN p_start_time AND p_end_time), 0),
            'avg_ticket', COALESCE((SELECT avg(total_amount) / v_total_restaurants FROM public.takeaway_orders WHERE status = 'COMPLETADO' AND created_at BETWEEN p_start_time AND p_end_time), 0)
        ),
        'pwa', jsonb_build_object(
            'unique_users', (SELECT count(distinct user_id) / v_total_restaurants FROM public.restaurant_analytics_events WHERE created_at BETWEEN p_start_time AND p_end_time),
            'app_sessions', (SELECT count(*) / v_total_restaurants FROM public.restaurant_analytics_events WHERE event_type = 'view_home' AND created_at BETWEEN p_start_time AND p_end_time)
        ),
        'current', jsonb_build_object(
            'favorites', (SELECT count(*) / v_total_restaurants FROM public.profiles WHERE favorite_restaurant_ids IS NOT NULL AND cardinality(favorite_restaurant_ids) > 0),
            'subscriptions', (SELECT count(*) / v_total_restaurants FROM public.profiles WHERE subscribed_daily_menu_ids IS NOT NULL AND cardinality(subscribed_daily_menu_ids) > 0)
        )
    ) INTO v_platform_avg;

    RETURN jsonb_build_object(
        'local', v_local_data,
        'platform_avg', v_platform_avg
    );
END; $$;
