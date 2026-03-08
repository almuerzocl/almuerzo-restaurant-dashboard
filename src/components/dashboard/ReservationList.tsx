"use client";

import { useEffect, useState } from "react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    getReservationsAction,
    updateReservationStatusAction,
    trackAnalyticsEventAction
} from "@/app/actions/dashboard-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    CheckCircle2, XCircle, UserCheck, Clock, MoreHorizontal, ExternalLink, Users
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Reservation } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface ReservationListProps {
    restaurantId: string | undefined;
}

export default function ReservationList({ restaurantId }: ReservationListProps) {
    const { profile } = useAuth();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReservations = async () => {
        if (!restaurantId) return;
        setLoading(true);
        const result = await getReservationsAction(restaurantId, profile?.role || '');
        if (result.success) {
            setReservations(result.data || []);
        } else {
            toast.error("Error al cargar reservas");
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!restaurantId) return;

        // Initial fetch
        fetchReservations();

        // Realtime Subscription
        const channel = supabase
            .channel(`reservations-list-${restaurantId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'reservations',
                    filter: `restaurant_id=eq.${restaurantId}`
                },
                (payload: any) => {
                    console.log('Realtime reservation list update received:', payload);
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
            toast.success(`Reserva actualizada a ${newStatus}`);
            
            // Analytics tracking
            if (restaurantId && profile?.id) {
                if (newStatus === 'CONFIRMADA') {
                    trackAnalyticsEventAction(restaurantId, 'reservation_confirm', profile.id);
                } else if (newStatus === 'CHECK-IN CLIENTE') {
                    trackAnalyticsEventAction(restaurantId, 'reservation_checkin', profile.id);
                }
            }

            fetchReservations();
        } else {
            toast.error("Error al actualizar estado");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'CONFIRMADA':
                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none uppercase text-[10px] font-black tracking-widest px-3 py-1">Confirmada</Badge>;
            case 'CHECK-IN CLIENTE':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none uppercase text-[10px] font-black tracking-widest px-3 py-1">En Local</Badge>;
            case 'PENDIENTE':
                return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none uppercase text-[10px] font-black tracking-widest px-3 py-1">Pendiente</Badge>;
            case 'COMPLETADA':
                return <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none uppercase text-[10px] font-black tracking-widest px-3 py-1">Completada</Badge>;
            case 'RECHAZADA':
            case 'CANCELADA':
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none uppercase text-[10px] font-black tracking-widest px-3 py-1">Cancelada</Badge>;
            default:
                return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none uppercase text-[10px] font-black tracking-widest px-3 py-1">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    if (reservations.length === 0) {
        return (
            <div className="py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest italic">No hay reservas registradas</p>
            </div>
        );
    }

    return (
        <div className="rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm">
            <Table>
                <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-slate-100 h-14">
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-500 px-6">Cliente / Ticket</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-500">Fecha y Hora</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-500">Pax</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-500">Estado</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-500 text-right px-6">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reservations.map((res) => {
                        const guestInfo = res.guest_data ? (typeof res.guest_data === 'string' ? JSON.parse(res.guest_data) : res.guest_data) : null;
                        const mainGuest = Array.isArray(guestInfo) ? guestInfo[0] : (guestInfo?.name ? guestInfo : null);

                        return (
                            <TableRow key={res.id} className="hover:bg-slate-50/50 transition-colors border-slate-100 h-20">
                                <TableCell className="px-6">
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-800 text-sm">{mainGuest?.name || "Cliente S/N"}</span>
                                        <span className="text-[10px] font-bold text-primary tracking-widest uppercase">#{res.unique_code || "------"}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-bold capitalize">
                                            {format(new Date(res.date_time), "EEE d MMM, HH:mm", { locale: es })}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className="bg-slate-100 p-2 rounded-lg"><Users className="w-3.5 h-3.5 text-slate-600" /></div>
                                        <span className="font-black text-slate-800 text-sm">{res.party_size}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {getStatusBadge(res.status)}
                                </TableCell>
                                <TableCell className="px-6">
                                    <div className="flex items-center justify-end gap-2">
                                        {res.status === 'PENDIENTE' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="rounded-xl hover:bg-emerald-50 text-emerald-600 h-10 w-10 p-0"
                                                    onClick={() => handleStatusUpdate(res.id, 'CONFIRMADA')}
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="rounded-xl hover:bg-red-50 text-red-600 h-10 w-10 p-0"
                                                    onClick={() => handleStatusUpdate(res.id, 'RECHAZADA')}
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </Button>
                                            </>
                                        )}
                                        {res.status === 'CONFIRMADA' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 font-black uppercase text-[9px] tracking-widest px-4 h-10 gap-2"
                                                onClick={() => handleStatusUpdate(res.id, 'CHECK-IN CLIENTE')}
                                            >
                                                <UserCheck className="w-4 h-4" /> Check-in
                                            </Button>
                                        )}
                                        {res.status === 'CHECK-IN CLIENTE' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-black uppercase text-[9px] tracking-widest px-4 h-10 gap-2"
                                                onClick={() => handleStatusUpdate(res.id, 'COMPLETADA')}
                                            >
                                                <CheckCircle2 className="w-4 h-4" /> Finalizar
                                            </Button>
                                        )}
                                        <Button size="sm" variant="ghost" className="rounded-xl h-10 w-10 p-0">
                                            <ExternalLink className="w-4 h-4 text-slate-400" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
