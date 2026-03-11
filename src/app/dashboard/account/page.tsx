"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    User, Shield, CreditCard, Users, Search, Plus,
    MoreVertical, CheckCircle2, XCircle, FileText,
    ExternalLink, Zap, Table, Filter, Pencil, X, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Table as UITable,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    getRestaurantUsersAction,
    getPaymentHistoryAction,
    createRestaurantUserAction,
    updateRestaurantUserAction
} from "@/app/actions/dashboard-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { isAdmin, canViewReservations, canViewTakeaway, canViewMenu } from "@/lib/permissions";

export default function AccountPage() {
    const { profile } = useAuth();
    const restaurantId = profile?.restaurant_id;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);

    // User Modal State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [userData, setUserData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'USER'
    });

    const fetchData = async () => {
        if (!restaurantId) return;
        setLoading(true);
        const [usersRes, paymentsRes] = await Promise.all([
            getRestaurantUsersAction(restaurantId),
            getPaymentHistoryAction(restaurantId)
        ]);

        if (usersRes.success) {
            const sortedUsers = (usersRes.data || []).sort((a: any, b: any) => {
                const aRole = (a.role || '').toUpperCase();
                const bRole = (b.role || '').toUpperCase();
                
                const aIsPriority = isAdmin(aRole);
                const bIsPriority = isAdmin(bRole);
                
                if (aIsPriority && !bIsPriority) return -1;
                if (!aIsPriority && bIsPriority) return 1;
                return 0;
            });
            setUsers(sortedUsers);
        }
        if (paymentsRes.success) setPayments(paymentsRes.data || []);
        setLoading(false);
    };

    const handleOpenCreateModal = () => {
        setEditingUser(null);
        setUserData({ first_name: '', last_name: '', email: '', password: '', role: 'USER' });
        setIsUserModalOpen(true);
    };

    const handleOpenEditModal = (user: any) => {
        setEditingUser(user);
        const lowerRole = (user.role || '').toLowerCase();
        setUserData({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            password: '', 
            role: isAdmin(user.role) ? 'RESTAURANT_ADMIN' : 'USER'
        });
        setIsUserModalOpen(true);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!restaurantId) return;
        setSubmitting(true);

        try {
            let res;
            if (editingUser) {
                res = await updateRestaurantUserAction(editingUser.id, userData);
            } else {
                res = await createRestaurantUserAction(restaurantId, userData);
            }

            if (res.success) {
                toast.success(editingUser ? "Usuario actualizado" : "Usuario creado y transferido al backend");
                setIsUserModalOpen(false);
                fetchData();
            } else {
                toast.error(res.error || "Error al procesar el usuario");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [restaurantId]);

    // Datos reales del plan según especificaciones del sistema
    const planInfo = {
        name: profile?.subscription_plan || "PLAN BÁSICO",
        operationsLimit: profile?.subscription_plan === 'ILIMITADO' ? "Ilimitado" : "Limitado",
        usersContracted: profile?.subscription_plan === 'ILIMITADO' ? 10 : 3,
        status: "ACTIVE"
    };

    return (
        <div className="space-y-12 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4 text-slate-900">
                        <div className="bg-slate-900 p-3 rounded-[1.2rem] text-white">
                            <User className="w-8 h-8" />
                        </div>
                        Tu cuenta Almuerzo.cl
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest ml-1">Configuración Administrativa de Elite SaaS</p>
                </div>

                <Card className="bg-blue-600 text-white border-none shadow-2xl shadow-blue-200 rounded-[1.8rem] px-8 py-4 flex items-center gap-6 group hover:scale-[1.02] transition-transform duration-500">
                    <div className="space-y-0.5">
                        <div className="text-[9px] font-black uppercase tracking-widest text-blue-100 flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-white" /> Plan Actual
                        </div>
                        <div className="text-xl font-black tracking-tight">{planInfo.name}</div>
                    </div>
                    <Separator orientation="vertical" className="h-10 bg-blue-400/30" />
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-blue-100">Carga Operativa</div>
                        <div className="text-xl font-black tracking-tight text-white uppercase">{planInfo.operationsLimit}</div>
                    </div>
                    <Separator orientation="vertical" className="h-10 bg-blue-400/30" />
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-blue-100">Usuarios</div>
                        <div className="text-xl font-black tracking-tight">
                            <span className="text-white">{users.filter(u => u.email).length}</span>
                            <span className="text-blue-300"> / {planInfo.usersContracted}</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Grid for users and general billing */}
            <div className="space-y-10">
                {/* User management card */}
                <Card className="rounded-[3rem] p-1 shadow-2xl border-none bg-white overflow-hidden">
                    <div className="p-10 pb-6 flex justify-between items-end">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                                <Users className="w-6 h-6 text-blue-600" />
                                Gestión de Usuarios
                            </h2>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest italic leading-relaxed">
                                Controla quién tiene acceso a la administración de tu local. En el plan {planInfo.name} tienes {planInfo.usersContracted} slots disponibles.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl flex items-center px-4 gap-2 text-slate-400">
                                <Search className="w-4 h-4" />
                                <Input placeholder="Buscar por email..." className="border-none bg-transparent shadow-none font-bold text-xs w-48 focus-visible:ring-0" />
                            </div>
                            <Button 
                                onClick={handleOpenCreateModal}
                                className="bg-slate-900 rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest px-6 h-12 shadow-lg hover:scale-105 transition-transform duration-300"
                            >
                                <Plus className="w-4 h-4 mr-2 stroke-[3px]" /> Agregar Invitado
                            </Button>
                        </div>
                    </div>

                    <div className="px-10 pb-10">
                        <div className="rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                            <UITable>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100 hover:bg-transparent">
                                        <TableHead className="w-[60px] font-black uppercase text-[9px] tracking-widest text-slate-400 text-center">#</TableHead>
                                        <TableHead className="font-black uppercase text-[9px] tracking-widest text-slate-400">Nombre del Usuario</TableHead>
                                        <TableHead className="font-black uppercase text-[9px] tracking-widest text-slate-400">Email / ID</TableHead>
                                        <TableHead className="font-black uppercase text-[9px] tracking-widest text-slate-400">Password Inicial</TableHead>
                                        <TableHead className="font-black uppercase text-[9px] tracking-widest text-slate-400 text-center">Reservas</TableHead>
                                        <TableHead className="font-black uppercase text-[9px] tracking-widest text-slate-400 text-center">Pedidos</TableHead>
                                        <TableHead className="font-black uppercase text-[9px] tracking-widest text-slate-400 text-center">Control Total</TableHead>
                                        <TableHead className="w-[80px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user, index) => (
                                        <TableRow key={user.id} className="border-slate-100 group transition-colors hover:bg-slate-50/30 h-20">
                                            <TableCell className="text-center font-black text-slate-300 text-xs italic">{index + 1}</TableCell>
                                            <TableCell>
                                                <div className="font-black text-slate-800 text-sm">
                                                    {user.first_name} {user.last_name}
                                                    {isAdmin(user.role) && <Badge className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100 border-none font-black text-[8px] uppercase px-1.5 py-0">ADMIN MASTER</Badge>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-500 text-xs">{user.email || "---"}</TableCell>
                                            <TableCell>
                                                <code className="bg-slate-100 px-2 py-1 rounded text-[10px] font-black tracking-widest text-slate-500">********</code>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Switch
                                                    checked={canViewReservations(user.role)}
                                                    disabled={true}
                                                    className="data-[state=checked]:bg-blue-600 scale-90"
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Switch
                                                    checked={canViewTakeaway(user.role)}
                                                    disabled={true}
                                                    className="data-[state=checked]:bg-emerald-600 scale-90"
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Switch
                                                    checked={isAdmin(user.role)}
                                                    disabled={true}
                                                    className="data-[state=checked]:bg-slate-900 scale-90"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="outline" 
                                                    onClick={() => handleOpenEditModal(user)}
                                                    className="rounded-xl border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 font-black uppercase text-[9px] tracking-widest h-9 px-4 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-sm"
                                                >
                                                    <Pencil className="w-3 h-3 mr-2" />
                                                    Editar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {/* Slot placeholders if users < limit */}
                                    {Array.from({ length: Math.max(0, planInfo.usersContracted - users.length) }).map((_, i) => (
                                        <TableRow key={`empty-${i}`} className="border-slate-100 h-20">
                                            <TableCell className="text-center font-black text-slate-200 text-xs italic">{users.length + i + 1}</TableCell>
                                            <TableCell><span className="text-slate-300 italic text-xs font-bold uppercase tracking-tight">Slot Disponible</span></TableCell>
                                            <TableCell>---</TableCell>
                                            <TableCell>---</TableCell>
                                            <TableCell className="text-center"><Switch disabled={true} className="scale-90" /></TableCell>
                                            <TableCell className="text-center"><Switch disabled={true} className="scale-90" /></TableCell>
                                            <TableCell className="text-center"><Switch disabled={true} className="scale-90" /></TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </UITable>
                        </div>
                    </div>
                </Card>

                {/* Payments Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <Card className="rounded-[3rem] p-10 shadow-xl border-none bg-white space-y-8">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
                                <CreditCard className="w-6 h-6 text-slate-400" />
                                Historial de Pagos
                            </h3>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest italic">Facturación mensual via Stripe/SaaS</p>
                        </div>

                        <div className="space-y-4">
                            {payments.map((payment) => (
                                <div key={payment.id} className="group h-20 bg-slate-50/50 hover:bg-slate-50 rounded-[1.5rem] border border-slate-100 p-6 flex justify-between items-center transition-all duration-300">
                                    <div className="flex items-center gap-6">
                                        <div className="bg-white p-3 rounded-2xl shadow-sm">
                                            <FileText className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-800 text-sm tracking-tight">{payment.plan_name}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">{new Date(payment.created_at).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <div className="font-black text-slate-900">${payment.amount.toLocaleString()}</div>
                                            <div className="flex items-center gap-1 justify-end">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">{payment.status}</span>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="icon" className="rounded-xl border-slate-200 hover:bg-white hover:border-slate-300 group-hover:scale-105 transition-all">
                                            <ExternalLink className="w-4 h-4 text-slate-400" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="rounded-[3rem] p-12 shadow-xl border-none bg-slate-900 text-white relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 p-12 opacity-10">
                            <Shield className="w-40 h-40" />
                        </div>

                        <div className="space-y-8 relative z-10">
                            <div className="space-y-4">
                                <Badge className="bg-blue-600 text-white border-none font-black text-[9px] px-3 py-1">CENTRO DE AYUDA</Badge>
                                <h3 className="text-3xl font-black tracking-tight leading-tight">¿Necesitas soporte con tu suscripción?</h3>
                                <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-sm">
                                    Si tienes problemas con la cantidad de slots, cargos inesperados o necesitas delegar la administración principal a otro usuario, contacta con nuestro equipo.
                                </p>
                            </div>

                            <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 rounded-[1.5rem] font-black uppercase text-xs tracking-widest py-8 shadow-2xl">
                                Contactar Soporte Almuerzo.cl
                            </Button>
                        </div>

                        <div className="pt-8 flex items-center justify-between relative z-10 border-t border-slate-800">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-800 rounded-lg">
                                    <Shield className="w-4 h-4 text-emerald-500" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Certificación PCI-DSS Activa</span>
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">v5.0.1 Stable</div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* User Management Modal */}
            <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
                <DialogContent className="max-w-md rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
                    <DialogHeader className="p-10 pb-6 bg-slate-50/50">
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-800">
                            {editingUser ? "Actualizar Usuario" : "Nuevo Acceso"}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2 leading-relaxed">
                            {editingUser 
                                ? "Modifica los datos del usuario seleccionado. Los cambios se sincronizarán con el backend." 
                                : "Crea una nueva cuenta de acceso. Al confirmar, el usuario será exportado automáticamente al backend de administración."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveUser} className="p-10 pt-4 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre</label>
                                <Input 
                                    required
                                    value={userData.first_name}
                                    onChange={(e) => setUserData({ ...userData, first_name: e.target.value })}
                                    className="rounded-2xl border-slate-100 bg-slate-50/50 h-12 font-bold text-xs focus-visible:ring-blue-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Apellido</label>
                                <Input 
                                    required
                                    value={userData.last_name}
                                    onChange={(e) => setUserData({ ...userData, last_name: e.target.value })}
                                    className="rounded-2xl border-slate-100 bg-slate-50/50 h-12 font-bold text-xs focus-visible:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">E-mail</label>
                            <Input 
                                type="email"
                                required
                                disabled={!!editingUser}
                                value={userData.email}
                                onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                                className="rounded-2xl border-slate-100 bg-slate-50/50 h-12 font-bold text-xs focus-visible:ring-blue-500 disabled:opacity-50"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                                {editingUser ? "Nueva Contraseña (Opcional)" : "Contraseña Inicial"}
                            </label>
                            <Input 
                                type="text"
                                required={!editingUser}
                                minLength={6}
                                value={userData.password}
                                onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                                className="rounded-2xl border-slate-100 bg-slate-50/50 h-12 font-bold text-xs focus-visible:ring-blue-500"
                                placeholder={editingUser ? "Dejar vacío para no cambiar" : "Mín. 6 caracteres"}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Rol de Acceso</label>
                            <select 
                                className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 h-12 font-bold text-xs px-4 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                value={userData.role}
                                onChange={(e) => setUserData({ ...userData, role: e.target.value })}
                            >
                                <option value="USER">OPERATIVO (SOLO LECTURA)</option>
                                <option value="RESTAURANT_ADMIN">ADMINISTRADOR LOCAL</option>
                            </select>
                        </div>

                        <DialogFooter className="pt-6 flex gap-3 sm:justify-between">
                            <Button 
                                type="button" 
                                variant="ghost"
                                onClick={() => setIsUserModalOpen(false)}
                                className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest h-12 border border-slate-100"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit"
                                disabled={submitting}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest h-12 shadow-lg shadow-blue-200"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingUser ? "Guardar Cambios" : "Confirmar y Exportar")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
