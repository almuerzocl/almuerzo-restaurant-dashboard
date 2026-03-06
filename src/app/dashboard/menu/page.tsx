"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    UtensilsCrossed,
    Plus,
    Trash2,
    Check,
    X,
    Save,
    Store,
    ShoppingBag,
    Star,
    Send,
    Package,
    AlertCircle,
    Info,
    Search,
    ChevronRight,
    Loader2
} from "lucide-react";
import {
    getMenuItemsAction,
    updateMenuItemAction,
    addMenuItemAction,
    deleteMenuItemAction,
    sendDailyMenuAction
} from "@/app/actions/dashboard-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function MenuManagerPage() {
    const { profile } = useAuth();
    const role = profile?.role?.toUpperCase();
    const canViewMenu = role && ['ADMIN', 'OPERATIONS_MANAGER', 'MENU_MANAGER', 'OWNER'].includes(role);
    
    const restaurantId = profile?.restaurant_id;
    const [loading, setLoading] = useState(true);
    const [sendingMenu, setSendingMenu] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [newItem, setNewItem] = useState({ name: "", price: 0, takeaway_price: 0 });
    const [isAdding, setIsAdding] = useState(false);

    const fetchMenu = async () => {
        if (!restaurantId) return;
        setLoading(true);
        const result = await getMenuItemsAction(restaurantId, profile?.role || '');
        if (result.success) {
            setItems(result.data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMenu();
    }, [restaurantId]);

    const handleToggle = async (itemId: string, field: string, value: boolean) => {
        const result = await updateMenuItemAction(itemId, { [field]: value });
        if (result.success) {
            setItems(items.map(item => item.id === itemId ? { ...item, [field]: value } : item));
            toast.success("Estado actualizado");
        } else {
            toast.error("Error al actualizar");
        }
    };

    const handleUpdate = async (itemId: string, updates: any) => {
        const result = await updateMenuItemAction(itemId, updates);
        if (result.success) {
            setItems(items.map(item => item.id === itemId ? { ...item, ...updates } : item));
            toast.success("Plato actualizado");
        }
    };

    const handleAdd = async () => {
        if (!newItem.name || newItem.price <= 0) {
            toast.error("Nombre y precio requeridos");
            return;
        }
        const result = await addMenuItemAction(restaurantId, {
            ...newItem,
            category: "General",
            is_available: true,
            is_menu_del_dia: false,
            track_inventory: false,
            stock_quantity: 0
        });
        if (result.success) {
            toast.success("Plato añadido");
            setNewItem({ name: "", price: 0, takeaway_price: 0 });
            setIsAdding(false);
            fetchMenu();
        }
    };

    const handleDelete = async (itemId: string) => {
        if (!confirm("¿Eliminar este plato?")) return;
        const result = await deleteMenuItemAction(itemId);
        if (result.success) {
            setItems(items.filter(i => i.id !== itemId));
            toast.success("Plato eliminado");
        }
    };

    const handleSendDailyMenu = async () => {
        if (!restaurantId) return;
        const dailyItems = items.filter(i => i.is_menu_del_dia);
        if (dailyItems.length === 0) {
            toast.error("No hay platos marcados como 'Menú del Día'");
            return;
        }

        setSendingMenu(true);
        const result = await sendDailyMenuAction(restaurantId);
        setSendingMenu(false);

        if (result.success) {
            toast.success(`¡Menú enviado a ${result.count} clientes!`);
        } else {
            toast.error(result.error || "Error al enviar el menú");
        }
    };

    if (!canViewMenu) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="bg-slate-100 p-6 rounded-full text-slate-400">
                    <AlertCircle className="w-12 h-12" />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Acceso Restringido</h2>
                    <p className="text-slate-500 font-medium">No tienes permisos para gestionar el menú operativo.</p>
                </div>
            </div>
        );
    }

    const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const dailyMenuItems = items.filter(i => i.is_menu_del_dia);

    if (loading && items.length === 0) {
        return (
            <div className="space-y-8 max-w-7xl mx-auto">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-64 rounded-xl" />
                        <Skeleton className="h-4 w-48 rounded-lg" />
                    </div>
                </div>
                <Skeleton className="h-[400px] w-full rounded-[3rem]" />
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20 max-w-7xl mx-auto">
            {/* Header Performance Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4 text-slate-900">
                        <div className="bg-orange-500 p-3 rounded-[1.2rem] text-white shadow-lg shadow-orange-200">
                            <UtensilsCrossed className="w-8 h-8" />
                        </div>
                        Gestor de Menú
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest ml-1">Ingeniería de Menú y Control de Inventarios v6</p>
                </div>

                <div className="flex flex-wrap gap-4">
                    <Card className="bg-slate-50 border-none px-6 py-3 rounded-2xl flex items-center gap-4">
                        <div className="bg-white p-2 rounded-xl shadow-sm text-orange-600">
                            <Star className="w-4 h-4 fill-current" />
                        </div>
                        <div>
                            <div className="text-[9px] font-black uppercase text-slate-400">Menú del Día</div>
                            <div className="text-lg font-black text-slate-800">{dailyMenuItems.length} Platos</div>
                        </div>
                    </Card>

                    <Button
                        onClick={() => setIsAdding(!isAdding)}
                        variant={isAdding ? "outline" : "default"}
                        className="rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest px-8 h-14 shadow-xl hover:scale-105 transition-transform duration-300"
                    >
                        {isAdding ? "Cancelar" : <><Plus className="w-5 h-5 mr-1 stroke-[3px]" /> Nuevo Item</>}
                    </Button>
                </div>
            </div>

            {/* Daily Menu Action Card */}
            {dailyMenuItems.length > 0 && (
                <Card className="rounded-[2.5rem] bg-slate-900 text-white overflow-hidden relative border-none shadow-2xl shadow-blue-900/20">
                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                        <Send className="w-40 h-40" />
                    </div>
                    <CardContent className="p-10 flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                        <div className="space-y-2">
                            <Badge className="bg-orange-500 text-white border-none font-black text-[9px] px-3 py-1 mb-2">BROADCAST ACTIVO</Badge>
                            <h2 className="text-2xl font-black tracking-tight">Tu Menú del Día está listo</h2>
                            <p className="text-slate-400 text-sm font-medium max-w-md">
                                Envía instantáneamente el menú seleccionado a todos tus clientes suscritos vía Email y PWA. 
                                <span className="text-orange-400"> {dailyMenuItems.length} platos serán anunciados.</span>
                            </p>
                        </div>
                        <Button 
                            disabled={sendingMenu}
                            onClick={handleSendDailyMenu}
                            className="bg-white text-slate-900 hover:bg-slate-100 rounded-[1.5rem] font-black uppercase text-xs tracking-widest px-10 py-7 shadow-2xl min-w-[220px]"
                        >
                            {sendingMenu ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Enviar a Clientes</>}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {isAdding && (
                <Card className="rounded-[2.5rem] border-4 border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-300">
                    <CardHeader className="p-10 pb-0">
                        <CardTitle className="text-xl font-black uppercase text-slate-800 tracking-tight">Añadir a la Carta</CardTitle>
                    </CardHeader>
                    <CardContent className="p-10 pt-8">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nombre Comercial</label>
                                <Input
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                    placeholder="Ej: Pastel de Choclo Premium"
                                    className="rounded-2xl h-14 bg-slate-50 border-none font-bold text-slate-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Precio Local ($)</label>
                                <Input
                                    type="number"
                                    value={newItem.price}
                                    onChange={e => setNewItem({ ...newItem, price: parseInt(e.target.value) })}
                                    className="rounded-2xl h-14 bg-slate-50 border-none font-bold text-slate-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Precio Takeaway ($)</label>
                                <Input
                                    type="number"
                                    value={newItem.takeaway_price}
                                    onChange={e => setNewItem({ ...newItem, takeaway_price: parseInt(e.target.value) })}
                                    className="rounded-2xl h-14 bg-blue-50/50 border-none font-bold text-blue-700"
                                />
                            </div>
                            <Button onClick={handleAdd} className="rounded-2xl h-14 font-black uppercase tracking-widest bg-slate-900 hover:bg-black">Añadir Ahora</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="rounded-[3rem] overflow-hidden border-none shadow-2xl bg-white">
                <div className="p-10 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-50">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar platos o categorías..." 
                            className="pl-12 h-12 bg-slate-50/50 border-none rounded-2xl font-bold text-sm focus-visible:ring-slate-200"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/30">
                                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Identificación del Plato</th>
                                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Menú Día</th>
                                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Takeaway</th>
                                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Inventario (Stock)</th>
                                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Precios & Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center text-slate-300 font-bold italic">
                                        No se encontraron platos que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/40 transition-all group duration-300">
                                        <td className="p-8">
                                            <div className="flex items-center gap-5">
                                                <div className="relative">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold ${item.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                                        {item.name[0]}
                                                    </div>
                                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${item.is_available ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="font-black text-slate-800 text-lg uppercase tracking-tight leading-none">{item.name}</div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-200 text-slate-400 px-1.5 py-0">#{item.id.substring(0, 5)}</Badge>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Categoría: {item.category || 'General'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-8 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Switch
                                                    checked={item.is_menu_del_dia}
                                                    onCheckedChange={(v) => handleToggle(item.id, 'is_menu_del_dia', v)}
                                                    className="data-[state=checked]:bg-orange-500 scale-110 shadow-sm"
                                                />
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Activo</span>
                                            </div>
                                        </td>
                                        <td className="p-8 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Switch
                                                    checked={item.is_available_for_takeaway}
                                                    onCheckedChange={(v) => handleToggle(item.id, 'is_available_for_takeaway', v)}
                                                    className="data-[state=checked]:bg-blue-600 scale-110 shadow-sm"
                                                />
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Habilitado</span>
                                            </div>
                                        </td>
                                        <td className="p-8">
                                            <div className="space-y-3 min-w-[140px]">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <Package className="w-3.5 h-3.5" />
                                                        <span className="text-[9px] font-black uppercase tracking-tighter">Control</span>
                                                    </div>
                                                    <Switch 
                                                        checked={item.track_inventory} 
                                                        onCheckedChange={(v) => handleToggle(item.id, 'track_inventory', v)}
                                                        className="scale-75"
                                                    />
                                                </div>
                                                
                                                <div className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${item.track_inventory ? 'bg-slate-50 border-slate-100' : 'bg-transparent border-transparent opacity-20 pointer-events-none'}`}>
                                                    <Input
                                                        type="number"
                                                        defaultValue={item.stock_quantity || 0}
                                                        onBlur={(e) => handleUpdate(item.id, { stock_quantity: parseInt(e.target.value) })}
                                                        className="h-8 w-16 p-1 text-center font-black bg-white rounded-lg border-none shadow-sm text-sm"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase text-xs">Unidades</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-8">
                                            <div className="flex flex-col items-end gap-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-right">
                                                        <div className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Precio Final</div>
                                                        <div className="font-black text-xl text-slate-900 tracking-tighter">${item.price.toLocaleString('es-CL')}</div>
                                                    </div>
                                                    <div className="w-px h-8 bg-slate-100 mx-2" />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(item.id)}
                                                        className="h-10 w-10 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-10 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-100 rounded-lg">
                            <Info className="w-4 h-4 text-slate-400" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                            Los cambios de disponibilidad y menú del día se reflejan en tiempo real para los comensales.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
