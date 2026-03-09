"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getReservationsAction, updateReservationStatusAction, trackAnalyticsEventAction } from "@/app/actions/dashboard-actions";
import { Reservation } from "@/types";
import { toast } from "sonner";
import { CheckCircle2, UserCheck, XCircle, Clock, Users, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface ReservationsKanbanProps {
    restaurantId: string | undefined;
}

export default function ReservationsKanban({ restaurantId }: ReservationsKanbanProps) {
    const { profile } = useAuth();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReservations = async () => {
        if (!restaurantId) return;
        const result = await getReservationsAction(restaurantId, profile?.role || '');
        if (result.success) {
            setReservations(result.data || []);
        }
    };

    useEffect(() => {
        if (!restaurantId) return;

        // Initial fetch
        fetchReservations().then(() => setLoading(false));

        // Realtime Subscription
        const channel = supabase
            .channel(`reservations-${restaurantId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'reservations',
                    filter: `restaurant_id=eq.${restaurantId}`
                },
                (payload: any) => {
                    console.log('Realtime update received:', payload);
                    fetchReservations();

                    // Show specific toast based on event
                    if (payload.eventType === 'INSERT') {
                        toast.success("¡Nueva reserva recibida!", {
                            icon: '🔔',
                            duration: 5000
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [restaurantId]);

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        const result = await updateReservationStatusAction(id, newStatus);
        if (result.success) {
            toast.success(`Reserva movida a ${newStatus}`);
            
            // Analytics tracking based on new status
            if (restaurantId && profile?.id) {
                if (newStatus === 'CONFIRMADA') {
                    trackAnalyticsEventAction(restaurantId, 'reservation_confirm', profile.id);
                } else if (newStatus === 'CHECK-IN CLIENTE') {
                    trackAnalyticsEventAction(restaurantId, 'reservation_checkin', profile.id);
                }
            }
            // real-time will handle the refresh
        } else {
            toast.error("Error al actualizar estado");
        }
    };

    if (loading) {
        return <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando tablero...</div>;
    }

    const columns = [
        { id: "PENDIENTE", title: "Pendiente", color: "text-amber-500", border: "border-amber-500", bgbadge: "bg-amber-100/50 text-amber-600" },
        { id: "CONFIRMADA", title: "Confirmada", color: "text-blue-500", border: "border-blue-500", bgbadge: "bg-blue-100/50 text-blue-600" },
        { id: "CHECK-IN CLIENTE", title: "Check-in Cliente", color: "text-purple-500", border: "border-purple-500", bgbadge: "bg-purple-100/50 text-purple-600" },
        { id: "COMPLETADA", title: "Completada", color: "text-emerald-500", border: "border-emerald-500", bgbadge: "bg-emerald-100/50 text-emerald-600" },
    ];

    return (
        <div className="flex flex-col gap-6">
            {/* KPI Cards Top Level */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {columns.map(col => {
                    const colRes = reservations.filter(r => r.status === col.id || (col.id === 'PENDIENTE' && r.status === 'CREADA'));
                    const pax = colRes.reduce((acc, r) => acc + (r.party_size || 0), 0);
                    return (
                        <div key={col.id} className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between items-start transition-all hover:border-slate-700`}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className={`w-2 h-2 rounded-full bg-current ${col.color}`} />
                                <span className={`text-[10px] uppercase font-black tracking-[0.2em] ${col.color}`}>{col.title}</span>
                            </div>
                            <div className="flex justify-between items-end w-full">
                                <div className="flex flex-col">
                                    <span className="text-3xl font-black text-white leading-none">{colRes.length}</span>
                                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest pt-1">Reservas</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg">
                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-slate-300 font-bold text-xs">{pax}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x">
                {columns.map(col => {
                    const colRes = reservations.filter(r => r.status === col.id || (col.id === 'PENDIENTE' && r.status === 'CREADA'));
                    return (
                        <div key={col.id} className="min-w-[300px] w-full flex flex-col gap-4 bg-slate-950/50 rounded-[2rem] p-4 border border-slate-800 snap-start">
                            <div className="flex items-center justify-between px-2 pt-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full bg-current ${col.color}`} />
                                    <h3 className={`font-black text-[11px] uppercase tracking-[0.15em] ${col.color}`}>{col.title}</h3>
                                </div>
                                <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{colRes.length}</span>
                            </div>

                            <div className="flex flex-col gap-3 mt-2">
                                {colRes.length === 0 ? (
                                    <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl">
                                        <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">Vacío</p>
                                    </div>
                                ) : (
                                    colRes.sort((a: any, b: any) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime()).map((res: any) => {
                                        const guestInfo = res.guest_data ? (typeof res.guest_data === 'string' ? JSON.parse(res.guest_data) : res.guest_data) : null;
                                        const mainGuest = Array.isArray(guestInfo) ? guestInfo[0] : (guestInfo?.name ? guestInfo : null);
                                        const profileName = res.profiles ? `${res.profiles.first_name || ''} ${res.profiles.last_name || ''}`.trim() : null;
                                        const customerName = mainGuest?.name || res.customer_name || profileName || "Cliente S/N";

                                        return (
                                            <div
                                                key={res.id}
                                                onClick={() => window.open(`https://ticket2.almuerzo.cl/v/${res.unique_code}`, '_blank')}
                                                className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 flex flex-col gap-4 relative overflow-hidden group hover:shadow-md cursor-pointer transition-all"
                                            >
                                                {/* Card Header */}
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-slate-400" />
                                                        <span className="font-black text-slate-800 text-sm tracking-tight">
                                                            {format(new Date(res.date_time), "HH:mm")}
                                                        </span>
                                                    </div>
                                                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg ${col.bgbadge}`}>
                                                        {col.title}
                                                    </span>
                                                </div>

                                                {/* Card Body */}
                                                <div>
                                                    <h4 className="font-black text-slate-900 text-base leading-tight mb-1">
                                                        {customerName}
                                                    </h4>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                                                            <Users className="w-3 h-3 text-slate-400" />
                                                            {res.party_size} Pax
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                                            #{res.unique_code}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Card Actions (Colored buttons on white bg) */}
                                                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 mt-auto">
                                                    {res.status === 'PENDIENTE' && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 flex-1 h-9 font-black uppercase tracking-widest text-[9px]"
                                                                onClick={() => handleStatusUpdate(res.id, 'RECHAZADA')}
                                                            >
                                                                Rechazar
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex-1 h-9 font-black uppercase tracking-widest text-[9px]"
                                                                onClick={() => handleStatusUpdate(res.id, 'CONFIRMADA')}
                                                            >
                                                                Confirmar
                                                            </Button>
                                                        </>
                                                    )}
                                                    {/* Botón check-in removido según requerimiento de roles */}
                                                    {res.status === 'CHECK-IN CLIENTE' && (
                                                        <Button
                                                            size="sm"
                                                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white w-full h-9 font-black uppercase tracking-widest text-[9px]"
                                                            onClick={() => handleStatusUpdate(res.id, 'COMPLETADA')}
                                                        >
                                                            Completar
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
