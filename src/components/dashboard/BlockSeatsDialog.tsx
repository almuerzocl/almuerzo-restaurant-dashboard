"use client";

import { useState } from "react";
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
import { Ban, Loader2 } from "lucide-react";
import { blockSeatsAction } from "@/app/actions/dashboard-actions";
import { toast } from "sonner";

interface BlockSeatsDialogProps {
    restaurantId: string;
}

export default function BlockSeatsDialog({ restaurantId }: BlockSeatsDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [seats, setSeats] = useState(4);
    const [reason, setReason] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    const handleBlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const result = await blockSeatsAction(
            restaurantId,
            new Date(startTime).toISOString(),
            new Date(endTime).toISOString(),
            seats,
            reason
        );

        if (result.success) {
            toast.success("Mesas bloqueadas correctamente");
            setOpen(false);
        } else {
            toast.error("Error al bloquear mesas: " + result.error);
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="font-bold border-red-500/20 text-red-600 hover:bg-red-50">
                    <Ban className="w-4 h-4 mr-2" /> Bloquear Mesas
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleBlock}>
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl">Bloquear Capacidad</DialogTitle>
                        <DialogDescription>
                            Esto reducirá la disponibilidad para nuevas reservas en el PWA durante el rango seleccionado.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="seats" className="text-right font-bold text-xs uppercase">
                                Sillas
                            </Label>
                            <Input
                                id="seats"
                                type="number"
                                className="col-span-3 rounded-xl"
                                value={seats}
                                onChange={(e) => setSeats(parseInt(e.target.value))}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="start" className="text-right font-bold text-xs uppercase">
                                Inicio
                            </Label>
                            <Input
                                id="start"
                                type="datetime-local"
                                className="col-span-3 rounded-xl"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="end" className="text-right font-bold text-xs uppercase">
                                Fin
                            </Label>
                            <Input
                                id="end"
                                type="datetime-local"
                                className="col-span-3 rounded-xl"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reason" className="text-right font-bold text-xs uppercase">
                                Motivo
                            </Label>
                            <Input
                                id="reason"
                                className="col-span-3 rounded-xl"
                                placeholder="Ej: Evento privado"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button disabled={loading} type="submit" className="font-bold rounded-xl shadow-lg shadow-primary/20 bg-red-600 hover:bg-red-700">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirmar Bloqueo
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
