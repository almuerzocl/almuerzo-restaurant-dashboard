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
    Star
} from "lucide-react";
import {
    getMenuItemsAction,
    updateMenuItemAction,
    addMenuItemAction,
    deleteMenuItemAction
} from "@/app/actions/dashboard-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function MenuManagerPage() {
    const { profile } = useAuth();
    const canViewMenu = profile?.role && (profile.role === 'ADMIN' || ['operations_manager', 'menu_manager'].includes(profile.role));
    if (!canViewMenu) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Acceso denegado: no tiene permisos para gestionar el menú.</p>
            </div>
        );
    }
    const restaurantId = profile?.restaurant_id;
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
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
            toast.success("Plato actualizado");
        } else {
            toast.error("Error al actualizar");
        }
    };

    const handlePriceChange = async (itemId: string, field: string, value: number) => {
        if (isNaN(value)) return;
        const result = await updateMenuItemAction(itemId, { [field]: value });
        if (result.success) {
            toast.success("Precio actualizado");
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
            is_available: true
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

    if (loading && items.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <Skeleton className="h-96 w-full rounded-3xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <UtensilsCrossed className="text-slate-800 w-8 h-8" />
                        Gestor de Menú
                    </h1>
                    <p className="text-muted-foreground font-medium">Control operativo de disponibilidad y precios.</p>
                </div>
                <Button
                    onClick={() => setIsAdding(!isAdding)}
                    variant={isAdding ? "outline" : "default"}
                    className="rounded-xl font-bold h-11 px-6 shadow-lg shadow-primary/10"
                >
                    {isAdding ? "Cancelar" : <><Plus className="w-5 h-5 mr-2" /> Nuevo Plato</>}
                </Button>
            </div>

            {isAdding && (
                <Card className="rounded-[2rem] border-2 border-primary/20 bg-primary/5 shadow-xl shadow-primary/5 animate-in fade-in slide-in-from-top-4 duration-300">
                    <CardContent className="pt-8">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nombre del Plato</label>
                                <Input
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                    placeholder="Ej: Pastel de Choclo"
                                    className="rounded-2xl h-12 bg-white border-2 border-slate-100 font-bold focus:border-primary transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Precio Local ($)</label>
                                <Input
                                    type="number"
                                    value={newItem.price}
                                    onChange={e => setNewItem({ ...newItem, price: parseInt(e.target.value) })}
                                    className="rounded-2xl h-12 bg-white border-2 border-slate-100 font-bold focus:border-primary transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Precio Takeaway ($)</label>
                                <Input
                                    type="number"
                                    value={newItem.takeaway_price}
                                    onChange={e => setNewItem({ ...newItem, takeaway_price: parseInt(e.target.value) })}
                                    className="rounded-2xl h-12 bg-white border-2 border-slate-100 font-bold text-blue-600 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <Button onClick={handleAdd} className="rounded-2xl h-12 font-black uppercase tracking-widest">Añadir al Menú</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-2xl shadow-slate-200/60 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Plato</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Menú del Día</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Disponible</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Takeaway</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Precio Local</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Precio Takeaway</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-20 text-center text-slate-400 font-bold italic">
                                        No hay platos registrados en el menú operativo.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-10 rounded-full ${item.is_available ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                                                <div>
                                                    <div className="font-black text-slate-800 text-lg uppercase tracking-tight">{item.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold tracking-widest">UID: {item.id.substring(0, 8)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <div className="flex justify-center">
                                                <Switch
                                                    checked={item.is_menu_del_dia}
                                                    onCheckedChange={(v) => handleToggle(item.id, 'is_menu_del_dia', v)}
                                                    className="data-[state=checked]:bg-orange-500"
                                                />
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <div className="flex justify-center">
                                                <Switch
                                                    checked={item.is_available}
                                                    onCheckedChange={(v) => handleToggle(item.id, 'is_available', v)}
                                                    className="data-[state=checked]:bg-emerald-500"
                                                />
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <div className="flex justify-center">
                                                <Switch
                                                    checked={item.is_available_for_takeaway}
                                                    onCheckedChange={(v) => handleToggle(item.id, 'is_available_for_takeaway', v)}
                                                    className="data-[state=checked]:bg-blue-600"
                                                />
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2 max-w-[140px] relative">
                                                <span className="text-slate-400 font-black absolute left-3">$</span>
                                                <Input
                                                    type="number"
                                                    defaultValue={item.price}
                                                    onBlur={(e) => handlePriceChange(item.id, 'price', parseInt(e.target.value))}
                                                    className="h-11 pl-7 rounded-xl font-black border-slate-100 bg-slate-50/50 focus:bg-white text-slate-800"
                                                />
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2 max-w-[140px] relative">
                                                <span className="text-blue-400 font-black absolute left-3">$</span>
                                                <Input
                                                    type="number"
                                                    defaultValue={item.takeaway_price || item.price}
                                                    onBlur={(e) => handlePriceChange(item.id, 'takeaway_price', parseInt(e.target.value))}
                                                    className="h-11 pl-7 rounded-xl font-black border-blue-100 bg-blue-50/30 focus:bg-white text-blue-700"
                                                />
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(item.id)}
                                                className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
