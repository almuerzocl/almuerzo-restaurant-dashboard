"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Loader2, UserCheck, ChevronRight, ChevronLeft, AlertCircle, CheckCircle2, Mail, Gift } from "lucide-react";
import { createManualReservationAction, searchProfileByEmailAction, checkAdvancedAvailabilityAction } from "@/app/actions/dashboard-actions";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ManualReservationDialogProps {
    restaurantId: string;
}

type WizardStep = "availability" | "customer_data";

export default function ManualReservationDialog({ restaurantId }: ManualReservationDialogProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<WizardStep>("availability");
    const [loading, setLoading] = useState(false);

    // Step 1: Availability states
    const [partySize, setPartySize] = useState(2);
    const [dateTime, setDateTime] = useState("");
    const [availabilityStatus, setAvailabilityStatus] = useState<{
        checked: boolean;
        available: boolean;
        remaining: number;
    }>({ checked: false, available: false, remaining: 0 });

    // Step 2: Customer data states
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [status, setStatus] = useState("CONFIRMADA");
    const [specialRequests, setSpecialRequests] = useState("");
    const [existingProfile, setExistingProfile] = useState<any>(null);
    const [searchingProfile, setSearchingProfile] = useState(false);

    // Reset wizard when dialog closes
    useEffect(() => {
        if (!open) {
            setStep("availability");
            setAvailabilityStatus({ checked: false, available: false, remaining: 0 });
        }
    }, [open]);

    // Availability Check Logic
    const handleCheckAvailability = async () => {
        if (!restaurantId || !dateTime) {
            toast.error("Por favor selecciona fecha y hora");
            return;
        }
        setLoading(true);
        const result = await checkAdvancedAvailabilityAction(restaurantId, new Date(dateTime).toISOString(), partySize);
        if (result.success) {
            setAvailabilityStatus({
                checked: true,
                available: result.data.isAvailable,
                remaining: result.data.remainingCapacity
            });
            if (result.data.isAvailable) {
                toast.success("Cupo disponible");
            } else {
                toast.warning("Capacidad excedida nominalmente");
            }
        }
        setLoading(false);
    };

    // Auto-search user by email during Step 2
    useEffect(() => {
        const identifier = setTimeout(async () => {
            if (customerEmail && customerEmail.includes("@") && customerEmail.length > 5) {
                setSearchingProfile(true);
                const result = await searchProfileByEmailAction(customerEmail);
                if (result.success && result.profile) {
                    setExistingProfile(result.profile);
                    if (!customerName) {
                        const fullName = `${result.profile.first_name || ""} ${result.profile.last_name || ""}`.trim();
                        setCustomerName(fullName || result.profile.display_name || "");
                    }
                    if (!customerPhone) {
                        setCustomerPhone(result.profile.phone || result.profile.phone_number || "");
                    }
                } else {
                    setExistingProfile(null);
                }
                setSearchingProfile(false);
            } else {
                setExistingProfile(null);
            }
        }, 800);
        return () => clearTimeout(identifier);
    }, [customerEmail]);

    const handleFinalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const result = await createManualReservationAction({
            restaurantId,
            dateTime: new Date(dateTime).toISOString(),
            partySize,
            customerName,
            customerPhone,
            customerEmail,
            specialRequests,
            status,
            userId: existingProfile?.id
        });

        if (result.success) {
            toast.success(existingProfile ? "Reserva creada" : "Reserva creada e invitación enviada");
            setOpen(false);
            // Full Reset
            setCustomerName("");
            setCustomerPhone("");
            setCustomerEmail("");
            setPartySize(2);
            setDateTime("");
            setSpecialRequests("");
            setAvailabilityStatus({ checked: false, available: false, remaining: 0 });
        } else {
            toast.error("Error al crear reserva: " + result.error);
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="font-bold shadow-lg shadow-primary/20">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Reserva Manual
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`h-1.5 flex-1 rounded-full ${step === 'availability' ? 'bg-primary' : 'bg-primary/20'}`} />
                        <div className={`h-1.5 flex-1 rounded-full ${step === 'customer_data' ? 'bg-primary' : 'bg-primary/20'}`} />
                    </div>
                    <DialogTitle className="font-black text-2xl tracking-tight">
                        {step === "availability" ? "1. Disponibilidad" : "2. Registro Maestro"}
                    </DialogTitle>
                </DialogHeader>

                {step === "availability" && (
                    <div className="space-y-4 py-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="datetime" className="text-right font-bold text-xs uppercase">Fecha/Hora</Label>
                            <Input
                                id="datetime"
                                type="datetime-local"
                                className="col-span-3 rounded-xl h-12"
                                value={dateTime}
                                onChange={(e) => {
                                    setDateTime(e.target.value);
                                    setAvailabilityStatus({ ...availabilityStatus, checked: false });
                                }}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="size" className="text-right font-bold text-xs uppercase">Personas</Label>
                            <Input
                                id="size"
                                type="number"
                                className="col-span-3 rounded-xl h-12"
                                value={partySize}
                                onChange={(e) => {
                                    setPartySize(parseInt(e.target.value));
                                    setAvailabilityStatus({ ...availabilityStatus, checked: false });
                                }}
                            />
                        </div>

                        {availabilityStatus.checked && (
                            <Alert variant={availabilityStatus.available ? "default" : "destructive"} className={`rounded-2xl border-2 ${availabilityStatus.available ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                                {availabilityStatus.available ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5" />}
                                <AlertTitle className="font-black uppercase text-xs tracking-widest mt-1">
                                    {availabilityStatus.available ? "Espacio Confirmado" : "Capacidad al Límite"}
                                </AlertTitle>
                                <AlertDescription className="text-sm font-medium opacity-90">
                                    {availabilityStatus.available
                                        ? `Excelente. Quedan ${availabilityStatus.remaining} sillas para este horario.`
                                        : `Atención: Faltan ${Math.abs(availabilityStatus.remaining)} sillas. ¿Deseas sobre-reservar?`}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="flex gap-2 pt-4">
                            {!availabilityStatus.checked ? (
                                <Button onClick={handleCheckAvailability} disabled={loading || !dateTime} className="w-full font-bold rounded-xl h-12" variant="outline">
                                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Consultar disponibilidad
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => setStep("customer_data")}
                                    className="w-full font-black rounded-xl h-12 shadow-lg shadow-primary/20"
                                >
                                    Tomar Datos del Cliente <ChevronRight className="w-5 h-5 ml-2" />
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {step === "customer_data" && (
                    <form onSubmit={handleFinalSubmit} className="space-y-4 py-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="email" className="text-right font-bold text-xs uppercase mt-3 text-muted-foreground">E-mail</Label>
                                <div className="col-span-3 space-y-3">
                                    <div className="relative">
                                        <Input
                                            id="email"
                                            type="email"
                                            className="rounded-xl pr-10 h-11 border-2"
                                            placeholder="cliente@ejemplo.com"
                                            value={customerEmail}
                                            onChange={(e) => setCustomerEmail(e.target.value)}
                                            required
                                        />
                                        {searchingProfile && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
                                    </div>

                                    {/* INDICADOR DE REPUTACIÓN PROMINENTE */}
                                    {existingProfile ? (
                                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-2xl text-white shadow-xl shadow-emerald-500/20 animate-in zoom-in-95 duration-200">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-black uppercase tracking-wider">
                                                    {existingProfile.account_type === 'elite' ? '👑 Miembro Elite' : 'Cliente Almuerzo.cl'}
                                                </div>
                                                <div className="text-[10px] font-bold opacity-80 uppercase italic">Snap Reputation: 100% (Manual)</div>
                                            </div>
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <div className="text-xs opacity-80 font-bold uppercase tracking-tight">Reputación Real</div>
                                                    <div className="text-4xl font-black leading-none">
                                                        {existingProfile.account_type === 'elite' ? '100' : existingProfile.reservation_reputation}%
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs opacity-80 font-bold uppercase tracking-tight">Historial</div>
                                                    <div className="text-xl font-black leading-none">{existingProfile.total_reservations || 0}</div>
                                                    <div className="text-[10px] font-bold opacity-70 uppercase tracking-tighter">Reservas</div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : customerEmail.includes("@") && !searchingProfile && (
                                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300">
                                            <div className="bg-blue-100 p-3 rounded-full">
                                                <Mail className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Nuevo Lead</div>
                                                <p className="text-xs text-slate-600 font-medium leading-tight mt-0.5">
                                                    Este correo no está en Almuerzo.cl. Se enviará una <strong>invitación del restaurante</strong> + el ticket.
                                                </p>
                                            </div>
                                            <Gift className="h-4 w-4 text-emerald-500 animate-bounce" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right font-bold text-xs uppercase text-muted-foreground">Nombre</Label>
                                <Input id="name" className="col-span-3 rounded-xl h-11" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="phone" className="text-right font-bold text-xs uppercase text-muted-foreground">Teléfono</Label>
                                <Input id="phone" className="col-span-3 rounded-xl h-11" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-right font-bold text-xs uppercase text-muted-foreground">Estado</Label>
                                <div className="col-span-3">
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger className="rounded-xl h-11 font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CONFIRMADA">✅ Confirmada</SelectItem>
                                            <SelectItem value="CHECK-IN CLIENTE">🛋️ Walk-in (Sienta ahora)</SelectItem>
                                            <SelectItem value="PENDIENTE">⏳ Pendiente Pago</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="notes" className="text-right font-bold text-xs uppercase text-muted-foreground">Notas</Label>
                                <Input id="notes" className="col-span-3 rounded-xl h-11" value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="Preferencias de mesa..." />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-6">
                            <Button type="button" variant="ghost" onClick={() => setStep("availability")} className="rounded-xl h-12 font-bold">
                                <ChevronLeft className="w-5 h-5 mr-1" />
                            </Button>
                            <Button disabled={loading} type="submit" className="flex-1 font-black rounded-xl h-12 shadow-xl shadow-primary/25">
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Confirmar y Enviar Comprobante
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
