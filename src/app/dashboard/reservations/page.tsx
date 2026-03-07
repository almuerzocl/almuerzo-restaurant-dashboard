"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users, Clock, Ban, CheckCircle2, TrendingUp, AlertCircle, PlusCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ReservationMetrics from "@/components/dashboard/ReservationMetrics";
import BlockSeatsDialog from "@/components/dashboard/BlockSeatsDialog";
import ManualReservationDialog from "@/components/dashboard/ManualReservationDialog";
import ReservationList from "@/components/dashboard/ReservationList";
import ReservationsKanban from "@/components/dashboard/ReservationsKanban";
import { trackAnalyticsEventAction } from "@/app/actions/dashboard-actions";

export default function ReservationsPage() {
    const { profile } = useAuth();
    const role = profile?.role?.toUpperCase();
    const canViewReservations = role && ['ADMIN', 'OPERATIONS_MANAGER', 'RESERVATION_MANAGER', 'OWNER'].includes(role);
    if (!canViewReservations) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Acceso denegado: no tiene permisos para ver reservas.</p>
            </div>
        );
    }
    const [activeTab, setActiveTab] = useState("panel");

    // Track 'view_reservations' when entering reservations page
    useEffect(() => {
        if (profile?.restaurant_id && profile?.id) {
            trackAnalyticsEventAction(profile.restaurant_id!, 'view_reservations', profile.id);
        }
    }, [profile?.restaurant_id, profile?.id]);

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight leading-none">Reservas</h1>
                    <p className="text-muted-foreground">Estado de la sala y gestión de clientes</p>
                </div>

                {/* Overrides Rápidos para Recepcionista */}
                <div className="flex gap-2">
                    <BlockSeatsDialog restaurantId={profile?.restaurant_id} />
                    <ManualReservationDialog restaurantId={profile?.restaurant_id} />
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full md:w-[400px] grid-cols-2 mb-8 bg-muted/60 p-1">
                    <TabsTrigger value="panel" className="rounded-md font-bold text-sm tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Panel de Control
                    </TabsTrigger>
                    <TabsTrigger value="gestion" className="rounded-md font-bold text-sm tracking-tight data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Gestión de Reservas
                    </TabsTrigger>
                </TabsList>

                {/* TABA 1: PANEL DE CONTROL */}
                <TabsContent value="panel" className="space-y-8 animate-in fade-in-50 duration-300">
                    <ReservationMetrics restaurantId={profile?.restaurant_id} />

                    {/* Kanban Board */}
                    <div className="mt-8">
                        <ReservationsKanban restaurantId={profile?.restaurant_id} />
                    </div>
                </TabsContent>

                {/* TABA 2: GESTIÓN DE RESERVAS PROFUNDA */}
                <TabsContent value="gestion" className="animate-in fade-in-50 duration-300">
                    <Card className="shadow-sm border-border p-8 rounded-[3rem]">
                        <CardHeader className="px-0 pt-0 mb-6">
                            <CardTitle className="tracking-tight text-xl font-black uppercase text-slate-800">Lista Maestra de Reservas</CardTitle>
                            <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-slate-400 italic">
                                Acciones manuales de aceptación, rechazo, check-in pwa.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-0">
                            <ReservationList restaurantId={profile?.restaurant_id} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
