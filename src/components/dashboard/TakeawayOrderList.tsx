"use client";

import { useEffect, useState } from "react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    getTakeawayOrdersAction,
    updateTakeawayStatusAction,
    trackAnalyticsEventAction
} from "@/app/actions/dashboard-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Package, ChefHat, CheckCircle, Clock, MoreHorizontal, ShoppingBag, ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { TakeawayOrder } from "@/types";
import { useAuth } from "@/context/AuthContext";

interface TakeawayOrderListProps {
    restaurantId: string | undefined;
}

export default function TakeawayOrderList({ restaurantId }: TakeawayOrderListProps) {
    const { profile } = useAuth();
    const [orders, setOrders] = useState<TakeawayOrder[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        if (!restaurantId) return;
        setLoading(true);
        const result = await getTakeawayOrdersAction(restaurantId, profile?.role || '');
        if (result.success) {
            setOrders(result.data || []);
        } else {
            toast.error("Error al cargar pedidos");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchOrders();
    }, [restaurantId]);

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        const result = await updateTakeawayStatusAction(id, newStatus);
        if (result.success) {
            toast.success(`Pedido actualizado a ${newStatus}`);
            
            // Track takeaway confirmation (A Cocina)
            if (restaurantId && profile?.id && newStatus === 'PREPARANDO') {
                trackAnalyticsEventAction(restaurantId, 'takeaway_confirm', profile.id);
            }

            fetchOrders();
        } else {
            toast.error("Error al actualizar estado");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PREPARANDO':
                return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none uppercase text-[10px] font-black tracking-widest px-3 py-1">En Cocina</Badge>;
            case 'LISTO':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none uppercase text-[10px] font-black tracking-widest px-3 py-1">Listo para retiro</Badge>;
            case 'COMPLETADO':
                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none uppercase text-[10px] font-black tracking-widest px-3 py-1">Entregado</Badge>;
            case 'PENDIENTE':
                return <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none uppercase text-[10px] font-black tracking-widest px-3 py-1">Nuevo</Badge>;
            case 'RECHAZADA':
            case 'CANCELADO':
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none uppercase text-[10px] font-black tracking-widest px-3 py-1">Cancelado</Badge>;
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

    if (orders.length === 0) {
        return (
            <div className="py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest italic">No hay pedidos registrados</p>
            </div>
        );
    }

    return (
        <div className="rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm">
            <Table>
                <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-slate-100 h-14">
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-500 px-6">Cliente / Pedido</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-500">Monto</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-500">Estado</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-500 text-right px-6">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors border-slate-100 h-20">
                            <TableCell className="px-6">
                                <div className="flex flex-col">
                                    <span className="font-black text-slate-800 text-sm">{order.customer_name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                                            {format(new Date(order.created_at), "HH:mm", { locale: es })}
                                        </span>
                                        <span className="text-[10px] font-bold text-primary tracking-widest uppercase">ID: {order.id.substring(0, 8)}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className="font-black text-slate-800 text-sm">${order.total_amount.toLocaleString('es-CL')}</span>
                            </TableCell>
                            <TableCell>
                                {getStatusBadge(order.status)}
                            </TableCell>
                            <TableCell className="px-6">
                                <div className="flex items-center justify-end gap-2">
                                    {order.status === 'PENDIENTE' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-xl border-amber-200 text-amber-600 hover:bg-amber-50 font-black uppercase text-[9px] tracking-widest px-4 h-10 gap-2"
                                            onClick={() => handleStatusUpdate(order.id, 'PREPARANDO')}
                                        >
                                            <ChefHat className="w-4 h-4" /> Preparar
                                        </Button>
                                    )}
                                    {order.status === 'PREPARANDO' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 font-black uppercase text-[9px] tracking-widest px-4 h-10 gap-2"
                                            onClick={() => handleStatusUpdate(order.id, 'LISTO')}
                                        >
                                            <Package className="w-4 h-4" /> Listo
                                        </Button>
                                    )}
                                    {order.status === 'LISTO' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-black uppercase text-[9px] tracking-widest px-4 h-10 gap-2"
                                            onClick={() => handleStatusUpdate(order.id, 'COMPLETADO')}
                                        >
                                            <CheckCircle className="w-4 h-4" /> Entregar
                                        </Button>
                                    )}
                                    <Button size="sm" variant="ghost" className="rounded-xl h-10 w-10 p-0">
                                        <ExternalLink className="w-4 h-4 text-slate-400" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
