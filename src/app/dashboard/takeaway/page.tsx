"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    ShoppingBag,
    ChefHat,
    CheckCircle2,
    AlertTriangle,
    TimerReset
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import TakeawayMetrics from "@/components/dashboard/TakeawayMetrics";
import TakeawayOrderList from "@/components/dashboard/TakeawayOrderList";
import TakeawayKanban from "@/components/dashboard/TakeawayKanban";
import { trackAnalyticsEventAction } from "@/app/actions/dashboard-actions";

export default function TakeawayPage() {
    const { profile } = useAuth();
    const role = profile?.role?.toUpperCase();
    const canViewTakeaway = role && ['ADMIN', 'OPERATIONS_MANAGER', 'TAKEAWAY_MANAGER', 'OWNER'].includes(role);
    if (!canViewTakeaway) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Acceso denegado: no tiene permisos para ver pedidos takeaway.</p>
            </div>
        );
    }
    const [activeTab, setActiveTab] = useState("panel");

    useEffect(() => {
        if (profile?.restaurant_id && profile?.id) {
            trackAnalyticsEventAction(profile.restaurant_id!, 'view_takeaway', profile.id);
        }
    }, [profile?.restaurant_id, profile?.id]);

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-20">
            <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tight leading-none text-emerald-600">Pedidos</h1>
                <p className="text-muted-foreground">Flujo de Delivery/Takeaway</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full md:w-[400px] grid-cols-2 mb-8 bg-muted/60 p-1">
                    <TabsTrigger value="panel" className="rounded-md font-bold text-sm tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Producción (Kanban)
                    </TabsTrigger>
                    <TabsTrigger value="gestion" className="rounded-md font-bold text-sm tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Historial & Detalles
                    </TabsTrigger>
                </TabsList>

                {/* TABA 1: PANEL DE TAKEAWAY */}
                <TabsContent value="panel" className="space-y-8 animate-in fade-in-50 duration-300">
                    <TakeawayMetrics restaurantId={profile?.restaurant_id} />

                    <div className="mt-8">
                        <TakeawayKanban restaurantId={profile?.restaurant_id} />
                    </div>
                </TabsContent>

                {/* TABA 2: BANDEJA DE ENTRADA Y COCINA */}
                <TabsContent value="gestion" className="animate-in fade-in-50 duration-300">
                    <Card className="shadow-sm border-slate-100 p-8 rounded-[3rem]">
                        <CardHeader className="px-0 pt-0 mb-6">
                            <CardTitle className="tracking-tight text-xl font-black uppercase text-slate-800">Lista Maestra de Pedidos</CardTitle>
                            <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-slate-400 italic">
                                Detalles completos de ítems e historial del cliente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-0">
                            <TakeawayOrderList restaurantId={profile?.restaurant_id} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
