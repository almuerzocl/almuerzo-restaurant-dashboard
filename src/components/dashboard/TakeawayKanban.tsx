"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getTakeawayOrdersAction, updateTakeawayStatusAction, trackAnalyticsEventAction } from "@/app/actions/dashboard-actions";
import { toast } from "sonner";
import { CheckCircle2, ShoppingBag, XCircle, Clock, Utensils, Coins, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface TakeawayKanbanProps {
    restaurantId: string | undefined;
}

export default function TakeawayKanban({ restaurantId }: TakeawayKanbanProps) {
    const { profile } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        if (!restaurantId) return;
        const result = await getTakeawayOrdersAction(restaurantId, profile?.role || '');
        if (result.success) {
            setOrders(result.data || []);
        }
    };

    useEffect(() => {
        if (!restaurantId) return;

        // Initial fetch
        fetchOrders().then(() => setLoading(false));

        // Realtime Subscription (Postgres Changes)
        const channel = supabase
            .channel(`orders-${restaurantId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'takeaway_orders',
                    filter: `restaurant_id=eq.${restaurantId}`
                },
                (payload: any) => {
                    console.log('Realtime order update (Postgres):', payload);
                    fetchOrders();

                    if (payload.eventType === 'INSERT') {
                        toast.success("¡Nuevo pedido para llevar!", {
                            icon: '🥡',
                            duration: 5000
                        });
                    }
                }
            )
            .subscribe();

        // Broadcast fallback (Signal from PWA)
        const signalChannel = supabase
            .channel(`restaurant-signals-${restaurantId}`)
            .on(
                'broadcast',
                { event: 'new_notification' },
                (payload: any) => {
                    console.log('📡 Signal received in Kanban:', payload);
                    if (payload?.payload?.type === 'takeaway') {
                        fetchOrders();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(signalChannel);
        };
    }, [restaurantId]);

    const handleStatusUpdate = async (id: string, newStatus: string, reason?: string) => {
        const result = await updateTakeawayStatusAction(id, newStatus, reason);
        if (result.success) {
            toast.success(`Pedido movido a ${newStatus}`);
            
            // Track takeaway confirmation (A Cocina)
            if (restaurantId && profile?.id && newStatus === 'PREPARANDO') {
                trackAnalyticsEventAction(restaurantId, 'takeaway_confirm', profile.id);
            }
            // Real-time handles it, but let's force a refresh for guaranteed feedback
            await fetchOrders();
        } else {
            toast.error("Error al actualizar estado: " + result.error);
        }
    };

    if (loading) {
        return <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando tablero...</div>;
    }

    // Definición de Columnas según el nuevo flujo
    const columns = [
        { id: "PENDIENTE", title: "PENDIENTE", color: "text-amber-500", border: "border-amber-500", badge: "bg-amber-100/50 text-amber-700" },
        { id: "APROBADA", title: "APROBADA", color: "text-emerald-500", border: "border-emerald-500", badge: "bg-emerald-100/50 text-emerald-700" },
        { id: "PREPARANDO", title: "PREPARANDO", color: "text-blue-500", border: "border-blue-500", badge: "bg-blue-100/50 text-blue-700" },
        { id: "LISTO", title: "LISTO", color: "text-purple-500", border: "border-purple-500", badge: "bg-purple-100/50 text-purple-700" }
    ];

    const handleReject = async (id: string) => {
        const reason = window.prompt("Por favor, justifique el rechazo del pedido (Reputación, falta de servicio, falta de producto):");
        if (reason) {
            handleStatusUpdate(id, 'RECHAZADA', reason);
        } else {
            toast.error("El rechazo debe estar justificado.");
        }
    };

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-180px)]">
            <div className="flex flex-1 gap-6 overflow-x-auto pb-4 items-start">
                {columns.map(col => {
                    const colOrders = orders
                        .filter(o => {
                            if (col.id === 'PENDIENTE') return o.status === 'PENDIENTE' || o.status === 'CREADA';
                            return o.status === col.id;
                        })
                        .sort((a, b) => {
                            const timeA = (a.metadata?.pickup_time || "23:59");
                            const timeB = (b.metadata?.pickup_time || "23:59");
                            return timeA.localeCompare(timeB);
                        });

                    return (
                        <div key={col.id} className="flex flex-col w-[350px] min-w-[320px] max-w-[400px] h-full bg-slate-950/40 rounded-[2.5rem] border border-slate-800 p-5 shrink-0">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6 px-2">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full bg-current ${col.color} animate-pulse`} />
                                    <h3 className={`font-black text-xs uppercase tracking-widest ${col.color}`}>{col.title}</h3>
                                </div>
                                <span className="bg-slate-800 text-slate-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-slate-700">
                                    {colOrders.length}
                                </span>
                            </div>

                            {/* Stack */}
                            <div className="flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
                                {colOrders.length === 0 ? (
                                    <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-[2rem] opacity-30">
                                        <Box className="w-8 h-8 text-slate-600 mb-2" />
                                        <p className="text-slate-600 text-[9px] font-black uppercase tracking-widest text-center">Bandeja Vacía</p>
                                    </div>
                                ) : (
                                    colOrders.map(order => {
                                        const items = (() => {
                                            try {
                                                const raw = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
                                                return Array.isArray(raw) ? raw : [];
                                            } catch (e) {
                                                console.error("Error parsing items for order", order.id, e);
                                                return [];
                                            }
                                        })();
                                        const itemCount = items.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 1), 0);
                                        const orderCode = order.id.split('-')[0].toUpperCase();
                                        const ticketUrl = `https://ticket.almuerzo.cl/o/${order.id}`;
                                        const pickupTime = order.metadata?.pickup_time || format(new Date(order.created_at), "HH:mm");
                                        
                                        // No Show Logic: 1 hour after ready_at (check root and metadata)
                                        const readyAtVal = order.ready_at || (order.metadata as any)?.ready_at;
                                        const readyAt = readyAtVal ? new Date(readyAtVal) : null;
                                        const isNoShowEligible = readyAt && (new Date().getTime() - readyAt.getTime() > 3600000);

                                        return (
                                            <div
                                                key={order.id}
                                                className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-200 flex flex-col gap-4 relative overflow-hidden group hover:border-primary/50 transition-all cursor-pointer"
                                                onClick={() => window.open(ticketUrl, '_blank')}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                                                            <Clock className="w-3 h-3" />
                                                            <span className="text-[9px] font-black uppercase tracking-tighter">Entrega</span>
                                                        </div>
                                                        <span className="text-xl font-black text-slate-900 leading-none">{pickupTime}</span>
                                                    </div>
                                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-lg ${col.badge}`}>#{orderCode}</span>
                                                </div>

                                                <div className="border-l-4 border-slate-100 pl-3 -ml-1">
                                                    <h4 className="font-black text-slate-800 text-lg leading-none truncate group-hover:text-primary">{order.customer_name || "Cliente S/N"}</h4>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                                                    <span className="text-xs font-black text-slate-700">{itemCount} items</span>
                                                    <span className="text-xs font-black text-emerald-600 text-right">${order.total_amount.toLocaleString('es-CL')}</span>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex flex-col gap-2 mt-1" onClick={e => e.stopPropagation()}>
                                                    {(order.status === 'PENDIENTE' || order.status === 'CREADA') && (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <Button size="sm" variant="outline" className="rounded-xl border-rose-100 text-rose-500 h-10 font-black uppercase text-[9px]" onClick={() => handleReject(order.id)}>Rechazar</Button>
                                                            <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-10 font-black uppercase text-[9px]" onClick={() => handleStatusUpdate(order.id, 'APROBADA')}>Aprobar</Button>
                                                        </div>
                                                    )}
                                                    {order.status === 'APROBADA' && (
                                                        <Button size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white h-10 font-black uppercase text-[9px]" onClick={() => handleStatusUpdate(order.id, 'PREPARANDO')}>Preparar</Button>
                                                    )}
                                                    {order.status === 'PREPARANDO' && (
                                                        <Button size="sm" className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white h-10 font-black uppercase text-[9px]" onClick={() => handleStatusUpdate(order.id, 'LISTO')}>Listo</Button>
                                                    )}
                                                    {order.status === 'LISTO' && (
                                                        <div className="flex flex-col gap-2">
                                                            <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-10 font-black uppercase text-[10px]" onClick={() => handleStatusUpdate(order.id, 'ENTREGADO')}>Entregar Pedido</Button>
                                                            {isNoShowEligible && (
                                                                <Button size="sm" className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white h-10 font-black uppercase text-[9px]" onClick={() => handleStatusUpdate(order.id, 'NO SHOW')}>No Show</Button>
                                                            )}
                                                        </div>
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
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
            `}</style>
        </div>
    );
}


