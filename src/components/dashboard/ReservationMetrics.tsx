"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, Ban, CheckCircle2, TrendingUp, Loader2 } from "lucide-react";
import { getDashboardMetricsAction } from "@/app/actions/dashboard-actions";
import { toast } from "sonner";

interface MetricsProps {
    restaurantId: string;
}

export default function ReservationMetrics({ restaurantId }: MetricsProps) {
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchMetrics = async () => {
        const result = await getDashboardMetricsAction(restaurantId);
        if (result.success) {
            setMetrics(result.data);
        } else {
            console.error(result.error);
            // toast.error("Error cargando métricas"); // Don't spam if it's just a dev error
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMetrics();
        // Polling (optional) or use Realtime for actual data
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

    // Default Fallback
    const data = (metrics?.reservations) || {
        totalCapacity: 50,
        currentOccupancy: 0,
        pendingCheckin: 0,
        blockedSeats: 0,
        completedToday: 0
    };

    const occupancyRate = (data.currentOccupancy / data.totalCapacity) * 100;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm border-border bg-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-bold tracking-tight text-foreground">Ocupación Actual</CardTitle>
                    <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black">{data.currentOccupancy}<span className="text-lg text-muted-foreground font-medium">/{data.totalCapacity}</span></div>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                        <span className={`font-bold flex items-center ${occupancyRate > 80 ? 'text-red-500' : 'text-emerald-500'}`}>
                            <TrendingUp className="h-3 w-3 inline mr-1" />
                            {Math.round(occupancyRate)}%
                        </span> de la capacidad del local
                    </p>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-bold tracking-tight text-foreground">Pendientes de Check-in</CardTitle>
                    <Clock className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black">{data.pendingCheckin}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Reservas esperando a llegar hoy.
                    </p>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-bold tracking-tight text-foreground">Sillas Bloqueadas</CardTitle>
                    <Ban className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black text-red-500">{data.blockedSeats}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Por motivos administrativos.
                    </p>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-bold tracking-tight text-foreground">Ya Completadas</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black">{data.completedToday}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Mesas que ya terminaron su servicio.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
