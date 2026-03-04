"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UtensilsCrossed, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            toast.error(error.message);
            setLoading(false);
            return;
        }

        toast.success("Bienvenido de vuelta");
        router.push("/dashboard/reservations"); // Re-evaluation occurs in AuthContext logic
        setLoading(false);
    };

    return (
        <div className="flex h-screen items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-sm space-y-8 bg-white p-8 rounded-3xl shadow-xl shadow-slate-200">
                <div className="flex flex-col items-center">
                    <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                        <UtensilsCrossed className="text-primary h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-center">Acceso a Staff</h2>
                    <p className="text-sm text-muted-foreground mt-2">Ingresa tus credenciales del local</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                className="rounded-xl h-12"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                className="rounded-xl h-12"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <Button
                        disabled={loading}
                        type="submit"
                        className="w-full h-12 font-bold rounded-xl shadow-lg shadow-primary/20"
                    >
                        {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                        Iniciar Sesión
                    </Button>

                    <p className="text-[10px] text-center text-muted-foreground mt-2 font-bold uppercase tracking-widest">
                        Restaurant Dashboard V6
                    </p>
                </form>
            </div>
        </div>
    );
}
