"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
    getPromotionsAction, 
    createPromotionAction, 
    togglePromotionStatusAction, 
    toggleGlobalOptInAction,
    deletePromotionAction,
    Promotion 
} from "@/app/actions/promotion-actions";
import { 
    TicketPercent, 
    Plus, 
    Trash2, 
    CheckCircle2, 
    XCircle, 
    Info, 
    Calendar,
    Users,
    ChevronRight,
    Loader2,
    ShieldCheck,
    Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface GlobalPromotion extends Promotion {
    is_opted_in: boolean;
    is_active_for_restaurant: boolean;
}

export default function PromotionsPage() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [localPromotions, setLocalPromotions] = useState<Promotion[]>([]);
    const [globalPromotions, setGlobalPromotions] = useState<GlobalPromotion[]>([]);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newPromo, setNewPromo] = useState<Partial<Promotion>>({
        label: "",
        description: "",
        discount_percentage: 10,
        service_scope: ["takeaway", "reservation"],
        valid_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    });

    const restaurantId = profile?.restaurant_id;

    useEffect(() => {
        if (restaurantId) {
            fetchData();
        }
    }, [restaurantId]);

    const fetchData = async () => {
        if (!restaurantId) return;
        setLoading(true);
        const result = await getPromotionsAction(restaurantId);
        if (result.success && result.data) {
            setLocalPromotions(result.data.local);
            setGlobalPromotions(result.data.global);
        } else {
            toast.error("Error al cargar promociones: " + result.error);
        }
        setLoading(false);
    };

    const handleCreateLocal = async () => {
        if (!restaurantId) return;
        if (!newPromo.label || !newPromo.discount_percentage) {
            toast.error("Nombre y porcentaje son obligatorios");
            return;
        }

        const result = await createPromotionAction(restaurantId, newPromo);
        if (result.success) {
            toast.success("¡Promoción creada con éxito!");
            setIsCreateDialogOpen(false);
            setNewPromo({
                label: "",
                description: "",
                discount_percentage: 10,
                service_scope: ["takeaway", "reservation"],
                valid_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            });
            fetchData();
        } else {
            toast.error("Error al crear: " + result.error);
        }
    };

    const handleToggleLocal = async (id: string, current: boolean) => {
        const result = await togglePromotionStatusAction(id, !current);
        if (result.success) {
            toast.success(current ? "Promoción pausada" : "Promoción activada");
            fetchData();
        } else {
            toast.error("Error al actualizar");
        }
    };

    const handleToggleGlobal = async (discountId: string, currentStep: boolean) => {
        if (!restaurantId) return;
        const result = await toggleGlobalOptInAction(restaurantId, discountId, !currentStep);
        if (result.success) {
            toast.success(!currentStep ? "Adherido al catálogo global" : "Removido del catálogo");
            fetchData();
        } else {
            toast.error("Error al procesar inscripción");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar esta promoción?")) return;
        const result = await deletePromotionAction(id);
        if (result.success) {
            toast.success("Promoción eliminada");
            fetchData();
        } else {
            toast.error("Error al eliminar");
        }
    };

    const toggleDay = (day: string) => {
        const current = newPromo.valid_days || [];
        if (current.includes(day)) {
            setNewPromo({ ...newPromo, valid_days: current.filter(d => d !== day) });
        } else {
            setNewPromo({ ...newPromo, valid_days: [...current, day] });
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">
                        Marketing <span className="text-rose-500">y Descuentos</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">
                        Gestiona tus propios beneficios o únete a campañas globales de Almuerzo.cl
                    </p>
                </div>

                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-rose-500 hover:bg-rose-600 text-white font-bold h-12 rounded-2xl shadow-lg shadow-rose-200">
                            <Plus className="w-5 h-5 mr-2" />
                            Crear Descuento Local
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] rounded-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black uppercase">Nueva Promoción</DialogTitle>
                            <DialogDescription>
                                Los descuentos locales solo se aplican a tu restaurante.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs font-bold uppercase text-slate-400">Nombre de la Promoción</Label>
                                <Input 
                                    id="name" 
                                    placeholder="Ej: 10% Off Lunes de Amigos" 
                                    className="rounded-xl"
                                    value={newPromo.label}
                                    onChange={e => setNewPromo({...newPromo, label: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-slate-400">Porcentaje (%)</Label>
                                    <Input 
                                        type="number" 
                                        min="1" 
                                        max="100" 
                                        className="rounded-xl"
                                        value={newPromo.discount_percentage}
                                        onChange={e => setNewPromo({...newPromo, discount_percentage: parseInt(e.target.value)})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-slate-400">Servicio</Label>
                                    <div className="flex gap-2">
                                        <Badge 
                                            variant={newPromo.service_scope?.includes('reservation') ? 'default' : 'outline'}
                                            className="cursor-pointer"
                                            onClick={() => {
                                                const current = newPromo.service_scope || [];
                                                setNewPromo({...newPromo, service_scope: current.includes('reservation') ? current.filter(s => s !== 'reservation') : [...current, 'reservation']})
                                            }}
                                        >Reserva</Badge>
                                        <Badge 
                                            variant={newPromo.service_scope?.includes('takeaway') ? 'default' : 'outline'}
                                            className="cursor-pointer"
                                            onClick={() => {
                                                const current = newPromo.service_scope || [];
                                                setNewPromo({...newPromo, service_scope: current.includes('takeaway') ? current.filter(s => s !== 'takeaway') : [...current, 'takeaway']})
                                            }}
                                        >Takeaway</Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-slate-400">Días Disponibles</Label>
                                <div className="flex flex-wrap gap-1">
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                        <Button
                                            key={day}
                                            variant={newPromo.valid_days?.includes(day) ? "default" : "outline"}
                                            size="sm"
                                            className="text-[10px] h-7 px-2"
                                            onClick={() => toggleDay(day)}
                                        >
                                            {day.substring(0, 2)}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-slate-400">Descripción Requerida (Condiciones)</Label>
                                <Textarea 
                                    placeholder="Detalla las restricciones aquí..." 
                                    className="rounded-xl resize-none"
                                    value={newPromo.description}
                                    onChange={e => setNewPromo({...newPromo, description: e.target.value})}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                            <Button className="bg-rose-500 hover:bg-rose-600 rounded-xl" onClick={handleCreateLocal}>
                                Guardar Promoción
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="local" className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-2xl h-14 mb-8">
                    <TabsTrigger value="local" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Mis Campañas
                    </TabsTrigger>
                    <TabsTrigger value="global" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Globe className="w-4 h-4 mr-2" />
                        Catálogo Invitado
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="local" className="space-y-6">
                    {localPromotions.length === 0 ? (
                        <Card className="border-dashed border-2 bg-slate-50/50 py-12 rounded-3xl">
                            <CardContent className="flex flex-col items-center justify-center text-center">
                                <div className="h-20 w-20 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                                    <TicketPercent className="w-10 h-10 text-slate-400" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 uppercase">Sin campañas activas</h3>
                                <p className="text-slate-500 max-w-xs mt-2">
                                    Crea tu primer descuento para atraer más clientes hoy.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {localPromotions.map((promo) => (
                                <Card key={promo.id} className="rounded-3xl border-none shadow-xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                                    <div className={`h-28 flex items-center justify-center ${promo.is_active ? 'bg-rose-500' : 'bg-slate-400'}`}>
                                        <div className="text-white text-center">
                                            <span className="text-5xl font-black tracking-tighter">{promo.discount_percentage}%</span>
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">DESCUENTO DIRECTO</p>
                                        </div>
                                    </div>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-xl font-black uppercase line-clamp-1">{promo.label}</CardTitle>
                                            <Switch 
                                                checked={promo.is_active}
                                                onCheckedChange={() => handleToggleLocal(promo.id, promo.is_active)}
                                            />
                                        </div>
                                        <CardDescription className="line-clamp-2 min-h-[40px]">{promo.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                <Calendar className="w-4 h-4 text-rose-500" />
                                                {promo.valid_days.length === 7 ? 'Diario' : `${promo.valid_days.length} días`}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                <Users className="w-4 h-4 text-rose-500" />
                                                {promo.service_scope.join(', ')}
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-0 border-t bg-slate-50/50 flex justify-between">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 font-bold uppercase text-[10px]"
                                            onClick={() => handleDelete(promo.id)}
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                                        </Button>
                                        <Badge variant={promo.is_active ? "default" : "secondary"} className="uppercase font-black text-[9px] tracking-tight">
                                            {promo.is_active ? "En Línea" : "Pausado"}
                                        </Badge>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="global" className="space-y-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
                        <Info className="w-6 h-6 text-amber-500 shrink-0" />
                        <div>
                            <h4 className="font-black uppercase text-amber-900 text-sm">Campañas de Partner</h4>
                            <p className="text-sm text-amber-800 font-medium">
                                Estas promociones son gestionadas por Almuerzo.cl con bancos y clubes (Ej: Banco Falabella). 
                                Tú eliges a cuáles adherirte para aparecer en sus secciones exclusivas de la PWA.
                            </p>
                        </div>
                    </div>

                    {globalPromotions.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-slate-400">
                            No hay campañas globales disponibles en este momento.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {globalPromotions.map((promo) => (
                                <Card key={promo.id} className="rounded-3xl border-none shadow-xl overflow-hidden border-2 border-transparent hover:border-blue-500/10 transition-all">
                                    <div className="h-32 bg-slate-900 relative">
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-white text-center">
                                                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">{promo.discount_percentage}% OFF</span>
                                            </div>
                                        </div>
                                        <div className="absolute bottom-4 left-4">
                                            <Badge className="bg-slate-800/80 backdrop-blur-md border-white/10 uppercase font-black text-[9px]">
                                                {promo.type === 'club' ? 'Club Partner' : 'Promo Almuerzo'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-lg font-black uppercase text-slate-900">{promo.label}</CardTitle>
                                        </div>
                                        <CardDescription>{promo.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                                            <div className="flex justify-between text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                                                <span>Aplica en</span>
                                                <span className="text-slate-900">{promo.service_scope.join(' + ')}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                                                <span>Válido</span>
                                                <span className="text-slate-900">Lun - Vie</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button 
                                            className={`w-full h-12 rounded-2xl font-black uppercase tracking-tight transition-all duration-300 ${
                                                promo.is_opted_in ? 'bg-slate-100 text-slate-900 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                                            }`}
                                            onClick={() => handleToggleGlobal(promo.id, promo.is_opted_in)}
                                        >
                                            {promo.is_opted_in ? (
                                                <><XCircle className="w-4 h-4 mr-2" /> Salir de Campaña</>
                                            ) : (
                                                <><Plus className="w-4 h-4 mr-2" /> Adherirse</>
                                            )}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
