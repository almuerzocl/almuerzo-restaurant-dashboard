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
    status: 'CREADA' | 'PENDIENTE' | 'CONFIRMADA' | 'CHECK-IN CLIENTE' | 'COMPLETADA' | 'CANCELADA' | 'RECHAZADA' | 'NO_SHOW';
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
    items: any[];
    total_amount: number;
    status: 'PENDIENTE' | 'RECHAZADA' | 'PREPARANDO' | 'LISTO' | 'COMPLETADO' | 'CANCELADO' | 'NO_RETIRADO';
    created_at: string;
}
