"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, ChefHat, CheckCircle2, TimerReset } from "lucide-react";
import { getDashboardMetricsAction } from "@/app/actions/dashboard-actions";

interface MetricsProps {
    restaurantId: string;
}

export default function TakeawayMetrics({ restaurantId }: MetricsProps) {
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchMetrics = async () => {
        const result = await getDashboardMetricsAction(restaurantId);
        if (result.success) {
            setMetrics(result.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 30000);
        return () => clearInterval(interval);
    }, [restaurantId]);

    if (loading && !metrics) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="h-32 bg-slate-50 border-border/50" />
                ))}
            </div>
        );
    }

    const data = (metrics?.takeaway) || {
        new: 0,
        preparing: 0,
        ready: 0,
        completedToday: 0
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm border-emerald-500/20 bg-emerald-50/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-bold tracking-tight text-emerald-800">Nuevos</CardTitle>
                    <ShoppingBag className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black text-emerald-600">{data.new}</div>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                        Pedidos esperando aceptación.
                    </p>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-bold tracking-tight text-foreground">Preparando</CardTitle>
                    <ChefHat className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black">{data.preparing}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Actualmente en la cocina.
                    </p>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50 bg-slate-50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-bold tracking-tight text-foreground">Listos (Esperando Cliente)</CardTitle>
                    <TimerReset className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black text-primary">{data.ready}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Empaquetados y esperando retiro.
                    </p>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-bold tracking-tight text-foreground">Completados Hoy</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black">{data.completedToday}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Pagados y entregados con éxito.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
