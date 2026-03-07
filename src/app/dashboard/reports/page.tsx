"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    BarChart3,
    Users,
    Heart,
    Bell,
    CalendarCheck,
    ShoppingBag,
    TrendingUp,
    Clock,
    Calendar,
    ChevronRight,
    MousePointer2,
    CheckCircle2,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";
import { getAnalyticsReportAction, getGA4StatsAction, trackAnalyticsEventAction } from "@/app/actions/dashboard-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function AnalyticsPage() {
    const { profile } = useAuth();
    const restaurantId = profile?.restaurant_id;
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [range, setRange] = useState("today");

    const fetchStats = async (selectedRange: string) => {
        if (!restaurantId) return;
        setLoading(true);

        let startTime = new Date();
        const endTime = new Date();

        if (selectedRange === "realtime") {
            startTime.setHours(startTime.getHours() - 1);
        } else if (selectedRange === "today") {
            startTime.setHours(0, 0, 0, 0);
        } else if (selectedRange === "week") {
            startTime.setDate(startTime.getDate() - 7);
        }

        const startTimeStr = startTime.toISOString();
        const endTimeStr = endTime.toISOString();
        
        const [result, ga4Result] = await Promise.all([
            getAnalyticsReportAction(restaurantId, startTimeStr, endTimeStr),
            getGA4StatsAction(restaurantId, startTimeStr, endTimeStr)
        ]);

        if (result.success) {
            const finalStats = result.data;
            if (ga4Result.success && ga4Result.data) {
                if (!finalStats.local) finalStats.local = {};
                if (!finalStats.local.pwa) finalStats.local.pwa = { unique_users: 0, app_sessions: 0 };
                if (!finalStats.platform_avg) finalStats.platform_avg = {};
                if (!finalStats.platform_avg.pwa) finalStats.platform_avg.pwa = { unique_users: 0, app_sessions: 0 };

                finalStats.local.pwa.app_sessions = ga4Result.data.app_sessions;
                finalStats.local.pwa.unique_users = ga4Result.data.unique_users;
                
                // Assuming ~ 100 restaurants for average, otherwise backend needs to pass this count
                finalStats.platform_avg.pwa.app_sessions = Math.round(ga4Result.data.total_platform_sessions / 100) || 0;
            }
            setStats(finalStats);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchStats(range);
        if (restaurantId && profile?.id) {
            trackAnalyticsEventAction(restaurantId, 'view_reports', profile.id);
        }
    }, [restaurantId, range, profile?.id]);

    if (!stats && loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-64" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
                </div>
                <Skeleton className="h-[400px] rounded-3xl" />
            </div>
        );
    }

    const local = stats?.local || {};
    const platform = stats?.platform_avg || {};

    const pwa = local.pwa || { unique_users: 0, app_sessions: 0 };
    const avgPwa = platform.pwa || { unique_users: 0, app_sessions: 0 };

    const funnel = local.funnel || {
        home_views: 0,
        menu_views: 0,
        reservation_starts: 0,
        reservation_completes: 0,
        takeaway_starts: 0,
        takeaway_completes: 0
    };

    const current = local.current || {
        favorites: 0,
        subscriptions: 0
    };

    const financial = local.financial || {
        total_revenue: 0,
        avg_ticket: 0
    };

    const avgFinancial = platform.financial || {
        total_revenue: 0,
        avg_ticket: 0
    };

    const avgFunnel = platform.funnel || {};
    const avgCurrent = platform.current || {};

    const getConversion = (currentVal: number, previousVal: number): number => {
        if (!previousVal || previousVal === 0) return 0;
        const res = ((currentVal / previousVal) * 100);
        return Math.round(res * 10) / 10;
    };

    const ComparisonBadge = ({ localVal, platformVal, isPercentage = false }: { localVal: number, platformVal: number, isPercentage?: boolean }) => {
        const diff = platformVal === 0 ? 0 : ((localVal - platformVal) / platformVal) * 100;
        const isBetter = localVal >= platformVal;

        return (
            <Badge variant="secondary" className={`mt-2 rounded-lg font-bold text-[10px] py-0 h-5 border-none ${isBetter ? 'bg-emerald-500/20 text-emerald-100' : 'bg-rose-500/20 text-rose-100'}`}>
                {isBetter ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {Math.abs(diff).toFixed(0)}% vs Plataforma ({platformVal})
            </Badge>
        );
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header with Range Selector */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <BarChart3 className="text-orange-500 w-8 h-8" />
                        Analytics del Local
                    </h1>
                    <p className="text-muted-foreground font-medium">
                        Rendimiento del embudo de ventas y lealtad de marca.
                    </p>
                </div>

                <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex gap-1">
                    <Button
                        variant={range === "realtime" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setRange("realtime")}
                        className="rounded-xl font-bold h-9 px-4"
                    >
                        <Clock className="w-4 h-4 mr-2" /> Real-time
                    </Button>
                    <Button
                        variant={range === "today" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setRange("today")}
                        className="rounded-xl font-bold h-9 px-4"
                    >
                        <Calendar className="w-4 h-4 mr-2" /> Hoy
                    </Button>
                    <Button
                        variant={range === "week" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setRange("week")}
                        className="rounded-xl font-bold h-9 px-4"
                    >
                        <TrendingUp className="w-4 h-4 mr-2" /> Semana
                    </Button>
                </div>
            </div>

            {/* Top Cards: PWA & GA4 KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-gradient-to-br from-rose-500 to-rose-600 text-white overflow-hidden relative group">
                    <Heart className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform duration-500" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest opacity-80">Seguidores / Favoritos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-5xl font-black mb-1">{current.favorites}</div>
                        <p className="text-xs font-bold opacity-70">Clientes han guardado este local <span className="underline">hoy</span></p>
                        <ComparisonBadge localVal={current.favorites} platformVal={avgCurrent.favorites} />
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative group">
                    <Bell className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform duration-500" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest opacity-80">Suscripciones al Menú</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-5xl font-black mb-1">{current.subscriptions}</div>
                        <p className="text-xs font-bold opacity-70">Reciben notificaciones diarias de tu oferta</p>
                        <ComparisonBadge localVal={current.subscriptions} platformVal={avgCurrent.subscriptions} />
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden relative group">
                    <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform duration-500" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest opacity-80">Ventas (Revenue)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black mb-1">
                            ${financial.total_revenue.toLocaleString('es-CL')}
                        </div>
                        <p className="text-xs font-bold opacity-70">Ingresos brutos por takeaway</p>
                        <ComparisonBadge localVal={financial.total_revenue} platformVal={avgFinancial.total_revenue} />
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-gradient-to-br from-slate-800 to-slate-900 text-white overflow-hidden relative group">
                    <MousePointer2 className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform duration-500" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest opacity-80">Sesiones PWA / GA4</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-5xl font-black mb-1">
                            {pwa.app_sessions}
                        </div>
                        <p className="text-xs font-bold opacity-70">Visitas registradas</p>
                        <ComparisonBadge localVal={pwa.app_sessions} platformVal={avgPwa.app_sessions} />
                    </CardContent>
                </Card>
            </div>

            {/* Funnel Section */}
            <Card className="rounded-[3rem] border-none shadow-2xl shadow-slate-200/60 bg-white p-8">
                <CardHeader className="px-0 pt-0 pb-8">
                    <CardTitle className="text-2xl font-black tracking-tight">Embudo de Operaciones (Conversion Funnel)</CardTitle>
                    <CardDescription className="text-slate-500 font-medium">Desde la Home hasta el ticket cerrado</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                    <div className="space-y-8">
                        {/* 1. Visibilidad */}
                        <div className="relative">
                            <div className="flex justify-between items-end mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-100 p-3 rounded-2xl"><MousePointer2 className="w-5 h-5 text-slate-600" /></div>
                                    <div>
                                        <div className="text-sm font-black text-slate-800 uppercase tracking-tight">Home Visualizations</div>
                                        <div className="text-xs text-slate-400 font-bold">Clientes vieron tu restaurante en la lista</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-slate-800">{funnel.home_views}</div>
                                    <div className="text-[10px] font-bold text-slate-400">Plataforma: {avgFunnel.home_views}</div>
                                </div>
                            </div>
                            <div className="h-6 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                <div className="h-full bg-slate-800 w-full" />
                            </div>
                        </div>

                        {/* 2. Interés */}
                        <div className="relative">
                            <div className="flex justify-between items-end mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-50 p-3 rounded-2xl"><Users className="w-5 h-5 text-blue-600" /></div>
                                    <div>
                                        <div className="text-sm font-black text-blue-800 uppercase tracking-tight">Visitas al Perfil / Menú</div>
                                        <div className="text-xs text-slate-400 font-bold">Interés real: {getConversion(funnel.menu_views, funnel.home_views)}% Conv.</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-slate-800">{funnel.menu_views}</div>
                                    <div className="text-[10px] font-bold text-slate-400">Plataforma: {avgFunnel.menu_views}</div>
                                </div>
                            </div>
                            <div className="h-6 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-1000"
                                    style={{ width: `${getConversion(funnel.menu_views, funnel.home_views)}%` }}
                                />
                            </div>
                        </div>

                        {/* 3. Intención Dual */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
                            {/* Reservas */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="flex items-center gap-2">
                                        <CalendarCheck className="w-4 h-4 text-primary" />
                                        <span className="text-xs font-black uppercase text-slate-400">Intención Reserva</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold">{funnel.reservation_starts}</div>
                                        <div className="text-[10px] font-bold text-slate-300">Plataforma: {avgFunnel.reservation_starts}</div>
                                    </div>
                                </div>
                                <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${getConversion(funnel.reservation_starts, funnel.menu_views)}%` }} />
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 p-5 rounded-[2rem] border border-slate-100 relative overflow-hidden group">
                                    <div className="flex items-center gap-3 z-10">
                                        <div className="bg-emerald-500 p-2 rounded-xl"><CheckCircle2 className="w-4 h-4 text-white" /></div>
                                        <div>
                                            <span className="text-sm font-black text-slate-700 uppercase">Reservas Exitosas</span>
                                            <div className="text-[10px] font-bold text-slate-400">Plataforma: {avgFunnel.reservation_completes}</div>
                                        </div>
                                    </div>
                                    <div className="text-2xl font-black text-emerald-600 z-10">{funnel.reservation_completes}</div>
                                    <div className="absolute right-0 top-0 h-full w-1 bg-emerald-500" />
                                </div>
                            </div>

                            {/* Takeaway */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="flex items-center gap-2">
                                        <ShoppingBag className="w-4 h-4 text-emerald-600" />
                                        <span className="text-xs font-black uppercase text-slate-400">Intención Pedido</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold">{funnel.takeaway_starts}</div>
                                        <div className="text-[10px] font-bold text-slate-300">Plataforma: {avgFunnel.takeaway_starts}</div>
                                    </div>
                                </div>
                                <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-600" style={{ width: `${getConversion(funnel.takeaway_starts, funnel.menu_views)}%` }} />
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 p-5 rounded-[2rem] border border-slate-100 relative overflow-hidden group">
                                    <div className="flex items-center gap-3 z-10">
                                        <div className="bg-emerald-500 p-2 rounded-xl"><CheckCircle2 className="w-4 h-4 text-white" /></div>
                                        <div>
                                            <span className="text-sm font-black text-slate-700 uppercase">Pedidos Exitosos</span>
                                            <div className="text-[10px] font-bold text-slate-400">Plataforma: {avgFunnel.takeaway_completes}</div>
                                        </div>
                                    </div>
                                    <div className="text-2xl font-black text-emerald-600 z-10">{funnel.takeaway_completes}</div>
                                    <div className="absolute right-0 top-0 h-full w-1 bg-emerald-500" />
                                </div>
                            </div>
                        </div>

                        {/* Metas Totales */}
                        <div className="mt-12 bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4">
                                <Badge className="bg-white/10 text-white border-none font-bold text-[10px]">COMPARATIVA PLATAFORMA ACTIVADA</Badge>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-black">Cierre de Operaciones</h3>
                                <p className="text-slate-400 text-sm font-medium">Suma de reservas y pedidos confirmados en este rango.</p>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-center">
                                    <div className="text-4xl font-black text-orange-400">{funnel.reservation_completes + funnel.takeaway_completes}</div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Transacciones</div>
                                    <div className="text-[10px] font-bold text-slate-400">Avg: {Number(avgFunnel.reservation_completes) + Number(avgFunnel.takeaway_completes)}</div>
                                </div>
                                <div className="h-12 w-px bg-slate-800" />
                                <div className="text-center">
                                    <div className="text-4xl font-black text-emerald-400">
                                        {getConversion(funnel.reservation_completes + funnel.takeaway_completes, funnel.reservation_starts + funnel.takeaway_starts)}%
                                    </div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Closure Rate</div>
                                    <div className="text-[10px] font-bold text-slate-400">
                                        Avg: {getConversion(Number(avgFunnel.reservation_completes) + Number(avgFunnel.takeaway_completes), Number(avgFunnel.reservation_starts) + Number(avgFunnel.takeaway_starts))}%
                                    </div>
                                </div>
                                <Button className="rounded-2xl h-12 px-6 font-black ml-4" variant="secondary">
                                    Exportar CSV <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
