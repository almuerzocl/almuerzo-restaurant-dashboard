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

        // Realtime Subscription
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
                (payload) => {
                    console.log('Realtime order update:', payload);
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

        return () => {
            supabase.removeChannel(channel);
        };
    }, [restaurantId]);

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        const result = await updateTakeawayStatusAction(id, newStatus);
        if (result.success) {
            toast.success(`Pedido movido a ${newStatus}`);
            
            // Track takeaway confirmation (A Cocina)
            if (restaurantId && profile?.id && newStatus === 'PREPARANDO') {
                trackAnalyticsEventAction(restaurantId, 'takeaway_confirm', profile.id);
            }
            // real-time handles refresh
        } else {
            toast.error("Error al actualizar estado");
        }
    };

    if (loading) {
        return <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando tablero...</div>;
    }

    // Filtrar solo las órdenes activas para la cocina (excluimos completados/cancelados del tablero principal)
    const activeOrders = orders.filter(o => ['PENDIENTE', 'PREPARANDO', 'LISTO'].includes(o.status));

    // Sort oldest first (highest priority)
    activeOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return (
        <div className="flex flex-col gap-6">
            {/* KPI Cards Top Level */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                    { id: "PENDIENTE", title: "Entrantes", color: "text-amber-500", border: "border-amber-500" },
                    { id: "PREPARANDO", title: "En Cocina", color: "text-blue-500", border: "border-blue-500" },
                    { id: "LISTO", title: "Listo", color: "text-purple-500", border: "border-purple-500" }
                ].map(col => {
                    const count = orders.filter(o => o.status === col.id).length;
                    return (
                        <div key={col.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between items-start transition-all hover:border-slate-700">
                            <div className="flex items-center gap-2 mb-4">
                                <div className={`w-2 h-2 rounded-full bg-current ${col.color}`} />
                                <span className={`text-[10px] uppercase font-black tracking-[0.2em] ${col.color}`}>{col.title}</span>
                            </div>
                            <span className="text-3xl font-black text-white leading-none">{count}</span>
                        </div>
                    );
                })}
            </div>

            {/* KDS (Kitchen Display System) Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
                {activeOrders.length === 0 ? (
                    <div className="col-span-full h-32 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-3xl bg-slate-50">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">No hay pedidos activos</p>
                    </div>
                ) : (
                    activeOrders.map(order => {
                        const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);

                        // Status styling
                        const isPendiente = order.status === 'PENDIENTE';
                        const isPreparando = order.status === 'PREPARANDO';
                        const isListo = order.status === 'LISTO';

                        const badgeColor = isPendiente ? 'bg-amber-100/50 text-amber-700' :
                            isPreparando ? 'bg-blue-100/50 text-blue-700' :
                                'bg-purple-100/50 text-purple-700';

                        const titleColor = isPendiente ? 'text-amber-500' :
                            isPreparando ? 'text-blue-500' :
                                'text-purple-500';

                        return (
                            <div key={order.id} className="bg-white rounded-3xl p-5 shadow-sm border-2 border-slate-200 flex flex-col gap-4 relative overflow-hidden group hover:border-slate-300 transition-all h-full">
                                {/* Card Header */}
                                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800 text-sm tracking-tight leading-none">
                                                {format(new Date(order.created_at), "HH:mm")}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-1 font-mono">
                                                #{order.id.split('-')[0].toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg ${badgeColor}`}>
                                        {order.status}
                                    </span>
                                </div>

                                {/* Customer Name */}
                                <div>
                                    <h4 className="font-black text-slate-900 text-lg leading-tight truncate">
                                        {order.customer_name || "Cliente S/N"}
                                    </h4>
                                </div>

                                {/* Order Items (CRITICAL FOR KITCHEN) */}
                                <div className="flex-1 bg-slate-50/50 rounded-xl p-3 border border-slate-100 overflow-y-auto min-h-[120px]">
                                    <ul className="space-y-2">
                                        {items.map((item: any, idx: number) => (
                                            <li key={idx} className="flex gap-2 items-start text-sm">
                                                <div className="font-black text-slate-800 bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-200 text-xs">
                                                    {item.quantity}x
                                                </div>
                                                <div className="flex-1">
                                                    <span className="font-bold text-slate-700">{item.name}</span>
                                                    {item.notes && (
                                                        <p className="text-xs text-red-500 font-medium italic mt-0.5">Nota: {item.notes}</p>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Card Actions */}
                                <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2 mt-auto">
                                    {isPendiente && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 w-full h-10 font-black uppercase tracking-widest text-[10px]"
                                                onClick={() => handleStatusUpdate(order.id, 'RECHAZADA')}
                                            >
                                                Rechazar
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white w-full h-10 font-black uppercase tracking-widest text-[10px]"
                                                onClick={() => handleStatusUpdate(order.id, 'PREPARANDO')}
                                            >
                                                A Cocina
                                            </Button>
                                        </>
                                    )}
                                    {isPreparando && (
                                        <Button
                                            size="sm"
                                            className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white w-full h-10 font-black uppercase tracking-widest text-[10px]"
                                            onClick={() => handleStatusUpdate(order.id, 'LISTO')}
                                        >
                                            Listo P/ Retiro
                                        </Button>
                                    )}
                                    {isListo && (
                                        <Button
                                            size="sm"
                                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white w-full h-10 font-black uppercase tracking-widest text-[10px]"
                                            onClick={() => handleStatusUpdate(order.id, 'COMPLETADO')}
                                        >
                                            Entregado
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
}
