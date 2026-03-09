export interface Restaurant {
    id: string;
    name: string;
    logo_url?: string;
    capacity: number;
    available_services: string[];
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
