"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    CalendarCheck,
    ShoppingBag,
    UtensilsCrossed,
    Settings,
    BarChart3,
    User,
    Menu,
    LogOut,
    Bell
} from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
    children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const { profile, signOut } = useAuth();
    const [restaurantName, setRestaurantName] = useState<string>("");
    const pathname = usePathname();
    const role = profile?.role?.toUpperCase() || 'USER';
    // Full access for administrators or owners
    const isAdmin = ['ADMIN', 'OWNER', 'SUPER_ADMIN', 'RESTAURANT_ADMIN'].includes(role);
    // Granular access layers
    const canViewReservations = isAdmin || ['OPERATIONS_MANAGER', 'RESERVATION_MANAGER'].includes(role);
    const canViewTakeaway = isAdmin || ['OPERATIONS_MANAGER', 'TAKEAWAY_MANAGER'].includes(role);
    const canViewMenu = isAdmin || ['OPERATIONS_MANAGER', 'MENU_MANAGER'].includes(role);
    const canViewSettings = isAdmin; // only admins can access system settings
    const canViewAccount = isAdmin; // only admins can view account page
    const { unreadCount } = useNotifications();

    useEffect(() => {
        if (profile?.restaurant_id) {
            const fetchRestaurant = async () => {
                const { data } = await supabase
                    .from("restaurants")
                    .select("name")
                    .eq("id", profile.restaurant_id)
                    .single();
                if (data) setRestaurantName(data.name);
            };
            fetchRestaurant();
        }
    }, [profile?.restaurant_id]);

    const renderNavLinks = () => {
        return (
            <nav className="space-y-2 font-medium w-full">
                {canViewReservations && (
                    <Link
                        href="/dashboard/reservations"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                            pathname.includes("/reservations")
                                ? "bg-primary text-primary-foreground font-bold shadow-md"
                                : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <CalendarCheck className="w-5 h-5" />
                        Reservas
                    </Link>
                )}

                {canViewTakeaway && (
                    <Link
                        href="/dashboard/takeaway"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                            pathname.includes("/takeaway")
                                ? "bg-emerald-600 text-white font-bold shadow-md"
                                : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <ShoppingBag className="w-5 h-5" />
                        Pedidos (Llevar)
                    </Link>
                )}

                {canViewMenu && (
                    <>
                        <Link
                            href="/dashboard/menu"
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                                pathname.includes("/menu")
                                    ? "bg-slate-800 text-white font-bold shadow-md"
                                    : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            <UtensilsCrossed className="w-5 h-5" />
                            Gestor de Menú
                        </Link>

                        <Link
                            href="/dashboard/settings"
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                                pathname.includes("/settings")
                                    ? "bg-slate-800 text-white font-bold shadow-md"
                                    : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            <Settings className="w-5 h-5" />
                            Gestión del Sistema
                        </Link>

                        <Link
                            href="/dashboard/account"
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                                pathname.includes("/account")
                                    ? "bg-blue-600 text-white font-bold shadow-md"
                                    : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            <User className="w-5 h-5" />
                            Tu cuenta Almuerzo.cl
                        </Link>

                        <div className="pt-4 mt-4 border-t border-border">
                            <Link
                                href="/dashboard/reports"
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                                    pathname.includes("/reports")
                                        ? "bg-orange-500 text-white font-bold shadow-md"
                                        : "text-muted-foreground hover:bg-muted hover:text-orange-500"
                                )}
                            >
                                <BarChart3 className="w-5 h-5" />
                                Reportes
                            </Link>
                        </div>
                    </>
                )}
            </nav>
        );
    };

    const NotificationList = () => {
        const { notifications, markAsRead, markAllAsRead } = useNotifications();

        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-black text-xl text-foreground uppercase tracking-tight">Notificaciones</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] uppercase font-bold text-primary"
                        onClick={markAllAsRead}
                    >
                        Limpiar todo
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4">
                    {notifications.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-40">
                            <Bell className="w-12 h-12 mb-4" />
                            <p className="font-bold">No tienes notificaciones aún</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div
                                key={n.id}
                                className={cn(
                                    "p-4 rounded-2xl border transition-all cursor-pointer relative",
                                    n.is_read
                                        ? "bg-muted/30 border-transparent opacity-60"
                                        : "bg-white border-primary/10 shadow-sm ring-1 ring-primary/5"
                                )}
                                onClick={() => !n.is_read && markAsRead(n.id)}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-black text-sm text-foreground pr-4 leading-tight uppercase tracking-tight">
                                        {n.title}
                                    </h3>
                                    {!n.is_read && (
                                        <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                    {n.message}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-3 font-bold uppercase tracking-wider">
                                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-72 flex-col bg-card border-r border-border p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-10">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <UtensilsCrossed className="text-primary h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="font-black text-xl tracking-tight leading-none text-foreground">
                            {restaurantName || "Almuerzo.cl"}
                        </h1>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest break-all">
                            {profile?.first_name} {profile?.last_name}
                        </span>
                    </div>
                </div>

                <div className="flex-1">
                    {renderNavLinks()}
                </div>

                <div className="mt-auto">
                    <button
                        onClick={signOut}
                        className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-destructive hover:bg-destructive/10 font-bold transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content + Mobile Header */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="md:hidden flex h-16 items-center border-b border-border bg-card px-4 shrink-0 shadow-sm z-30 justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <UtensilsCrossed className="text-primary h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="font-black text-lg tracking-tight leading-none text-foreground">
                                {restaurantName || "Almuerzo"}
                            </h1>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                                {profile?.first_name} {profile?.last_name}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Sheet>
                            <SheetTrigger asChild>
                                <div className="relative cursor-pointer">
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                                        <Bell className="h-6 w-6" />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-80 md:w-96 bg-card p-6 flex flex-col">
                                <NotificationList />
                            </SheetContent>
                        </Sheet>

                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Menu className="h-6 w-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-72 bg-card p-6 flex flex-col">
                                <h2 className="font-black text-lg mb-8 text-foreground uppercase tracking-tight">Menú Principal</h2>
                                <div className="flex-1">
                                    {renderNavLinks()}
                                </div>
                                <button
                                    onClick={signOut}
                                    className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-destructive hover:bg-destructive/10 font-bold transition-all mt-auto"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Cerrar Sesión
                                </button>
                            </SheetContent>
                        </Sheet>
                    </div>
                </header>

                {/* Desktop Header */}
                <header className="hidden md:flex h-20 items-center border-b border-border bg-white px-8 shrink-0 shadow-sm z-30 justify-between">
                    <div>
                        <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest">
                            Panel Operativo
                        </h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <Sheet>
                            <SheetTrigger asChild>
                                <div className="relative cursor-pointer">
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary transition-all">
                                        <Bell className="h-5 w-5" />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-96 bg-card p-6 flex flex-col">
                                <NotificationList />
                            </SheetContent>
                        </Sheet>
                        <div className="flex items-center gap-3 pl-6 border-l border-border">
                            <div className="text-right">
                                <p className="text-xs font-black text-foreground uppercase tracking-tight">
                                    {profile?.first_name} {profile?.last_name?.[0]}.
                                </p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                    {role}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-sm text-slate-600 border border-slate-200">
                                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-slate-50/50">
                    {children}
                </div>
            </main>
        </div>
    );
}
