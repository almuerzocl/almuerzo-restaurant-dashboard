"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    getRestaurantSettingsAction,
    updateRestaurantSettingsAction,
    getReservationBlocksAction,
    deleteReservationBlockAction,
    blockSeatsAction,
    trackAnalyticsEventAction
} from "@/app/actions/dashboard-actions";
import { isAdmin } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import {
    Settings as SettingsIcon, CalendarCheck, ShoppingBag, Clock, Users, Trophy, DollarSign,
    Package, Store, Timer, AlertCircle, Info, MapPin, Phone, FileText, ChevronRight,
    Camera, Calendar, Trash2, Plus, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function SystemManagementPage() {
    const { profile } = useAuth();
    const canViewSettings = isAdmin(profile as any);
    const restaurantId = profile?.restaurant_id;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    const [blocks, setBlocks] = useState<any[]>([]);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [newBlock, setNewBlock] = useState({ start: "", end: "", reason: "", seats: 0 });
    const logoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const fetchData = async () => {
        if (!restaurantId) return;
        setLoading(true);
        setFetchError(null);
        try {
            const [settingsRes, blocksRes] = await Promise.all([
                getRestaurantSettingsAction(restaurantId),
                getReservationBlocksAction(restaurantId)
            ]);
            
            if (settingsRes.success) {
                setSettings(settingsRes.data);
            } else {
                setFetchError(settingsRes.error || "Error al cargar configuración");
            }

            if (blocksRes.success) {
                setBlocks(blocksRes.data || []);
            }
        } catch (e: any) {
            setFetchError(e.message || "Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        if (restaurantId && profile?.id) {
            trackAnalyticsEventAction(restaurantId, 'view_reports', profile.id);
        }
    }, [restaurantId, profile?.id]);

    if (!canViewSettings) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertCircle className="w-12 h-12 text-slate-300" />
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Acceso Restringido</h2>
                <p className="text-slate-500 font-medium">No tienes permisos para administrar la configuración del sistema.</p>
            </div>
        );
    }

    const handleSave = async (updates: any) => {
        setSaving(true);
        try {
            const result = await updateRestaurantSettingsAction(restaurantId, updates);
            if (result.success) {
                setSettings((prev: any) => ({ ...prev, ...updates }));
                toast.success("Configuración actualizada", {
                    description: "Los cambios se han guardado correctamente.",
                    className: "font-black uppercase text-[10px] tracking-widest",
                });
            } else {
                toast.error("Error al actualizar", {
                    description: result.error,
                });
            }
        } catch (error) {
            toast.error("Error de conexión", {
                description: "No se pudo conectar con el servidor.",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (!file || !restaurantId) return;

        setSaving(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${restaurantId}-${field}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const bucketName = 'restaurants'; // Assuming this bucket exists

            const { data, error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) {
                // If bucket doesn't exist, this might fail. In a real scenario, we'd ensure it exists.
                console.error("Storage upload error:", uploadError);
                throw new Error("Error al subir archivo a storage: " + uploadError.message);
            }

            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(data.path);

            await handleSave({ [field]: publicUrl });
            toast.success("Imagen actualizada correctamente");
        } catch (error: any) {
            console.error("Image upload failed:", error);
            toast.error("Fallo al subir la imagen", {
                description: error.message || "Verifica los permisos de almacenamiento."
            });
        } finally {
            setSaving(false);
            if (e.target) e.target.value = '';
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-[500px] w-full rounded-[3rem]" />
            </div>
        );
    }

    if (fetchError || !settings) {
        return (
            <div className="p-8">
                <Alert variant="destructive" className="rounded-2xl border-none shadow-lg bg-red-50 text-red-900">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-black uppercase tracking-tight">Error de Sincronización</AlertTitle>
                    <AlertDescription className="font-medium">
                        {fetchError || "No se pudo recuperar la información del restaurante."}
                    </AlertDescription>
                    <Button variant="outline" className="mt-4 border-red-200 hover:bg-red-100 font-bold" onClick={fetchData}>Reintentar</Button>
                </Alert>
            </div>
        );
    }

    const resSettings = settings.reservation_settings || { max_party_size: 10, min_reputation: 80 };
    const takeSettings = settings.takeaway_settings || {
        max_items: 15,
        max_order_amount: 150000,
        min_reputation: 80,
        opening_offset: 30,
        closing_offset: 30
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <SettingsIcon className="text-slate-800 w-8 h-8" />
                        Gestión del Sistema
                    </h1>
                    <p className="text-muted-foreground font-medium">Parámetros operativos y reglas de negocio.</p>
                </div>
            </div>

            <Tabs defaultValue="reservas" className="space-y-6">
                <TabsList className="bg-white/50 backdrop-blur-md p-1.5 rounded-[2rem] border-2 border-slate-100 shadow-xl w-fit mb-12">
                    <TabsTrigger value="reservas" className="rounded-full px-8 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest transition-all duration-300 flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4" /> Reservas
                    </TabsTrigger>
                    <TabsTrigger value="pedidos" className="rounded-full px-8 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest transition-all duration-300 flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4" /> Pedidos
                    </TabsTrigger>
                    <TabsTrigger value="restaurante" className="rounded-full px-8 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest transition-all duration-300 flex items-center gap-2">
                        <Store className="w-4 h-4" /> Datos del Local
                    </TabsTrigger>
                    <TabsTrigger value="horarios" className="rounded-full px-8 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest transition-all duration-300 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Horarios y Bloqueos
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="reservas" className="animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="rounded-[2.5rem] p-8 shadow-xl border-none bg-white">
                            <CardHeader className="px-0 pt-0">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-xl font-black uppercase text-slate-800 tracking-tight">Gestión de Reservas</CardTitle>
                                        <CardDescription className="text-[10px] font-bold uppercase text-slate-400 italic mt-1 leading-relaxed">
                                            Activa o desactiva la visibilidad de tu restaurante para recibir reservas de mesas en la aplicación de los clientes.
                                        </CardDescription>
                                    </div>
                                    <Switch
                                        checked={settings.has_reservations}
                                        onCheckedChange={(v) => handleSave({ has_reservations: v })}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="px-0 space-y-8 pt-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Duración Turno</Label>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-100 p-3 rounded-2xl"><Clock className="w-5 h-5 text-slate-600" /></div>
                                        <Input
                                            type="number"
                                            defaultValue={settings.slot_duration}
                                            onBlur={(e) => handleSave({ slot_duration: parseInt(e.target.value) })}
                                            className="h-14 rounded-2xl font-black text-lg bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 w-32"
                                        />
                                        <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">minutos</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase italic mt-1 leading-tight">
                                        Se refiere a la duración de tiempo de cada una de las reservas (el tiempo que el cliente está en el local).
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2.5rem] p-8 shadow-xl border-none bg-slate-50 relative overflow-hidden">
                            <CardHeader className="px-0 pt-0 relative z-10">
                                <CardTitle className="text-lg font-black uppercase text-slate-800 tracking-tight leading-tight">
                                    Criterios de Aprobación Automática de Reservas
                                </CardTitle>
                                <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Reglas de validación operativa</CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 space-y-8 pt-6 relative z-10">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cantidad máxima de personas por reserva</Label>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase italic leading-tight">
                                                Sobre dicho número las reservas no se aprobarán automáticamente.
                                            </p>
                                        </div>
                                        <div className="text-3xl font-black text-primary">{resSettings.max_party_size}</div>
                                    </div>
                                    <Slider
                                        defaultValue={[resSettings.max_party_size]}
                                        max={50}
                                        min={2}
                                        step={1}
                                        onValueCommit={(v) => handleSave({ reservation_settings: { ...resSettings, max_party_size: v[0] } })}
                                        className="py-4"
                                    />
                                </div>

                                <Separator className="bg-slate-200" />

                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reputación mínima del cliente</Label>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase italic leading-tight max-w-[280px]">
                                                Reputación mínima que tiene que tener el cliente para que la reserva se acepte automáticamente. Este porcentaje representa el total de reservas que efectivamente el cliente ha cumplido a cabalidad.
                                            </p>
                                        </div>
                                        <div className="text-3xl font-black text-orange-500">{resSettings.min_reputation}%</div>
                                    </div>
                                    <Slider
                                        defaultValue={[resSettings.min_reputation]}
                                        max={100}
                                        min={0}
                                        step={5}
                                        onValueCommit={(v) => handleSave({ reservation_settings: { ...resSettings, min_reputation: v[0] } })}
                                        className="py-4"
                                    />
                                    <div className="pt-2">
                                        <Button
                                            className="w-full rounded-2xl font-black uppercase tracking-widest py-6 bg-slate-900 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                                            onClick={() => handleSave({ reservation_settings: resSettings })}
                                            disabled={saving}
                                        >
                                            {saving ? "Actualizando..." : "ACTUALIZAR"}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="pedidos" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="rounded-[2.5rem] p-8 shadow-xl border-none bg-white">
                            <CardHeader className="px-0 pt-0">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-xl font-black uppercase text-slate-800 tracking-tight leading-tight">Disponible para recibir pedidos para llevar</CardTitle>
                                        <CardDescription className="text-[10px] font-bold uppercase text-slate-400 italic mt-1 leading-tight">
                                            Activa o desactiva la visibilidad de tu restaurante que recibe pedidos para llevar en la aplicación de los clientes. Si lo desactivas, no podrás recibir pedidos.
                                        </CardDescription>
                                    </div>
                                    <Switch
                                        checked={settings.has_takeaway}
                                        onCheckedChange={(v) => handleSave({ has_takeaway: v })}
                                        className="data-[state=checked]:bg-emerald-600"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="px-0 space-y-8 pt-6">
                                <div className="grid grid-cols-2 gap-8 pt-2">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                            <Timer className="w-3 h-3 text-slate-400" /> Desfase Apertura
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                defaultValue={takeSettings.opening_offset}
                                                onBlur={(e) => handleSave({ takeaway_settings: { ...takeSettings, opening_offset: parseInt(e.target.value) } })}
                                                className="h-14 rounded-2xl font-black text-lg bg-slate-50 border-none px-4"
                                            />
                                            <span className="text-xs font-bold text-slate-400">min</span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase italic leading-tight">
                                            tiempo en minutos después de la apertura del restaurante en que está disponible para recibir pedidos
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                            <Timer className="w-3 h-3 text-slate-400" /> Desfase Cierre
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                defaultValue={takeSettings.closing_offset}
                                                onBlur={(e) => handleSave({ takeaway_settings: { ...takeSettings, closing_offset: parseInt(e.target.value) } })}
                                                className="h-14 rounded-2xl font-black text-lg bg-slate-50 border-none px-4"
                                            />
                                            <span className="text-xs font-bold text-slate-400">min</span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase italic leading-tight">
                                            tiempo en minutos antes del cierre del restaurante en que él se está disponible para recibir pedidos
                                        </p>
                                    </div>
                                </div>

                                <Separator className="bg-slate-100 my-6" />

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tiempo de Preparación</Label>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase italic leading-tight">
                                                Estimación promedio en minutos para que el pedido esté listo.
                                            </p>
                                        </div>
                                        <div className="text-3xl font-black text-slate-900">{settings.avg_prep_time || 20} min</div>
                                    </div>
                                    <Slider
                                        defaultValue={[settings.avg_prep_time || 20]}
                                        max={90}
                                        min={5}
                                        step={5}
                                        onValueCommit={(v) => handleSave({ avg_prep_time: v[0] })}
                                        className="py-4"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2.5rem] p-8 shadow-xl border-none bg-slate-50 relative overflow-hidden">
                            <CardHeader className="px-0 pt-0 relative z-10">
                                <CardTitle className="text-lg font-black uppercase text-slate-800 tracking-tight leading-tight">
                                    Criterios de Aprobación Automática de Pedidos Para Llevar
                                </CardTitle>
                                <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Parámetros de seguridad financiera</CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 space-y-8 pt-6 relative z-10">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Valor máximo del pedido</Label>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase italic leading-tight max-w-[280px]">
                                                Si el pedido es superior a este valor no se aceptará automáticamente, sino que deberás gestionarlo manualmente.
                                            </p>
                                        </div>
                                        <div className="text-2xl font-black text-primary">${takeSettings.max_order_amount.toLocaleString()}</div>
                                    </div>
                                    <Slider
                                        defaultValue={[takeSettings.max_order_amount]}
                                        max={300000}
                                        min={10000}
                                        step={5000}
                                        onValueCommit={(v) => handleSave({ takeaway_settings: { ...takeSettings, max_order_amount: v[0] } })}
                                        className="py-4"
                                    />
                                </div>

                                <Separator className="bg-slate-200" />

                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reputación mínima del cliente</Label>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase italic leading-tight max-w-[280px]">
                                                Reputación mínima que tiene que tener el cliente para que su pedido se acepte automáticamente. Este porcentaje representa el total de pedidos que efectivamente el cliente ha cumplido en toda la aplicación.
                                            </p>
                                        </div>
                                        <div className="text-3xl font-black text-emerald-600">{takeSettings.min_reputation}%</div>
                                    </div>
                                    <Slider
                                        defaultValue={[takeSettings.min_reputation]}
                                        max={100}
                                        min={0}
                                        step={5}
                                        onValueCommit={(v) => handleSave({ takeaway_settings: { ...takeSettings, min_reputation: v[0] } })}
                                        className="py-4"
                                    />

                                    <div className="pt-2">
                                        <Button
                                            className="w-full rounded-2xl font-black uppercase tracking-widest py-6 bg-slate-900 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                                            onClick={() => handleSave({ takeaway_settings: takeSettings })}
                                            disabled={saving}
                                        >
                                            {saving ? "Actualizando..." : "ACTUALIZAR"}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="restaurante" className="space-y-12 pb-20 outline-none">
                    <Card className="rounded-[3rem] p-12 shadow-2xl border-none bg-white">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identidad Visual</Label>
                                    <div 
                                        onClick={() => logoInputRef.current?.click()}
                                        className="h-48 w-48 bg-slate-50 rounded-[3rem] flex items-center justify-center border-2 border-slate-100 shadow-inner overflow-hidden relative group cursor-pointer mx-auto lg:mx-0"
                                    >
                                        {settings.logo_url ? <img src={settings.logo_url} className="w-full h-full object-cover" /> : <Store className="w-12 h-12 text-slate-200" />}
                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center text-white gap-2">
                                            <Camera className="w-6 h-6" />
                                            <span className="font-black text-[10px] uppercase tracking-widest">{saving ? "Subiendo..." : "Logo"}</span>
                                        </div>
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={logoInputRef} 
                                        onChange={(e) => handleImageUpload(e, 'logo_url')}
                                        className="hidden" 
                                        accept="image/*"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cubierta del Local</Label>
                                    <div 
                                        onClick={() => coverInputRef.current?.click()}
                                        className="h-40 w-full bg-slate-50 rounded-[2rem] overflow-hidden border-2 border-slate-100 relative group cursor-pointer shadow-inner"
                                    >
                                        {settings.cover_image_url ? <img src={settings.cover_image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-slate-50"><Camera className="w-8 h-8 text-slate-100" /></div>}
                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center text-white gap-2">
                                            <FileText className="w-6 h-6" />
                                            <span className="font-black text-[10px] uppercase tracking-widest">{saving ? "Subiendo..." : "Editar Portada"}</span>
                                        </div>
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={coverInputRef} 
                                        onChange={(e) => handleImageUpload(e, 'cover_image_url')}
                                        className="hidden" 
                                        accept="image/*"
                                    />
                                </div>
                            </div>

                            <div className="lg:col-span-2 space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nombre del Restaurante</Label>
                                        <Input
                                            defaultValue={settings.name}
                                            onBlur={(e) => handleSave({ name: e.target.value })}
                                            className="h-14 rounded-2xl border-none bg-slate-50 font-black text-lg focus:ring-2 focus:ring-primary/20 px-6"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Especialidad / Tipo de Cocina</Label>
                                        <Input
                                            defaultValue={settings.cuisine_type || "Chilena"}
                                            onBlur={(e) => handleSave({ cuisine_type: e.target.value })}
                                            className="h-14 rounded-2xl border-none bg-slate-50 font-black text-lg focus:ring-2 focus:ring-primary/20 px-6"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descripción</Label>
                                    <Input
                                        defaultValue={settings.description}
                                        onBlur={(e) => handleSave({ description: e.target.value })}
                                        className="h-14 rounded-2xl border-none bg-slate-50 font-black text-lg focus:ring-2 focus:ring-primary/20 px-6"
                                        placeholder="Una breve descripción para tus clientes..."
                                    />
                                </div>

                                <Separator className="bg-slate-100" />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Teléfono</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                defaultValue={settings.phone}
                                                onBlur={(e) => handleSave({ phone: e.target.value })}
                                                className="h-14 rounded-2xl border-none bg-slate-50 font-black text-lg focus:ring-2 focus:ring-primary/20 pl-14 pr-6"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Estado de Operación</Label>
                                        <div className="h-14 bg-slate-50 rounded-2xl flex items-center justify-between px-6 border-none">
                                            <span className="font-black text-xs uppercase tracking-widest text-slate-600">Restaurante Activo</span>
                                            <Switch
                                                checked={settings.is_active}
                                                onCheckedChange={(v) => handleSave({ is_active: v })}
                                                className="data-[state=checked]:bg-emerald-600"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator className="bg-slate-100" />

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Capacidad Máxima por Espacios</Label>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase italic leading-tight">Define los ambientes y la cantidad de sillas disponibles en cada uno.</p>
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="rounded-xl border-dashed border-slate-300 font-black uppercase text-[9px] h-9"
                                            onClick={() => {
                                                const currentSpaces = Array.isArray(settings.seating_spaces) && settings.seating_spaces.length > 0
                                                    ? settings.seating_spaces
                                                    : [{ id: '1', name: 'Salón Principal', capacity: settings.capacity || 20 }];
                                                const newSpace = { id: Math.random().toString(36).substring(7), name: `Espacio ${currentSpaces.length + 1}`, capacity: 10 };
                                                const updatedSpaces = [...currentSpaces, newSpace];
                                                const totalCapacity = updatedSpaces.reduce((acc: number, s: any) => acc + (parseInt(s.capacity?.toString()) || 0), 0);
                                                handleSave({ seating_spaces: updatedSpaces, capacity: totalCapacity });
                                            }}
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> Agregar Espacio
                                        </Button>
                                    </div>

                                    <div className="space-y-4">
                                        {(settings.seating_spaces || [{ id: '1', name: 'Salón Principal', capacity: settings.capacity || 20 }]).map((space: any, idx: number) => (
                                            <div key={space.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                <div className="flex-1">
                                                    <Input
                                                        placeholder="Nombre del Espacio (Ej: Terraza)"
                                                        defaultValue={space.name}
                                                        onBlur={(e) => {
                                                            const newSpaces = [...(settings.seating_spaces || [])];
                                                            newSpaces[idx] = { ...space, name: e.target.value };
                                                            const totalCapacity = newSpaces.reduce((acc: number, s: any) => acc + (parseInt(s.capacity.toString()) || 0), 0);
                                                            handleSave({ seating_spaces: newSpaces, capacity: totalCapacity });
                                                        }}
                                                        className="h-12 border-none bg-white font-bold text-sm rounded-xl px-4"
                                                    />
                                                </div>
                                                <div className="w-32 relative">
                                                    <Input
                                                        type="number"
                                                        defaultValue={space.capacity}
                                                        onBlur={(e) => {
                                                            const newSpaces = [...(settings.seating_spaces || [])];
                                                            newSpaces[idx] = { ...space, capacity: parseInt(e.target.value) || 0 };
                                                            const totalCapacity = newSpaces.reduce((acc: number, s: any) => acc + (parseInt(s.capacity.toString()) || 0), 0);
                                                            handleSave({ seating_spaces: newSpaces, capacity: totalCapacity });
                                                        }}
                                                        className="h-12 border-none bg-white font-black text-sm rounded-xl pl-4 pr-12 text-center"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 uppercase">Sillas</span>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-slate-300 hover:text-rose-500 rounded-xl"
                                                    onClick={() => {
                                                        const newSpaces = (settings.seating_spaces || []).filter((_: any, i: number) => i !== idx);
                                                        const totalCapacity = newSpaces.reduce((acc: number, s: any) => acc + (parseInt(s.capacity.toString()) || 0), 0);
                                                        handleSave({ seating_spaces: newSpaces, capacity: totalCapacity });
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="bg-slate-900 rounded-[1.5rem] p-6 flex justify-between items-center text-white">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/10 rounded-lg">
                                                <Users className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Capacidad Total Consolidada</p>
                                                <p className="text-xl font-black">{(settings.seating_spaces || []).reduce((acc: number, s: any) => acc + (parseInt(s.capacity.toString()) || 0), 0) || settings.capacity || 0} Sillas</p>
                                            </div>
                                        </div>
                                        <Badge className="bg-white/10 text-white border-none font-black text-[10px] uppercase px-3 py-1">V5 Engine</Badge>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Calle y Número</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                defaultValue={settings.address?.street}
                                                onBlur={(e) => handleSave({ address: { ...settings.address, street: e.target.value } })}
                                                className="h-14 rounded-2xl border-none bg-slate-50 font-black text-lg focus:ring-2 focus:ring-primary/20 pl-14 pr-6"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Comuna</Label>
                                        <Input
                                            defaultValue={settings.comuna || settings.address?.commune || "Santiago"}
                                            onBlur={(e) => handleSave({ comuna: e.target.value, address: { ...settings.address, commune: e.target.value } })}
                                            className="h-14 rounded-2xl border-none bg-slate-50 font-black text-lg focus:ring-2 focus:ring-primary/20 px-6"
                                        />
                                    </div>
                                </div>

                                <div className="pt-8">
                                    <Button
                                        className="w-full h-16 rounded-[2rem] font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-800 transition-all shadow-2xl shadow-slate-300 gap-4 group"
                                        onClick={() => handleSave(settings)}
                                        disabled={saving}
                                    >
                                        {saving ? "Guardando..." : "GUARDAR INFORMACIÓN DEL LOCAL"}
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </TabsContent>
                <TabsContent value="horarios" className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-12 pb-20">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Horarios de Atención */}
                        <Card className="rounded-[3rem] p-8 shadow-xl border-none bg-white">
                            <CardHeader className="px-0 pt-0 pb-8">
                                <CardTitle className="text-xl font-black uppercase text-slate-800 tracking-tight flex items-center gap-3">
                                    <Clock className="w-6 h-6 text-primary" /> Horarios de Atención
                                </CardTitle>
                                <CardDescription className="text-[10px] font-bold uppercase text-slate-400 italic mt-1 leading-relaxed">
                                    Configura los días y horas en que tu restaurante está abierto al público.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 space-y-6">
                                {Object.entries({
                                    mon: "Lunes", tue: "Martes", wed: "Miércoles", thu: "Jueves",
                                    fri: "Viernes", sat: "Sábado", sun: "Domingo"
                                }).map(([key, label]) => {
                                    const daySettings = settings.operating_hours?.[key] || { open: "09:00", close: "22:00", is_closed: true };
                                    return (
                                        <div key={key} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100/50 hover:bg-white transition-all group shadow-sm hover:shadow-md">
                                            <div className="flex items-center gap-4">
                                                <Switch
                                                    checked={!daySettings.is_closed}
                                                    onCheckedChange={(v) => {
                                                        const newHours = { ...settings.operating_hours, [key]: { ...daySettings, is_closed: !v } };
                                                        handleSave({ operating_hours: newHours });
                                                    }}
                                                    className="data-[state=checked]:bg-emerald-500"
                                                />
                                                <span className="font-black text-sm uppercase tracking-tight text-slate-700 w-24">{label}</span>
                                            </div>

                                            <div className={cn("flex items-center gap-2 transition-all duration-300", daySettings.is_closed ? "opacity-30 grayscale pointer-events-none" : "opacity-100")}>
                                                <Input
                                                    type="time"
                                                    value={daySettings.open}
                                                    onChange={(e) => {
                                                        const newHours = { ...settings.operating_hours, [key]: { ...daySettings, open: e.target.value } };
                                                        handleSave({ operating_hours: newHours });
                                                    }}
                                                    className="h-10 w-28 rounded-xl bg-white border-slate-200 font-bold text-center"
                                                />
                                                <span className="text-xs font-black text-slate-300">A</span>
                                                <Input
                                                    type="time"
                                                    value={daySettings.close}
                                                    onChange={(e) => {
                                                        const newHours = { ...settings.operating_hours, [key]: { ...daySettings, close: e.target.value } };
                                                        handleSave({ operating_hours: newHours });
                                                    }}
                                                    className="h-10 w-28 rounded-xl bg-white border-slate-200 font-bold text-center"
                                                />
                                            </div>

                                            {daySettings.is_closed && (
                                                <Badge variant="outline" className="text-[8px] font-black uppercase bg-slate-100 text-slate-400 border-none px-3 py-1">Cerrado</Badge>
                                            )}
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {/* Bloqueos y Vacaciones */}
                        <div className="space-y-8">
                            <Card className="rounded-[3rem] p-8 shadow-xl border-2 border-slate-900 bg-slate-900 text-white overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-8 opacity-10"><Calendar className="w-32 h-32" /></div>
                                <CardHeader className="px-0 pt-0 relative z-10">
                                    <CardTitle className="text-xl font-black uppercase tracking-tight">Nueva Excepción de Servicio</CardTitle>
                                    <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Bloquea fechas por vacaciones o eventos privados</CardDescription>
                                </CardHeader>
                                <CardContent className="px-0 space-y-6 pt-4 relative z-10">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Desde</Label>
                                            <Input
                                                type="datetime-local"
                                                value={newBlock.start}
                                                onChange={(e) => setNewBlock(prev => ({ ...prev, start: e.target.value }))}
                                                className="bg-slate-800 border-none rounded-xl text-white h-12"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Hasta</Label>
                                            <Input
                                                type="datetime-local"
                                                value={newBlock.end}
                                                onChange={(e) => setNewBlock(prev => ({ ...prev, end: e.target.value }))}
                                                className="bg-slate-800 border-none rounded-xl text-white h-12"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Motivo (Interno)</Label>
                                        <Input
                                            placeholder="Ej: Vacaciones de Invierno"
                                            value={newBlock.reason}
                                            onChange={(e) => setNewBlock(prev => ({ ...prev, reason: e.target.value }))}
                                            className="bg-slate-800 border-none rounded-xl text-white h-12"
                                        />
                                    </div>
                                    <Button
                                        className="w-full bg-primary hover:bg-primary/90 text-white font-black h-14 rounded-2xl tracking-widest uppercase text-xs"
                                        onClick={async () => {
                                            if (!newBlock.start || !newBlock.end || !newBlock.reason) {
                                                toast.error("Datos incompletos");
                                                return;
                                            }
                                            const res = await blockSeatsAction(restaurantId, newBlock.start, newBlock.end, settings.capacity, newBlock.reason);
                                            if (res.success) {
                                                toast.success("Periodo bloqueado");
                                                setNewBlock({ start: "", end: "", reason: "", seats: 0 });
                                                fetchData();
                                            }
                                        }}
                                    >
                                        <Plus className="w-4 h-4 mr-2" /> Agregar Bloqueo de Servicio
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="rounded-[3rem] p-8 shadow-xl border-none bg-white">
                                <CardHeader className="px-0 pt-0">
                                    <CardTitle className="text-lg font-black uppercase text-slate-800 tracking-tight">Periodos Bloqueados</CardTitle>
                                </CardHeader>
                                <CardContent className="px-0 max-h-[400px] overflow-y-auto space-y-4 pr-2">
                                    {blocks.length === 0 ? (
                                        <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
                                            <p className="text-xs font-bold text-slate-300 uppercase">Sin bloqueos programados</p>
                                        </div>
                                    ) : (
                                        blocks.map((block) => (
                                            <div key={block.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all group">
                                                <div className="space-y-1">
                                                    <div className="font-black text-xs uppercase tracking-tight text-slate-700">{block.reason}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-2">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(block.start_time).toLocaleDateString()} {new Date(block.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                                                        {" - "}
                                                        {new Date(block.end_time).toLocaleDateString()} {new Date(block.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="rounded-full hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                    onClick={async () => {
                                                        const res = await deleteReservationBlockAction(block.id);
                                                        if (res.success) {
                                                            toast.success("Bloqueo eliminado");
                                                            fetchData();
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
