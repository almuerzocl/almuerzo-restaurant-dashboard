export interface Restaurant {
    id: string;
    name: string;
    logo_url?: string;
    cover_image_url?: string;
    capacity: number;
    cuisine_type?: string;
    description?: string;
    phone?: string;
    address?: any;
    is_active: boolean;
    has_reservations: boolean;
    has_takeaway: boolean;
    slot_duration: number;
    avg_prep_time: number;
    price_level?: number;
    reservation_settings?: any;
    takeaway_settings?: any;
    seating_spaces?: any[];
    created_at: string;
}

export interface Profile {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    display_name?: string;
    restaurant_id?: string;
    created_at?: string;
}

export interface Reservation {
    id: string;
    organizer_id: string;
    restaurant_id: string;
    date_time: string;
    party_size: number;
    status: 'CREADA' | 'PENDIENTE' | 'CONFIRMADA' | 'CHECK-IN CLIENTE' | 'COMPLETADA' | 'CANCELADA' | 'RECHAZADA' | 'NO SHOW';
    special_requests?: string;
    guest_data?: any;
    unique_code?: string;
    created_at: string;
}

export interface TakeawayOrder {
    id: string;
    user_id: string;
    restaurant_id: string;
    customer_name: string;
    customer_phone: string;
    items: any[] | string;
    total_amount: number;
    status: 'CREADA' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'PREPARANDO' | 'LISTO' | 'ENTREGADO' | 'CANCELADO' | 'NO SHOW' | 'COMPLETADO';
    created_at: string;
    ready_at?: string;
    approved_at?: string;
    metadata?: {
        pickup_time?: string;
    };
}
